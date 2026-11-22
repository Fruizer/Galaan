import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowDownRight, CalendarDays, CirclePlus, MapPin, PartyPopper, Plus, Sparkles, UserRound, UsersRound } from 'lucide-react'
import { CircleHubDialog } from './components/CircleHubDialog'
import { CircleSwitcher } from './components/CircleSwitcher'
import { AvatarContent } from './components/AvatarContent'
import { ConfirmDialog } from './components/ConfirmDialog'
import { CreateCircleDialog } from './components/CreateCircleDialog'
import { CreateGalaDialog } from './components/CreateGalaDialog'
import { ExpenseEditorDialog } from './components/ExpenseEditorDialog'
import { GalaCard } from './components/GalaCard'
import { GalaDetails } from './components/GalaDetails'
import { MonthCalendar } from './components/MonthCalendar'
import { ProfileDialog } from './components/ProfileDialog'
import { SignatureDialog } from './components/SignatureDialog'
import { TourDialog } from './components/TourDialog'
import { FirstCircleScreen, SignInScreen } from './components/AccountScreens'
import { ProfileSetupScreen } from './components/ProfileSetupScreen'
import { useBodyScrollLock } from './hooks/useBodyScrollLock'
import { createCircle, createCircleInvite, createJoinCode, redeemJoinCode, deleteExpense as deleteExpenseRow, deleteGala as deleteGalaRow, leaveCircle as leaveCircleRow, loadCircles, redeemCircleInvite, saveExpense as saveExpenseRow, saveGala as saveGalaRow, saveRecap as saveRecapRow, setPayment, updateProfile, updateProfileAvatar, upsertRsvp } from './lib/galaanData'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import type { Circle, Expense, Gala, GalaRecap, NewGalaInput, RSVPStatus } from './types'
import type { Session } from '@supabase/supabase-js'
import './App.css'

const PROFILE_STORAGE_KEY = 'galaan-profile-v1'
const THEME_STORAGE_KEY = 'galaan-theme-v1'
const INITIAL_MONTH = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
const EMPTY_CIRCLE: Circle = { id: '', name: '', subtitle: '', color: '#5b7258', members: [], galas: [] }

type ThemeMode = 'light' | 'dark'
type ConfirmAction =
  | { kind: 'leave-circle'; circleId: string; name: string }
  | { kind: 'delete-gala'; galaId: string; name: string }
  | { kind: 'delete-expense'; expenseId: string; name: string }

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
    // Use the app's light default when storage is unavailable.
  }
  return 'light'
}

function captureInviteToken() {
  try {
    const params = new URLSearchParams(window.location.search)
    const tokenFromLink = params.get('invite')
    if (tokenFromLink && /^[0-9a-f]{64}$/.test(tokenFromLink)) {
      sessionStorage.setItem('galaan-pending-invite', tokenFromLink)
      params.delete('invite')
      const nextSearch = params.toString()
      window.history.replaceState(null, '', `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ''}${window.location.hash}`)
    }
    return Boolean(sessionStorage.getItem('galaan-pending-invite'))
  } catch {
    return false
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
  const [circles, setCircles] = useState<Circle[]>([])
  const [activeCircleId, setActiveCircleId] = useState('')
  const [session, setSession] = useState<Session | null>(null)
  const [authLoaded, setAuthLoaded] = useState(false)
  const [dataLoaded, setDataLoaded] = useState(false)
  const [profileReady, setProfileReady] = useState(false)
  const [circleBusy, setCircleBusy] = useState(false)
  const [joiningCircle, setJoiningCircle] = useState(false)
  const [authBusy, setAuthBusy] = useState(false)
  const [authError, setAuthError] = useState('')
  const [dataError, setDataError] = useState('')
  const [invitePending, setInvitePending] = useState(captureInviteToken)
  const [actionError, setActionError] = useState('')
  const [month, setMonth] = useState(INITIAL_MONTH)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedGalaId, setSelectedGalaId] = useState<string | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isSignatureOpen, setIsSignatureOpen] = useState(false)
  const [isCircleHubOpen, setIsCircleHubOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isCreateCircleOpen, setIsCreateCircleOpen] = useState(false)
  const [isTourOpen, setIsTourOpen] = useState(false)
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null)
  const [displayName, setDisplayName] = useState(readSavedName)
  const [theme, setTheme] = useState<ThemeMode>(readSavedTheme)
  const [editingGalaId, setEditingGalaId] = useState<string | null>(null)
  const [signatureGalaId, setSignatureGalaId] = useState<string | null>(null)
  const [expenseEditor, setExpenseEditor] = useState<{ galaId: string; expense?: Expense } | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | 'drawing' | 'color'>('all')
  const [savedNotice, setSavedNotice] = useState(false)
  const [todayKey] = useState(() => getDateKey(new Date()))
  const reduceMotion = useReducedMotion()
  const sessionUserId = session?.user.id
  const sessionName = session?.user.user_metadata.full_name ?? session?.user.user_metadata.name
  const sessionEmail = session?.user.email
  const firstTourPending = session?.user.user_metadata.galaan_tour_pending === true

  useBodyScrollLock(Boolean(selectedGalaId), '(max-width: 720px)')

  useEffect(() => {
    if (!supabase) { setAuthLoaded(true); return }
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) setAuthError(error.message)
      setSession(data.session)
      setAuthLoaded(true)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setAuthLoaded(true)
      setAuthError('')
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const client = supabase
    if (!sessionUserId || !client) { setCircles([]); setProfileReady(false); setDataLoaded(Boolean(authLoaded)); return }
    const currentUserId = sessionUserId
    let cancelled = false
    let refreshTimer: number | undefined
    let refreshNumber = 0
    let lastAvatarRefresh = 0
    let lastVisibleRefresh = Date.now()
    let hasLoadedOnce = false
    setDataLoaded(false)
    setDataError('')
    async function refresh() {
      const request = ++refreshNumber
      try {
        const [nextCircles, profileResult] = await Promise.all([
          loadCircles(client!, currentUserId),
          client!.from('profiles').select('display_name, onboarding_completed').eq('id', currentUserId).maybeSingle(),
        ])
        if (profileResult.error) throw new Error(profileResult.error.message)
        if (cancelled || request !== refreshNumber) return
        setCircles(nextCircles)
        setActiveCircleId((current) => nextCircles.some((circle) => circle.id === current) ? current : nextCircles[0]?.id ?? '')
        const profile = profileResult.data as { display_name?: string; onboarding_completed?: boolean } | null
        setProfileReady(profile?.onboarding_completed === true)
        setDisplayName(profile?.display_name ?? (typeof sessionName === 'string' ? sessionName : sessionEmail?.split('@')[0] ?? 'You'))
        hasLoadedOnce = true
        setDataError('')
        setActionError((current) => current.startsWith('Could not refresh your circles.') ? '' : current)
        setDataLoaded(true)
      } catch (error) {
        if (cancelled || request !== refreshNumber) return
        if (hasLoadedOnce) setActionError('Could not refresh your circles. Your last loaded plans are still here; check your connection and try again shortly.')
        else { setDataError(error instanceof Error ? error.message : 'Could not load your circles.'); setDataLoaded(true) }
      }
    }
    void refresh()
    const channel = client.channel(`galaan-live-${currentUserId}`)
    for (const table of ['circles', 'circle_memberships', 'profiles', 'galas', 'rsvps', 'expenses', 'expense_payments', 'gala_albums']) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => {
        if (refreshTimer) window.clearTimeout(refreshTimer)
        refreshTimer = window.setTimeout(() => { void refresh() }, 180)
      })
    }
    channel.subscribe()
    function refreshOnReturn() {
      const now = Date.now()
      if (document.visibilityState === 'visible' && now - lastVisibleRefresh > 60000) {
        lastVisibleRefresh = now
        void refresh()
      }
    }
    function refreshFailedAvatar() {
      const now = Date.now()
      if (now - lastAvatarRefresh < 15000) return
      lastAvatarRefresh = now
      if (refreshTimer) window.clearTimeout(refreshTimer)
      refreshTimer = window.setTimeout(() => { void refresh() }, 350)
    }
    document.addEventListener('visibilitychange', refreshOnReturn)
    window.addEventListener('galaan:avatar-error', refreshFailedAvatar)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', refreshOnReturn)
      window.removeEventListener('galaan:avatar-error', refreshFailedAvatar)
      if (refreshTimer) window.clearTimeout(refreshTimer)
      void client.removeChannel(channel)
    }
  }, [sessionUserId, sessionName, sessionEmail, authLoaded])

  useEffect(() => {
    if (!sessionUserId || !supabase || !profileReady) return
    const currentUserId = sessionUserId
    const client = supabase
    let cancelled = false
    async function redeemPendingInvite() {
      let token = ''
      try { token = sessionStorage.getItem('galaan-pending-invite') ?? '' } catch { return }
      if (!token) return
      try {
        const circleId = await redeemCircleInvite(client, token)
        try { sessionStorage.removeItem('galaan-pending-invite') } catch { /* ignore */ }
        if (cancelled) return
        setInvitePending(false)
        const loaded = await loadCircles(client, currentUserId)
        if (cancelled) return
        setCircles(loaded)
        setActiveCircleId(circleId)
        setSelectedDate(null); setSelectedGalaId(null); setMonth(INITIAL_MONTH); setStatusFilter('all')
        if (firstTourPending) setIsTourOpen(true)
      } catch (error) {
        try { sessionStorage.removeItem('galaan-pending-invite') } catch { /* ignore */ }
        if (!cancelled) {
          setInvitePending(false)
          setActionError(error instanceof Error ? error.message : 'That invite link could not be used.')
        }
      }
    }
    void redeemPendingInvite()
    return () => { cancelled = true }
  }, [sessionUserId, profileReady, firstTourPending])

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

  const activeCircle = circles.find((circle) => circle.id === activeCircleId) ?? circles[0] ?? EMPTY_CIRCLE
  const currentMember = activeCircle.members.find((member) => member.id === session?.user.id)
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

  async function refreshCircles(preferredId?: string) {
    if (!supabase || !session) return []
    const nextCircles = await loadCircles(supabase, session.user.id)
    setCircles(nextCircles)
    setActiveCircleId((current) => preferredId && nextCircles.some((circle) => circle.id === preferredId)
      ? preferredId
      : nextCircles.some((circle) => circle.id === current) ? current : nextCircles[0]?.id ?? '')
    return nextCircles
  }

  async function mutate(task: () => Promise<unknown>) {
    if (!supabase || !session) return false
    try {
      await task()
      await refreshCircles()
      setActionError('')
      return true
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'That change could not be saved.')
      return false
    }
  }

  async function commitRsvp(galaId: string, signature: string) {
    const saved = await mutate(() => upsertRsvp(supabase!, galaId, session!.user.id, 'going', signature))
    if (!saved) return
    setIsSignatureOpen(false)
    setSignatureGalaId(null)
    setSavedNotice(true)
    window.setTimeout(() => setSavedNotice(false), 2400)
  }

  function setOwnRsvp(galaId: string, status: RSVPStatus) {
    void mutate(() => upsertRsvp(supabase!, galaId, session!.user.id, status))
  }

  function togglePaid(galaId: string, expenseId: string, memberId: string) {
    const gala = activeCircle.galas.find((item) => item.id === galaId)
    if (memberId !== session?.user.id && activeCircle.role !== 'organizer' && gala?.createdBy !== session?.user.id) {
      setActionError('Only this gala’s creator or a circle organizer can update someone else’s payment.')
      return
    }
    const expense = gala?.expenses.find((item) => item.id === expenseId)
    if (!expense || !session) return
    void mutate(() => setPayment(supabase!, expenseId, memberId, !expense.paidMemberIds.includes(memberId)))
  }

  function saveExpense(galaId: string, expense: Omit<Expense, 'id' | 'paidMemberIds'>, expenseId?: string) {
    void mutate(() => saveExpenseRow(supabase!, galaId, session!.user.id, expense, expenseId)).then((saved) => {
      if (saved) setExpenseEditor(null)
    })
  }

  function saveRecap(galaId: string, recap: GalaRecap) {
    void mutate(() => saveRecapRow(supabase!, galaId, session!.user.id, recap))
  }

  function saveGala(input: NewGalaInput) {
    const current = editingGalaId ? activeCircle.galas.find((gala) => gala.id === editingGalaId) : undefined
    void (async () => {
      let galaId = current?.id ?? ''
      const saved = await mutate(async () => { galaId = await saveGalaRow(supabase!, activeCircle.id, session!.user.id, input, current) })
      if (!saved) return
      setMonth(new Date(Number(input.date.slice(0, 4)), Number(input.date.slice(5, 7)) - 1, 1))
      setSelectedDate(input.date)
      if (!current) setSelectedGalaId(galaId)
      setIsCreateOpen(false)
      setEditingGalaId(null)
    })()
  }

  function leaveCircle(circleId: string) {
    const circle = circles.find((item) => item.id === circleId)
    if (circle) setConfirmAction({ kind: 'leave-circle', circleId, name: circle.name })
  }

  async function confirmChange() {
    if (!supabase || !confirmAction) throw new Error('Sign in again to make this change.')
    const action = confirmAction
    if (action.kind === 'leave-circle') await leaveCircleRow(supabase, action.circleId)
    if (action.kind === 'delete-gala') await deleteGalaRow(supabase, action.galaId)
    if (action.kind === 'delete-expense') await deleteExpenseRow(supabase, action.expenseId)
    await refreshCircles()
    setActionError('')
    if (action.kind === 'leave-circle') { setIsCircleHubOpen(false); setSelectedDate(null); setSelectedGalaId(null) }
    if (action.kind === 'delete-gala') setSelectedGalaId(null)
  }

  function saveProfileName(name: string) {
    const cleaned = name.trim()
    if (!session) return
    void mutate(() => updateProfile(supabase!, session.user.id, cleaned)).then((saved) => {
      if (saved) setDisplayName(cleaned)
    })
  }

  async function changeProfileAvatar(file: File) {
    if (!supabase || !session) throw new Error('Sign in again before changing your picture.')
    await updateProfileAvatar(supabase, session.user.id, file)
    await refreshCircles()
  }

  async function completeProfile(name: string, photo?: File) {
    if (!supabase || !session) throw new Error('Sign in again to finish your profile.')
    if (name.trim().length < 2 || name.trim().length > 36) throw new Error('Use a name between 2 and 36 characters.')
    if (photo) await updateProfileAvatar(supabase, session.user.id, photo)
    const { error: tourError } = await supabase.auth.updateUser({ data: { galaan_tour_pending: true } })
    if (tourError) throw new Error(tourError.message)
    const { error } = await supabase.from('profiles').update({ display_name: name.trim(), onboarding_completed: true }).eq('id', session.user.id)
    if (error) throw new Error(error.message)
    setDisplayName(name.trim())
    setProfileReady(true)
  }

  async function createOrJoinCircle(value: string, joining: boolean) {
    if (!supabase || circleBusy) return
    setCircleBusy(true); setActionError('')
    try {
      const id = joining ? await redeemJoinCode(supabase, value) : await createCircle(supabase, value)
      await refreshCircles(id)
      setJoiningCircle(false); setSelectedGalaId(null); setSelectedDate(null)
      setMonth(INITIAL_MONTH); setStatusFilter('all')
      if (circles.length === 0 && session?.user.user_metadata.galaan_tour_pending === true) setIsTourOpen(true)
    } catch (error) { setActionError(error instanceof Error ? error.message : 'Could not open that circle. Try again.') }
    finally { setCircleBusy(false) }
  }

  async function createNewCircle(name: string) {
    if (!supabase || !session) throw new Error('Sign in again to create a circle.')
    const circleId = await createCircle(supabase, name)
    await refreshCircles(circleId)
    setSelectedDate(null); setSelectedGalaId(null); setMonth(INITIAL_MONTH); setStatusFilter('all')
    setActionError('')
  }

  function finishTour(startPlanning: boolean) {
    setIsTourOpen(false)
    if (startPlanning) setIsCreateOpen(true)
    if (supabase && session) void supabase.auth.updateUser({ data: { galaan_tour_pending: false } })
  }

  async function authenticateWithEmail(email: string, password: string, createAccount: boolean) {
    if (!supabase) { setAuthError('Supabase connection settings are missing.'); return }
    setAuthBusy(true)
    setAuthError('')
    const result = createAccount
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password })
    if (result.error) {
      setAuthError(result.error.message)
    } else if (createAccount && !result.data.session) {
      setAuthError('Supabase still requires email confirmation. Turn off Confirm email under Authentication → Sign In / Providers → Email, then try again. A confirmation email may already have been sent.')
    } else if (result.data.session) {
      setSession(result.data.session)
    }
    setAuthBusy(false)
  }

  async function signOut() {
    if (!supabase) return
    const { error } = await supabase.auth.signOut()
    if (error) setActionError(error.message)
    else { setCircles([]); setActiveCircleId(''); setSelectedGalaId(null); setIsProfileOpen(false) }
  }

  async function createInvite() {
    if (!supabase || !activeCircle.id) throw new Error('Choose a circle first.')
    return createCircleInvite(supabase, activeCircle.id)
  }

  function resetDemoData() {}

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

  if (!isSupabaseConfigured) return <SignInScreen loading={false} invitePending={invitePending} error="Galaan’s Supabase settings are missing. Add the project URL and publishable key to the deployment settings." onEmailAuth={() => {}} />
  if (!authLoaded || !dataLoaded || (session && profileReady && invitePending)) return <main className="account-screen"><section className="account-card"><a className="brand-lockup account-brand" href="#home"><span className="brand-mark" aria-hidden="true"><span /><span /><span /></span><span>galaan</span></a><h1>{authLoaded ? 'Getting your circles ready…' : 'Opening your barkada space…'}</h1><p>Loading your private plans and RSVPs.</p></section></main>
  if (!session) return <SignInScreen loading={authBusy} error={authError} invitePending={invitePending} onEmailAuth={(email, password, createAccount) => { void authenticateWithEmail(email, password, createAccount) }} />
  if (dataError) return <main className="account-screen"><section className="account-card"><h1>We couldn’t load your circles.</h1><p>{dataError}</p><button className="primary-button" type="button" onClick={() => window.location.reload()}>Try again</button><button className="account-signout" type="button" onClick={() => { void signOut() }}>Sign out</button></section></main>
  if (!profileReady) return <ProfileSetupScreen displayName={displayName} onSave={completeProfile} onSignOut={() => { void signOut() }} />
  if (circles.length === 0 || joiningCircle) return <><FirstCircleScreen startWithJoin={joiningCircle} loading={circleBusy} error={actionError} onCreate={(name) => { void createOrJoinCircle(name, false) }} onJoin={(code) => { void createOrJoinCircle(code, true) }} onSignOut={() => { void signOut() }} />{circles.length > 0 && <button className="return-to-circle" onClick={() => setJoiningCircle(false)}>Back to my circles</button>}</>


  return (
    <div className="app-shell" style={{ '--circle-color': activeCircle.color } as React.CSSProperties}>
      <header className="topbar">
        <a className="brand-lockup" href="#home" aria-label="Galaan home" onClick={() => setSelectedGalaId(null)}>
          <span className="brand-mark" aria-hidden="true"><span /><span /><span /></span><span>galaan</span>
        </a>
        <div className="topbar-context">
          <CircleSwitcher circles={circles} activeCircle={activeCircle} onSelect={switchCircle} onCreate={() => setIsCreateCircleOpen(true)} onJoin={() => setJoiningCircle(true)} />
          <button className="invite-trigger" type="button" onClick={() => setIsCircleHubOpen(true)}><UsersRound size={14} /><span>Members</span></button>
        </div>
        <button className="profile-trigger" type="button" aria-label="Open profile" onClick={() => setIsProfileOpen(true)}><span className="profile-trigger-avatar"><AvatarContent src={currentMember?.avatarUrl} fallback={initialsFor(displayName)} /></span><span className="profile-trigger-name">{displayName}</span><UserRound className="profile-trigger-icon" size={14} /></button>
        <button className="top-create-button" type="button" aria-label="Plan a gala" onClick={() => setIsCreateOpen(true)}><Plus size={17} strokeWidth={2.3} /><span>Plan a gala</span></button>
      </header>

      {actionError && <div className="action-error-banner" role="alert"><span>{actionError}</span><button type="button" aria-label="Dismiss message" onClick={() => setActionError('')}>×</button></div>}

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
              <GalaDetails key={selectedGala.id} gala={selectedGala} members={activeCircle.members} isPast={selectedGala.date < todayKey} canManage={selectedGala.createdBy === session.user.id} canMarkOthersPaid={activeCircle.role === 'organizer' || selectedGala.createdBy === session.user.id} onSign={() => { setSignatureGalaId(selectedGala.id); setIsSignatureOpen(true) }} onSetRsvp={chooseRsvp} onTogglePaid={(expenseId, memberId) => togglePaid(selectedGala.id, expenseId, memberId)} onAddExpense={() => setExpenseEditor({ galaId: selectedGala.id })} onEditExpense={(expense) => setExpenseEditor({ galaId: selectedGala.id, expense })} onDeleteExpense={(expenseId) => { const expense = selectedGala.expenses.find((item) => item.id === expenseId); if (expense) setConfirmAction({ kind: 'delete-expense', expenseId, name: expense.label }) }} onSaveRecap={(recap) => saveRecap(selectedGala.id, recap)} onEdit={() => { setEditingGalaId(selectedGala.id); setIsCreateOpen(true) }} onDelete={() => setConfirmAction({ kind: 'delete-gala', galaId: selectedGala.id, name: selectedGala.title })} onClose={() => setSelectedGalaId(null)} />
            </> : (
              <div className="circle-note-panel"><div className="note-scribble"><Sparkles size={20} /></div><h2>Plans are better together.</h2><p>Pick a date or a gala to see who’s in, where you’re headed, and how much to ambag.</p><div className="note-illustration" aria-hidden="true"><span className="note-stamp"><PartyPopper size={22} /></span><span className="note-line note-line-one" /><span className="note-line note-line-two" /><span className="note-sun" /></div><div className="circle-note-foot"><MapPin size={14} /><span>For your {activeCircle.name.toLowerCase()}</span></div></div>
            )}
            <div className="member-strip"><div className="member-strip-heading"><span>In the circle</span><button type="button" onClick={() => setIsCircleHubOpen(true)}>{activeCircle.members.length} {activeCircle.members.length === 1 ? 'member' : 'members'} · View all</button></div><div className="member-avatars" aria-label={activeCircle.members.map((member) => member.name).join(', ')}>{activeCircle.members.slice(0, 7).map((member) => <span className="member-avatar" key={member.id} title={member.name} style={{ backgroundColor: member.color }}><AvatarContent src={member.avatarUrl} fallback={member.initials} /></span>)}{activeCircle.members.length > 7 && <span className="member-avatar more-members">+{activeCircle.members.length - 7}</span>}</div></div>
          </aside>
        </div>
      </main>

      <AnimatePresence>
        {isCreateOpen && <CreateGalaDialog key={editingGalaId ?? 'new-gala'} initial={activeCircle.galas.find((gala) => gala.id === editingGalaId)} onClose={() => { setIsCreateOpen(false); setEditingGalaId(null) }} onCreate={saveGala} transition={dialogTransition} />}
        {isCreateCircleOpen && <CreateCircleDialog onCreate={createNewCircle} onClose={() => setIsCreateCircleOpen(false)} transition={dialogTransition} />}
        {isTourOpen && <TourDialog circleName={activeCircle.name} hasGalas={activeCircle.galas.length > 0} onFinish={finishTour} transition={dialogTransition} />}
        {isSignatureOpen && signatureGala && <SignatureDialog gala={signatureGala} onClose={() => setIsSignatureOpen(false)} onConfirm={(signature) => commitRsvp(signatureGala.id, signature)} transition={dialogTransition} />}
        {isCircleHubOpen && <CircleHubDialog circle={activeCircle} canLeave={activeCircle.role !== 'organizer' || activeCircle.members.filter((member) => member.role === 'organizer').length > 1} onCreateCode={() => createJoinCode(supabase!, activeCircle.id)} onCreateInvite={createInvite} onLeave={() => leaveCircle(activeCircle.id)} onClose={() => setIsCircleHubOpen(false)} transition={dialogTransition} />}
        {isProfileOpen && <ProfileDialog displayName={displayName} currentUserId={session.user.id} avatarUrl={activeCircle.members.find((member) => member.id === session.user.id)?.avatarUrl} onChangeAvatar={changeProfileAvatar} circles={circles} theme={theme} onThemeChange={setTheme} onSaveName={saveProfileName} onResetDemo={resetDemoData} email={session.user.email} onReplayTour={() => { setIsProfileOpen(false); setIsTourOpen(true) }} onSignOut={() => { void signOut() }} onClose={() => setIsProfileOpen(false)} transition={dialogTransition} />}
        {expenseEditor && <ExpenseEditorDialog key={`${expenseEditor.galaId}-${expenseEditor.expense?.id ?? 'new'}`} initial={expenseEditor.expense} onClose={() => setExpenseEditor(null)} onSave={(expense) => saveExpense(expenseEditor.galaId, expense, expenseEditor.expense?.id)} transition={dialogTransition} />}
        {confirmAction && <ConfirmDialog key={`${confirmAction.kind}-${confirmAction.kind === 'leave-circle' ? confirmAction.circleId : confirmAction.kind === 'delete-gala' ? confirmAction.galaId : confirmAction.expenseId}`} title={confirmAction.kind === 'leave-circle' ? `Leave ${confirmAction.name}?` : confirmAction.kind === 'delete-gala' ? `Delete ${confirmAction.name}?` : `Remove ${confirmAction.name}?`} message={confirmAction.kind === 'leave-circle' ? 'This circle will disappear from your switcher. Someone can invite you back later.' : confirmAction.kind === 'delete-gala' ? 'The gala, its RSVPs, expenses, and recap will be removed for everyone in this circle.' : 'This cost and its payment statuses will be removed from the ambagan.'} confirmLabel={confirmAction.kind === 'leave-circle' ? 'Leave circle' : confirmAction.kind === 'delete-gala' ? 'Delete gala' : 'Remove expense'} onConfirm={confirmChange} onClose={() => setConfirmAction(null)} transition={dialogTransition} />}
      </AnimatePresence>
      <AnimatePresence>{savedNotice && <motion.div className="saved-toast" role="status" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }} transition={{ duration: 0.18 }}><span className="toast-check">✓</span> Pirma saved. You’re on the list.</motion.div>}</AnimatePresence>
    </div>
  )
}

export default App
