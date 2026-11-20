import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowDownRight, CalendarDays, CirclePlus, MapPin, PartyPopper, Plus, Sparkles, UserRound, UsersRound } from 'lucide-react'
import { CircleHubDialog } from './components/CircleHubDialog'
import { CircleSwitcher } from './components/CircleSwitcher'
import { CreateGalaDialog } from './components/CreateGalaDialog'
import { ExpenseEditorDialog } from './components/ExpenseEditorDialog'
import { GalaCard } from './components/GalaCard'
import { GalaDetails } from './components/GalaDetails'
import { MonthCalendar } from './components/MonthCalendar'
import { ProfileDialog } from './components/ProfileDialog'
import { SignatureDialog } from './components/SignatureDialog'
import { CURRENT_USER_ID, mockCircles } from './data/mockCircles'
import { useBodyScrollLock } from './hooks/useBodyScrollLock'
import type { Circle, Expense, Gala, GalaRecap, NewGalaInput, RSVP, RSVPStatus } from './types'
import './App.css'

const STORAGE_KEY = 'galaan-demo-v3'
const PROFILE_STORAGE_KEY = 'galaan-profile-v1'
const THEME_STORAGE_KEY = 'galaan-theme-v1'
const INITIAL_MONTH = new Date(2026, 10, 1)

type ThemeMode = 'light' | 'dark'

function initialsFor(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('') || 'Y'
}

function readSavedName() {
  try {
    const value = localStorage.getItem(PROFILE_STORAGE_KEY)
    return value && value.trim() ? value : 'You'
  } catch {
    return 'You'
  }
}

function readSavedTheme(): ThemeMode {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY)
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    // Fall through to the operating system preference.
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function readSavedCircles(): Circle[] {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    if (!value) return mockCircles
    const parsed: unknown = JSON.parse(value)
    return Array.isArray(parsed) && parsed.length ? (parsed as Circle[]) : mockCircles
  } catch {
    return mockCircles
  }
}

function formatMonth(date: Date) {
  return new Intl.DateTimeFormat('en-PH', { month: 'long', year: 'numeric' }).format(date)
}

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function getDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function isUnlocked(gala: Gala) {
  return gala.rsvps.filter((rsvp) => rsvp.status === 'going').length >= gala.quorum
}

function App() {
  const [circles, setCircles] = useState<Circle[]>(readSavedCircles)
  const [activeCircleId, setActiveCircleId] = useState('college')
  const [month, setMonth] = useState(INITIAL_MONTH)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedGalaId, setSelectedGalaId] = useState<string | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isSignatureOpen, setIsSignatureOpen] = useState(false)
  const [isCircleHubOpen, setIsCircleHubOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [displayName, setDisplayName] = useState(readSavedName)
  const [theme, setTheme] = useState<ThemeMode>(readSavedTheme)
  const [editingGalaId, setEditingGalaId] = useState<string | null>(null)
  const [signatureGalaId, setSignatureGalaId] = useState<string | null>(null)
  const [expenseEditor, setExpenseEditor] = useState<{ galaId: string; expense?: Expense } | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | 'drawing' | 'color'>('all')
  const [savedNotice, setSavedNotice] = useState(false)
  const [todayKey] = useState(() => getDateKey(new Date()))
  const reduceMotion = useReducedMotion()

  useBodyScrollLock(Boolean(selectedGalaId), '(max-width: 720px)')

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(circles))
  }, [circles])

  useEffect(() => {
    localStorage.setItem(PROFILE_STORAGE_KEY, displayName)
  }, [displayName])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme)
    } catch {
      // The theme remains usable for this session when storage is unavailable.
    }
    const themeMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    if (themeMeta) themeMeta.content = theme === 'dark' ? '#171b19' : '#f1f1eb'
  }, [theme])

  const activeCircle = circles.find((circle) => circle.id === activeCircleId) ?? circles[0]
  const selectedGala = activeCircle.galas.find((gala) => gala.id === selectedGalaId) ?? null
  const signatureGala = activeCircle.galas.find((gala) => gala.id === signatureGalaId) ?? null
  const currentMonthKey = getMonthKey(month)

  const monthGalas = useMemo(
    () => activeCircle.galas.filter((gala) => gala.date.slice(0, 7) === currentMonthKey).sort((a, b) => a.date.localeCompare(b.date)),
    [activeCircle.galas, currentMonthKey],
  )
  const upcomingMonths = useMemo(() => {
    const months = new Map<string, Gala[]>()
    activeCircle.galas.filter((gala) => gala.date.slice(0, 7) > currentMonthKey).sort((a, b) => a.date.localeCompare(b.date)).forEach((gala) => {
      const key = gala.date.slice(0, 7)
      months.set(key, [...(months.get(key) ?? []), gala])
    })
    return [...months.entries()]
  }, [activeCircle.galas, currentMonthKey])

  const matchesFilter = (gala: Gala) => statusFilter === 'all' || (statusFilter === 'color' ? isUnlocked(gala) : !isUnlocked(gala))
  const visibleMonthGalas = (selectedDate ? monthGalas.filter((gala) => gala.date === selectedDate) : monthGalas).filter(matchesFilter)
  const visibleUpcoming = selectedDate ? [] : upcomingMonths.map(([key, galas]) => [key, galas.filter(matchesFilter)] as [string, Gala[]]).filter(([, galas]) => galas.length > 0)
  const pastGalas = activeCircle.galas.filter((gala) => gala.date < todayKey).sort((a, b) => b.date.localeCompare(a.date))

  function updateActiveCircle(update: (circle: Circle) => Circle) {
    setCircles((current) => current.map((circle) => circle.id === activeCircleId ? update(circle) : circle))
  }

  function commitRsvp(galaId: string, signature: string) {
    updateActiveCircle((circle) => ({ ...circle, galas: circle.galas.map((gala) => {
      if (gala.id !== galaId) return gala
      const nextRsvp: RSVP = { memberId: CURRENT_USER_ID, status: 'going', signature }
      return { ...gala, rsvps: gala.rsvps.some((rsvp) => rsvp.memberId === CURRENT_USER_ID)
        ? gala.rsvps.map((rsvp) => rsvp.memberId === CURRENT_USER_ID ? nextRsvp : rsvp)
        : [...gala.rsvps, nextRsvp] }
    }) }))
    setIsSignatureOpen(false)
    setSignatureGalaId(null)
    setSavedNotice(true)
    window.setTimeout(() => setSavedNotice(false), 2400)
  }

  function setOwnRsvp(galaId: string, status: RSVPStatus) {
    updateActiveCircle((circle) => ({ ...circle, galas: circle.galas.map((gala) => gala.id !== galaId ? gala : {
      ...gala,
      rsvps: gala.rsvps.some((rsvp) => rsvp.memberId === CURRENT_USER_ID)
        ? gala.rsvps.map((rsvp) => rsvp.memberId === CURRENT_USER_ID ? { memberId: CURRENT_USER_ID, status, ...(status === 'going' && rsvp.signature ? { signature: rsvp.signature } : {}) } : rsvp)
        : [...gala.rsvps, { memberId: CURRENT_USER_ID, status }],
    }) }))
  }

  function togglePaid(galaId: string, expenseId: string, memberId: string) {
    updateActiveCircle((circle) => ({ ...circle, galas: circle.galas.map((gala) => gala.id !== galaId ? gala : {
      ...gala, expenses: gala.expenses.map((expense) => expense.id !== expenseId ? expense : {
        ...expense, paidMemberIds: expense.paidMemberIds.includes(memberId)
          ? expense.paidMemberIds.filter((id) => id !== memberId) : [...expense.paidMemberIds, memberId],
      }),
    }) }))
  }

  function saveExpense(galaId: string, expense: Omit<Expense, 'id' | 'paidMemberIds'>, expenseId?: string) {
    updateActiveCircle((circle) => ({ ...circle, galas: circle.galas.map((gala) => gala.id !== galaId ? gala : {
      ...gala,
      expenses: expenseId
        ? gala.expenses.map((item) => item.id === expenseId ? { ...item, ...expense } : item)
        : [...gala.expenses, { ...expense, id: `expense-${crypto.randomUUID()}`, paidMemberIds: [] }],
    }) }))
    setExpenseEditor(null)
  }

  function deleteExpense(galaId: string, expenseId: string) {
    updateActiveCircle((circle) => ({ ...circle, galas: circle.galas.map((gala) => gala.id !== galaId ? gala : {
      ...gala, expenses: gala.expenses.filter((expense) => expense.id !== expenseId),
    }) }))
  }

  function saveRecap(galaId: string, recap: GalaRecap) {
    updateActiveCircle((circle) => ({ ...circle, galas: circle.galas.map((gala) => gala.id === galaId ? { ...gala, recap } : gala) }))
  }

  function saveGala(input: NewGalaInput) {
    if (editingGalaId) {
      updateActiveCircle((circle) => ({ ...circle, galas: circle.galas.map((gala) => gala.id !== editingGalaId ? gala : {
        ...gala,
        ...input,
        expenses: input.expenses.map((draft) => {
          const existing = gala.expenses.find((expense) => expense.label.toLowerCase() === draft.label.toLowerCase() && expense.category === draft.category)
          return existing ? { ...existing, ...draft } : { ...draft, id: `expense-${crypto.randomUUID()}`, paidMemberIds: [] }
        }),
      }) }))
      setIsCreateOpen(false)
      setEditingGalaId(null)
      setMonth(new Date(Number(input.date.slice(0, 4)), Number(input.date.slice(5, 7)) - 1, 1))
      setSelectedDate(input.date)
      return
    }
    const newGala: Gala = {
      ...input,
      id: `gala-${crypto.randomUUID()}`,
      createdBy: CURRENT_USER_ID,
      rsvps: [],
      expenses: input.expenses.map((expense) => ({ ...expense, id: `expense-${crypto.randomUUID()}`, paidMemberIds: [] })),
    }
    updateActiveCircle((circle) => ({ ...circle, galas: [...circle.galas, newGala] }))
    setMonth(new Date(Number(input.date.slice(0, 4)), Number(input.date.slice(5, 7)) - 1, 1))
    setSelectedDate(input.date)
    setIsCreateOpen(false)
    setSelectedGalaId(newGala.id)
  }

  function deleteGala(galaId: string) {
    updateActiveCircle((circle) => ({ ...circle, galas: circle.galas.filter((gala) => gala.id !== galaId) }))
    setSelectedGalaId(null)
  }

  function leaveCircle(circleId: string) {
    if (circles.length <= 1) return
    const circle = circles.find((item) => item.id === circleId)
    if (!circle || !window.confirm(`Leave ${circle.name}? It will disappear from your circle switcher.`)) return
    const remaining = circles.filter((item) => item.id !== circleId)
    setCircles(remaining)
    if (activeCircleId === circleId) {
      setActiveCircleId(remaining[0].id)
      setMonth(INITIAL_MONTH)
      setSelectedDate(null)
      setSelectedGalaId(null)
    }
    setIsCircleHubOpen(false)
  }

  function saveProfileName(name: string) {
    const cleaned = name.trim()
    const initials = initialsFor(cleaned)
    setDisplayName(cleaned)
    setCircles((current) => current.map((circle) => ({
      ...circle,
      members: circle.members.map((member) => member.id === CURRENT_USER_ID ? { ...member, name: cleaned, initials } : member),
    })))
  }

  function resetDemoData() {
    if (!window.confirm('Reset all circles, RSVPs, recaps, expenses, and your profile to the original sample data?')) return
    setCircles(mockCircles)
    setDisplayName('You')
    setActiveCircleId('college')
    setMonth(INITIAL_MONTH)
    setSelectedDate(null)
    setSelectedGalaId(null)
    setStatusFilter('all')
    setIsProfileOpen(false)
  }

  function switchCircle(circleId: string) {
    setActiveCircleId(circleId)
    setSelectedDate(null)
    setSelectedGalaId(null)
    setMonth(INITIAL_MONTH)
    setStatusFilter('all')
  }

  function shiftMonth(amount: number) {
    setMonth((value) => new Date(value.getFullYear(), value.getMonth() + amount, 1))
    setSelectedDate(null)
  }

  function chooseRsvp(status: RSVPStatus) {
    if (!selectedGala) return
    if (status === 'going') {
      setSignatureGalaId(selectedGala.id)
      setIsSignatureOpen(true)
    } else setOwnRsvp(selectedGala.id, status)
  }

  const dialogTransition = reduceMotion ? { duration: 0.01 } : { type: 'spring' as const, duration: 0.42, bounce: 0.12 }

  return (
    <div className="app-shell" style={{ '--circle-color': activeCircle.color } as React.CSSProperties}>
      <header className="topbar">
        <a className="brand-lockup" href="#home" aria-label="Galaan home" onClick={() => setSelectedGalaId(null)}>
          <span className="brand-mark" aria-hidden="true"><span /><span /><span /></span><span>galaan</span>
        </a>
        <div className="topbar-context">
          <CircleSwitcher circles={circles} activeCircle={activeCircle} onSelect={switchCircle} />
          <button className="invite-trigger" type="button" onClick={() => setIsCircleHubOpen(true)}><UsersRound size={14} /><span>Members</span></button>
        </div>
        <button className="profile-trigger" type="button" aria-label="Open profile" onClick={() => setIsProfileOpen(true)}><span>{initialsFor(displayName)}</span><span className="profile-trigger-name">{displayName}</span><UserRound className="profile-trigger-icon" size={14} /></button>
        <button className="top-create-button" type="button" aria-label="Plan a gala" onClick={() => setIsCreateOpen(true)}><Plus size={17} strokeWidth={2.3} /><span>Plan a gala</span></button>
      </header>

      <main id="home" className="dashboard-wrap">
        <div className="welcome-row">
          <div><h1>Make time for your people.</h1><p className="welcome-copy">Good plans deserve more than “G, maybe.”</p></div>
          <div className="circle-count" aria-label={`${activeCircle.members.length} circle members`}><UsersRound size={15} /><span>{activeCircle.members.length} in this circle</span></div>
        </div>

        <div className="dashboard-grid">
          <section className="calendar-column" aria-label="Circle calendar and galas">
            <MonthCalendar month={month} galas={activeCircle.galas} selectedDate={selectedDate} onSelectDate={setSelectedDate} onShiftMonth={shiftMonth} />
            <section className="gala-feed" aria-labelledby="month-feed-title">
              <div className="feed-heading-row"><div><h2 id="month-feed-title">This month’s galas</h2><p>{selectedDate ? `Plans for ${new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric' }).format(new Date(`${selectedDate}T12:00:00`))}` : `${monthGalas.length} ${monthGalas.length === 1 ? 'plan' : 'plans'} on the calendar`}</p></div><div className="feed-heading-actions">{selectedDate && <button className="text-action" type="button" onClick={() => setSelectedDate(null)}>Show all</button>}<button className="mobile-fab" type="button" onClick={() => setIsCreateOpen(true)} aria-label="Plan a gala"><CirclePlus size={18} /><span>Plan a gala</span></button></div></div>
              <div className="feed-filters" role="group" aria-label="Filter galas by quorum status">{([['all', 'All plans'], ['drawing', 'Drawing'], ['color', 'May Kulay Na']] as const).map(([value, label]) => <button key={value} className={`feed-filter${statusFilter === value ? ' active' : ''}`} type="button" aria-pressed={statusFilter === value} onClick={() => setStatusFilter(value)}>{label}</button>)}</div>
              {visibleMonthGalas.length > 0 ? <div className="gala-list">{visibleMonthGalas.map((gala) => <GalaCard key={gala.id} gala={gala} members={activeCircle.members} selected={selectedGalaId === gala.id} onOpen={() => setSelectedGalaId(gala.id)} onSign={() => { setSignatureGalaId(gala.id); setIsSignatureOpen(true) }} />)}</div> : (
                <div className="empty-plans"><CalendarDays size={20} /><div><strong>{selectedDate ? 'No gala on this date yet.' : statusFilter === 'all' ? 'No galas this month yet.' : `No ${statusFilter === 'drawing' ? 'Drawing' : 'May Kulay Na'} plans here.`}</strong><span>{selectedDate ? 'Make the first move and invite the barkada.' : 'Try another filter or start a new plan.'}</span></div><button type="button" className="small-create" onClick={() => setIsCreateOpen(true)}>Plan one</button></div>
              )}
              {visibleUpcoming.length > 0 && <section className="upcoming-section" aria-labelledby="upcoming-title">
                <div className="feed-heading-row upcoming-heading"><div><h2 id="upcoming-title">Upcoming galas</h2><p>The next months are already looking good.</p></div><ArrowDownRight size={19} aria-hidden="true" /></div>
                {visibleUpcoming.map(([monthKey, galas]) => {
                  const [year, monthNumber] = monthKey.split('-').map(Number)
                  const upcomingMonth = new Date(year, monthNumber - 1, 1)
                  return <div className="future-month" key={monthKey}><div className="future-month-label">{formatMonth(upcomingMonth)}</div><div className="gala-list">{galas.map((gala) => <GalaCard key={gala.id} gala={gala} members={activeCircle.members} selected={selectedGalaId === gala.id} onOpen={() => { setSelectedGalaId(gala.id); setMonth(upcomingMonth); setSelectedDate(gala.date) }} onSign={() => { setSignatureGalaId(gala.id); setIsSignatureOpen(true) }} />)}</div></div>
                })}
              </section>}
              {pastGalas.length > 0 && !selectedDate && <section className="past-section" aria-labelledby="past-title"><div className="feed-heading-row"><div><h2 id="past-title">Past galas</h2><p>Good times, kept in one place.</p></div></div><div className="gala-list">{pastGalas.map((gala) => <GalaCard key={gala.id} gala={gala} members={activeCircle.members} selected={selectedGalaId === gala.id} onOpen={() => setSelectedGalaId(gala.id)} onSign={() => setSelectedGalaId(gala.id)} isPast />)}</div></section>}
            </section>
          </section>

          <aside className="detail-column" aria-label="Selected gala details">
            {selectedGala ? <>
              <button className="detail-mobile-scrim" type="button" aria-label="Close gala details" onClick={() => setSelectedGalaId(null)} />
              <GalaDetails key={selectedGala.id} gala={selectedGala} members={activeCircle.members} isPast={selectedGala.date < todayKey} onSign={() => { setSignatureGalaId(selectedGala.id); setIsSignatureOpen(true) }} onSetRsvp={chooseRsvp} onTogglePaid={(expenseId, memberId) => togglePaid(selectedGala.id, expenseId, memberId)} onAddExpense={() => setExpenseEditor({ galaId: selectedGala.id })} onEditExpense={(expense) => setExpenseEditor({ galaId: selectedGala.id, expense })} onDeleteExpense={(expenseId) => { if (window.confirm('Remove this expense from the split?')) deleteExpense(selectedGala.id, expenseId) }} onSaveRecap={(recap) => saveRecap(selectedGala.id, recap)} onEdit={() => { setEditingGalaId(selectedGala.id); setIsCreateOpen(true) }} onDelete={() => { if (window.confirm(`Delete “${selectedGala.title}” from this circle?`)) deleteGala(selectedGala.id) }} onClose={() => setSelectedGalaId(null)} />
            </> : (
              <div className="circle-note-panel"><div className="note-scribble"><Sparkles size={20} /></div><h2>Plans are better together.</h2><p>Pick a date or a gala to see who’s in, where you’re headed, and how much to ambag.</p><div className="note-illustration" aria-hidden="true"><span className="note-stamp"><PartyPopper size={22} /></span><span className="note-line note-line-one" /><span className="note-line note-line-two" /><span className="note-sun" /></div><div className="circle-note-foot"><MapPin size={14} /><span>For your {activeCircle.name.toLowerCase()}</span></div></div>
            )}
            <div className="member-strip"><div className="member-strip-heading"><span>In the circle</span><button type="button" onClick={() => setIsCircleHubOpen(true)}>{activeCircle.members.length} members · View all</button></div><div className="member-avatars" aria-label={activeCircle.members.map((member) => member.name).join(', ')}>{activeCircle.members.slice(0, 7).map((member) => <span className="member-avatar" key={member.id} title={member.name} style={{ backgroundColor: member.color }}>{member.initials}</span>)}{activeCircle.members.length > 7 && <span className="member-avatar more-members">+{activeCircle.members.length - 7}</span>}</div></div>
          </aside>
        </div>
      </main>

      <AnimatePresence>
        {isCreateOpen && <CreateGalaDialog key={editingGalaId ?? 'new-gala'} initial={activeCircle.galas.find((gala) => gala.id === editingGalaId)} onClose={() => { setIsCreateOpen(false); setEditingGalaId(null) }} onCreate={saveGala} transition={dialogTransition} />}
        {isSignatureOpen && signatureGala && <SignatureDialog gala={signatureGala} onClose={() => setIsSignatureOpen(false)} onConfirm={(signature) => commitRsvp(signatureGala.id, signature)} transition={dialogTransition} />}
        {isCircleHubOpen && <CircleHubDialog circle={activeCircle} canLeave={circles.length > 1} onLeave={() => leaveCircle(activeCircle.id)} onClose={() => setIsCircleHubOpen(false)} transition={dialogTransition} />}
        {isProfileOpen && <ProfileDialog displayName={displayName} circles={circles} theme={theme} onThemeChange={setTheme} onSaveName={saveProfileName} onResetDemo={resetDemoData} onClose={() => setIsProfileOpen(false)} transition={dialogTransition} />}
        {expenseEditor && <ExpenseEditorDialog key={`${expenseEditor.galaId}-${expenseEditor.expense?.id ?? 'new'}`} initial={expenseEditor.expense} onClose={() => setExpenseEditor(null)} onSave={(expense) => saveExpense(expenseEditor.galaId, expense, expenseEditor.expense?.id)} transition={dialogTransition} />}
      </AnimatePresence>
      <AnimatePresence>{savedNotice && <motion.div className="saved-toast" role="status" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }} transition={{ duration: 0.18 }}><span className="toast-check">✓</span> Pirma saved. You’re on the list.</motion.div>}</AnimatePresence>
    </div>
  )
}

export default App
