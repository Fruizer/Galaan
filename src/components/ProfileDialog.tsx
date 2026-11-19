import { useMemo, useState, type FormEvent } from 'react'
import { CalendarDays, Moon, RotateCcw, Sun, UserRound } from 'lucide-react'
import { ModalFrame } from './ModalFrame'
import type { Circle } from '../types'

interface ProfileDialogProps {
  displayName: string
  circles: Circle[]
  theme: 'light' | 'dark'
  onThemeChange: (theme: 'light' | 'dark') => void
  onSaveName: (name: string) => void
  onResetDemo: () => void
  onClose: () => void
  transition: object
}

function initialsFor(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('') || 'Y'
}

export function ProfileDialog({ displayName, circles, theme, onThemeChange, onSaveName, onResetDemo, onClose, transition }: ProfileDialogProps) {
  const [name, setName] = useState(displayName)
  const [error, setError] = useState('')
  const [today] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  })
  const upcomingRsvps = useMemo(() => circles.flatMap((circle) => circle.galas.flatMap((gala) => {
    if (gala.date < today) return []
    const rsvp = gala.rsvps.find((item) => item.memberId === 'you')
    if (!rsvp) return []
    return [{ circleName: circle.name, galaTitle: gala.title, date: gala.date, status: rsvp.status }]
  })).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 4), [circles, today])

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const cleaned = name.trim()
    if (cleaned.length < 2) return setError('Use at least two characters for your name.')
    onSaveName(cleaned)
    setError('')
  }

  return <ModalFrame title="Your profile" subtitle="A little corner for you in the barkada." onClose={onClose} transition={transition} className="profile-dialog">
    <div className="profile-identity"><span className="profile-avatar">{initialsFor(displayName)}</span><div><strong>{displayName}</strong><span>Galaan demo profile</span></div></div>
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
      <div className="profile-circle-list">{circles.map((circle) => <div className="profile-circle-row" key={circle.id}><i style={{ backgroundColor: circle.color }} /><span>{circle.name}</span><small>{circle.members.length} members</small></div>)}</div>
    </section>
    <section className="profile-summary-section">
      <div className="profile-section-heading"><span><CalendarDays size={14} /> Your upcoming RSVPs</span><strong>{upcomingRsvps.length}</strong></div>
      {upcomingRsvps.length ? <div className="profile-rsvp-list">{upcomingRsvps.map((item) => <div className="profile-rsvp-row" key={`${item.circleName}-${item.galaTitle}`}><span><strong>{item.galaTitle}</strong><small>{item.circleName} · {new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric' }).format(new Date(`${item.date}T12:00:00`))}</small></span><i className={`profile-rsvp-status ${item.status}`}>{item.status === 'not-going' ? 'Can’t go' : item.status}</i></div>)}</div> : <p className="profile-empty-rsvp">You haven’t RSVP’d to an upcoming gala yet.</p>}
    </section>
    <div className="profile-reset-row"><div><strong>Reset the sample circles</strong><span>Clear your demo changes and start fresh.</span></div><button type="button" onClick={onResetDemo}><RotateCcw size={13} /> Reset</button></div>
  </ModalFrame>
}
