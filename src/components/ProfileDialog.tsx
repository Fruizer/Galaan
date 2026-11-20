import { useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { CalendarDays, Moon, Pencil, Play, RotateCcw, Sun, UserRound } from 'lucide-react'
import { AvatarContent } from './AvatarContent'
import { ModalFrame } from './ModalFrame'
import type { Circle } from '../types'

interface ProfileDialogProps {
  displayName: string
  currentUserId: string
  avatarUrl?: string
  onChangeAvatar: (file: File) => Promise<void>
  circles: Circle[]
  theme: 'light' | 'dark'
  onThemeChange: (theme: 'light' | 'dark') => void
  onSaveName: (name: string) => void
  onResetDemo: () => void
  onReplayTour: () => void
  email?: string
  onSignOut?: () => void
  onClose: () => void
  transition: object
}

function initialsFor(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('') || 'Y'
}

export function ProfileDialog({ displayName, currentUserId, avatarUrl, onChangeAvatar, circles, theme, onThemeChange, onSaveName, onResetDemo, onReplayTour, email, onSignOut, onClose, transition }: ProfileDialogProps) {
  const [name, setName] = useState(displayName)
  const [error, setError] = useState('')
  const [avatarError, setAvatarError] = useState('')
  const [avatarBusy, setAvatarBusy] = useState(false)
  const avatarInput = useRef<HTMLInputElement>(null)
  const [today] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  })
  const upcomingRsvps = useMemo(() => circles.flatMap((circle) => circle.galas.flatMap((gala) => {
    if (gala.date < today) return []
    const rsvp = gala.rsvps.find((item) => item.memberId === currentUserId)
    if (!rsvp) return []
    return [{ circleName: circle.name, galaTitle: gala.title, date: gala.date, status: rsvp.status }]
  })).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 4), [circles, currentUserId, today])

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const cleaned = name.trim()
    if (cleaned.length < 2) return setError('Use at least two characters for your name.')
    onSaveName(cleaned)
    setError('')
  }

  async function selectAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    if (!file) return
    setAvatarError('')
    setAvatarBusy(true)
    try {
      await onChangeAvatar(file)
    } catch (uploadError) {
      setAvatarError(uploadError instanceof Error ? uploadError.message : 'Could not save that photo. Try again.')
    } finally {
      setAvatarBusy(false)
    }
  }

  return <ModalFrame title="Your profile" subtitle="A little corner for you in the barkada." onClose={onClose} transition={transition} className="profile-dialog">
    <div className="profile-identity"><div className="profile-avatar-wrap"><span className="profile-avatar"><AvatarContent src={avatarUrl} fallback={initialsFor(displayName)} /></span><button className="profile-avatar-edit" type="button" aria-label="Change profile picture" title="Change profile picture" disabled={avatarBusy} onClick={() => avatarInput.current?.click()}><Pencil size={14} /><span>{avatarBusy ? 'Saving' : 'Edit'}</span></button><input ref={avatarInput} className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={(event) => { void selectAvatar(event) }} /></div><div><strong>{displayName}</strong><span>{email ?? 'Galaan demo profile'}</span>{avatarError && <span className="profile-avatar-error" role="alert">{avatarError}</span>}</div></div>
    <form className="profile-name-form" onSubmit={submit}>
      <label className="field-label">Display name<input maxLength={36} value={name} onChange={(event) => { setName(event.target.value); setError('') }} /></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="primary-button" type="submit"><UserRound size={14} /> Save name</button>
    </form>
    <section className="profile-appearance" aria-label="Appearance preference"><div><strong>Appearance</strong><span>Choose the look that feels right.</span></div><div className="theme-switch" role="group" aria-label="Choose appearance">
      <button className={theme === 'light' ? 'active' : ''} type="button" aria-pressed={theme === 'light'} onClick={() => onThemeChange('light')}><Sun size={14} /> Light</button>
      <button className={theme === 'dark' ? 'active' : ''} type="button" aria-pressed={theme === 'dark'} onClick={() => onThemeChange('dark')}><Moon size={14} /> Dark</button>
    </div></section>
    <section className="profile-summary-section">
      <div className="profile-section-heading"><span>Your circles</span><strong>{circles.length}</strong></div>
      <div className="profile-circle-list">{circles.map((circle) => <div className="profile-circle-row" key={circle.id}><i style={{ backgroundColor: circle.color }} /><span>{circle.name}</span><small>{circle.members.length} {circle.members.length === 1 ? 'member' : 'members'}</small></div>)}</div>
    </section>
    <section className="profile-summary-section">
      <div className="profile-section-heading"><span><CalendarDays size={14} /> Your upcoming RSVPs</span><strong>{upcomingRsvps.length}</strong></div>
      {upcomingRsvps.length ? <div className="profile-rsvp-list">{upcomingRsvps.map((item) => <div className="profile-rsvp-row" key={`${item.circleName}-${item.galaTitle}`}><span><strong>{item.galaTitle}</strong><small>{item.circleName} · {new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric' }).format(new Date(`${item.date}T12:00:00`))}</small></span><i className={`profile-rsvp-status ${item.status}`}>{item.status === 'not-going' ? 'Can’t go' : item.status}</i></div>)}</div> : <p className="profile-empty-rsvp">You haven’t RSVP’d to an upcoming gala yet.</p>}
    </section>
    <div className="profile-reset-row profile-tour-row"><div><strong>Need a refresher?</strong><span>Take the quick tour of circles, galas, and ambagan.</span></div><button type="button" onClick={onReplayTour}><Play size={13} /> Play tour</button></div>
    {onSignOut ? <div className="profile-reset-row"><div><strong>Sign out of Galaan</strong><span>Your circles stay saved for next time.</span></div><button type="button" onClick={onSignOut}>Sign out</button></div> : <div className="profile-reset-row"><div><strong>Reset the sample circles</strong><span>Clear your demo changes and start fresh.</span></div><button type="button" onClick={onResetDemo}><RotateCcw size={13} /> Reset</button></div>}
  </ModalFrame>
}
