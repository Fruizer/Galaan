import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowDownRight, CalendarDays, CirclePlus, MapPin, PartyPopper, Plus, Sparkles, UsersRound } from 'lucide-react'
import { CircleSwitcher } from './components/CircleSwitcher'
import { CreateGalaDialog } from './components/CreateGalaDialog'
import { GalaCard } from './components/GalaCard'
import { GalaDetails } from './components/GalaDetails'
import { MonthCalendar } from './components/MonthCalendar'
import { SignatureDialog } from './components/SignatureDialog'
import { CURRENT_USER_ID, mockCircles } from './data/mockCircles'
import type { Circle, Gala, NewGalaInput, RSVP } from './types'
import './App.css'

const STORAGE_KEY = 'galaan-demo-v2'
const INITIAL_MONTH = new Date(2026, 10, 1)

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

function App() {
  const [circles, setCircles] = useState<Circle[]>(readSavedCircles)
  const [activeCircleId, setActiveCircleId] = useState('college')
  const [month, setMonth] = useState(INITIAL_MONTH)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedGalaId, setSelectedGalaId] = useState<string | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isSignatureOpen, setIsSignatureOpen] = useState(false)
  const [signatureGalaId, setSignatureGalaId] = useState<string | null>(null)
  const [savedNotice, setSavedNotice] = useState(false)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(circles))
  }, [circles])

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

  const visibleMonthGalas = selectedDate ? monthGalas.filter((gala) => gala.date === selectedDate) : monthGalas
  const visibleUpcoming = selectedDate ? [] : upcomingMonths

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

  function changeOwnRsvp(galaId: string) {
    updateActiveCircle((circle) => ({ ...circle, galas: circle.galas.map((gala) => gala.id !== galaId ? gala : {
      ...gala, rsvps: gala.rsvps.map((rsvp) => rsvp.memberId === CURRENT_USER_ID ? { memberId: CURRENT_USER_ID, status: 'maybe' } : rsvp),
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

  function createGala(input: NewGalaInput) {
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

  function switchCircle(circleId: string) {
    setActiveCircleId(circleId)
    setSelectedDate(null)
    setSelectedGalaId(null)
    setMonth(INITIAL_MONTH)
  }

  function shiftMonth(amount: number) {
    setMonth((value) => new Date(value.getFullYear(), value.getMonth() + amount, 1))
    setSelectedDate(null)
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
          <span className="saved-label"><span className="saved-dot" /> Saved on this device</span>
        </div>
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
              <div className="feed-heading-row"><div><h2 id="month-feed-title">This month’s galas</h2><p>{selectedDate ? `Plans for ${new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric' }).format(new Date(`${selectedDate}T12:00:00`))}` : `${monthGalas.length} ${monthGalas.length === 1 ? 'plan' : 'plans'} on the calendar`}</p></div>{selectedDate && <button className="text-action" type="button" onClick={() => setSelectedDate(null)}>Show all</button>}</div>
              {visibleMonthGalas.length > 0 ? <div className="gala-list">{visibleMonthGalas.map((gala) => <GalaCard key={gala.id} gala={gala} members={activeCircle.members} selected={selectedGalaId === gala.id} onOpen={() => setSelectedGalaId(gala.id)} onSign={() => { setSignatureGalaId(gala.id); setIsSignatureOpen(true) }} onMaybe={() => changeOwnRsvp(gala.id)} />)}</div> : (
                <div className="empty-plans"><CalendarDays size={20} /><div><strong>No gala on this date yet.</strong><span>Make the first move and invite the barkada.</span></div><button type="button" className="small-create" onClick={() => setIsCreateOpen(true)}>Plan one</button></div>
              )}
              {visibleUpcoming.length > 0 && <section className="upcoming-section" aria-labelledby="upcoming-title">
                <div className="feed-heading-row upcoming-heading"><div><h2 id="upcoming-title">Upcoming galas</h2><p>The next months are already looking good.</p></div><ArrowDownRight size={19} aria-hidden="true" /></div>
                {visibleUpcoming.map(([monthKey, galas]) => {
                  const [year, monthNumber] = monthKey.split('-').map(Number)
                  const upcomingMonth = new Date(year, monthNumber - 1, 1)
                  return <div className="future-month" key={monthKey}><div className="future-month-label">{formatMonth(upcomingMonth)}</div><div className="gala-list">{galas.map((gala) => <GalaCard key={gala.id} gala={gala} members={activeCircle.members} selected={selectedGalaId === gala.id} onOpen={() => { setSelectedGalaId(gala.id); setMonth(upcomingMonth); setSelectedDate(gala.date) }} onSign={() => { setSignatureGalaId(gala.id); setIsSignatureOpen(true) }} onMaybe={() => changeOwnRsvp(gala.id)} />)}</div></div>
                })}
              </section>}
            </section>
          </section>

          <aside className="detail-column" aria-label="Selected gala details">
            {selectedGala ? <>
              <button className="detail-mobile-scrim" type="button" aria-label="Close gala details" onClick={() => setSelectedGalaId(null)} />
              <GalaDetails gala={selectedGala} members={activeCircle.members} onSign={() => { setSignatureGalaId(selectedGala.id); setIsSignatureOpen(true) }} onMaybe={() => changeOwnRsvp(selectedGala.id)} onTogglePaid={(expenseId, memberId) => togglePaid(selectedGala.id, expenseId, memberId)} onClose={() => setSelectedGalaId(null)} />
            </> : (
              <div className="circle-note-panel"><div className="note-scribble"><Sparkles size={20} /></div><h2>Plans are better together.</h2><p>Pick a date or a gala to see who’s in, where you’re headed, and how much to ambag.</p><div className="note-illustration" aria-hidden="true"><span className="note-stamp"><PartyPopper size={22} /></span><span className="note-line note-line-one" /><span className="note-line note-line-two" /><span className="note-sun" /></div><div className="circle-note-foot"><MapPin size={14} /><span>For your {activeCircle.name.toLowerCase()}</span></div></div>
            )}
            <div className="member-strip"><div className="member-strip-heading"><span>In the circle</span><span>{activeCircle.members.length} members</span></div><div className="member-avatars" aria-label={activeCircle.members.map((member) => member.name).join(', ')}>{activeCircle.members.slice(0, 7).map((member) => <span className="member-avatar" key={member.id} title={member.name} style={{ backgroundColor: member.color }}>{member.initials}</span>)}{activeCircle.members.length > 7 && <span className="member-avatar more-members">+{activeCircle.members.length - 7}</span>}</div></div>
          </aside>
        </div>
      </main>

      <button className="mobile-fab" type="button" onClick={() => setIsCreateOpen(true)} aria-label="Plan a gala"><CirclePlus size={22} /><span>Plan a gala</span></button>
      <AnimatePresence>{isCreateOpen && <CreateGalaDialog onClose={() => setIsCreateOpen(false)} onCreate={createGala} transition={dialogTransition} />}{isSignatureOpen && signatureGala && <SignatureDialog gala={signatureGala} onClose={() => setIsSignatureOpen(false)} onConfirm={(signature) => commitRsvp(signatureGala.id, signature)} transition={dialogTransition} />}</AnimatePresence>
      <AnimatePresence>{savedNotice && <motion.div className="saved-toast" role="status" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }} transition={{ duration: 0.18 }}><span className="toast-check">✓</span> Pirma saved. You’re on the list.</motion.div>}</AnimatePresence>
    </div>
  )
}

export default App
