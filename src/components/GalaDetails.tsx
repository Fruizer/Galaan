import { useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowUpRight, Check, Clock3, ExternalLink, Link2, MapPin, PenLine, Plus, Trash2, UsersRound, X } from 'lucide-react'
import type { Expense, Gala, GalaRecap, Member, RSVPStatus } from '../types'

interface GalaDetailsProps {
  gala: Gala
  members: Member[]
  isPast: boolean
  onSign: () => void
  onSetRsvp: (status: RSVPStatus) => void
  onTogglePaid: (expenseId: string, memberId: string) => void
  onAddExpense: () => void
  onEditExpense: (expense: Expense) => void
  onDeleteExpense: (expenseId: string) => void
  onSaveRecap: (recap: GalaRecap) => void
  onEdit: () => void
  onDelete: () => void
  onClose: () => void
}

function formatLongDate(date: string) {
  return new Intl.DateTimeFormat('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(`${date}T12:00:00`))
}

function peso(amount: number) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(amount)
}

function safeExternalUrl(value: string) {
  try {
    const url = new URL(value.trim())
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null
  } catch {
    return null
  }
}

export function GalaDetails({ gala, members, isPast, onSign, onSetRsvp, onTogglePaid, onAddExpense, onEditExpense, onDeleteExpense, onSaveRecap, onEdit, onDelete, onClose }: GalaDetailsProps) {
  const reduceMotion = useReducedMotion()
  const [recapNote, setRecapNote] = useState(gala.recap?.note ?? '')
  const [albumLabel, setAlbumLabel] = useState('')
  const [albumUrl, setAlbumUrl] = useState('')
  const [recapError, setRecapError] = useState('')
  const going = gala.rsvps.filter((rsvp) => rsvp.status === 'going')
  const quorumMet = going.length >= gala.quorum
  const ownRsvp = gala.rsvps.find((rsvp) => rsvp.memberId === 'you')
  const total = gala.expenses.reduce((sum, expense) => sum + expense.amount, 0)
  const perHead = going.length > 0 ? total / going.length : 0
  const splitLabel = useMemo(() => peso(perHead), [perHead])
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(gala.address)}`
  const wazeUrl = `https://waze.com/ul?q=${encodeURIComponent(gala.address)}&navigate=yes`

  function saveRecapNote() {
    onSaveRecap({ note: recapNote.trim(), albums: gala.recap?.albums ?? [] })
    setRecapError('')
  }

  function addAlbum(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const safeUrl = safeExternalUrl(albumUrl)
    if (!albumLabel.trim()) return setRecapError('Add a name for the album link.')
    if (!safeUrl) return setRecapError('Use a full http or https album link.')
    onSaveRecap({ note: recapNote.trim(), albums: [...(gala.recap?.albums ?? []), { id: crypto.randomUUID(), label: albumLabel.trim(), url: safeUrl }] })
    setAlbumLabel('')
    setAlbumUrl('')
    setRecapError('')
  }

  function removeAlbum(albumId: string) {
    onSaveRecap({ note: recapNote.trim(), albums: (gala.recap?.albums ?? []).filter((album) => album.id !== albumId) })
  }

  return <motion.section className={`details-panel${isPast ? ' details-recap' : quorumMet ? ' details-color' : ' details-drawing'}`} aria-labelledby="details-title" initial={{ opacity: 0, y: reduceMotion ? 0 : 15 }} animate={{ opacity: 1, y: 0 }} transition={reduceMotion ? { duration: 0.01 } : { type: 'spring', stiffness: 300, damping: 27, mass: 0.85 }}>
    <div className="details-topline"><span className={`status-pill ${isPast ? 'status-recap' : quorumMet ? 'status-color' : 'status-drawing'}`}><i />{isPast ? 'Recap' : quorumMet ? 'May Kulay Na' : 'Drawing'}</span><div className="details-top-actions"><button className="details-edit-action" type="button" onClick={onEdit}><PenLine size={13} /> Edit</button><button className="icon-button details-delete" type="button" aria-label="Delete gala" onClick={onDelete}><Trash2 size={15} /></button><button className="icon-button details-close" type="button" aria-label="Close gala details" onClick={onClose}><X size={17} /></button></div></div>
    <div className="details-date-label">{formatLongDate(gala.date)}</div><h2 id="details-title">{gala.title}</h2><span className="details-vibe">{gala.vibe}</span>
    {!isPast && <div className="details-commitment">
      <div className="commitment-copy"><UsersRound size={16} /><strong>{going.length} of {gala.quorum} going</strong><span>{quorumMet ? 'The plan has color.' : `${Math.max(0, gala.quorum - going.length)} more to make it happen.`}</span></div>
      <div className="commitment-track"><i style={{ transform: `scaleX(${Math.min(1, going.length / gala.quorum)})` }} /></div>
      <div className="detail-going-list">{gala.rsvps.filter((rsvp) => rsvp.status === 'going').map((rsvp) => {
        const member = members.find((item) => item.id === rsvp.memberId)
        if (!member) return null
        return <span className={`going-person${rsvp.signature ? ' has-signature' : ''}`} key={rsvp.memberId}><i style={{ backgroundColor: member.color }}>{rsvp.signature?.startsWith('data:image/') ? <img src={rsvp.signature} alt="" /> : rsvp.signature ? <PenLine size={10} /> : member.initials.slice(0, 1)}</i>{member.isYou ? 'You' : member.name.split(' ')[0]}</span>
      })}</div>
      <div className="rsvp-choice-group" role="group" aria-label="Your RSVP">
        <button className={`rsvp-choice going-choice${ownRsvp?.status === 'going' ? ' selected' : ''}`} type="button" aria-pressed={ownRsvp?.status === 'going'} onClick={onSign}><PenLine size={14} /><span>Going</span>{ownRsvp?.status === 'going' && <Check size={13} />}</button>
        <button className={`rsvp-choice maybe-choice${ownRsvp?.status === 'maybe' ? ' selected' : ''}`} type="button" aria-pressed={ownRsvp?.status === 'maybe'} onClick={() => onSetRsvp('maybe')}>Maybe</button>
        <button className={`rsvp-choice no-choice${ownRsvp?.status === 'not-going' ? ' selected' : ''}`} type="button" aria-pressed={ownRsvp?.status === 'not-going'} onClick={() => onSetRsvp('not-going')}>Can’t go</button>
      </div>
      <p className="rsvp-hint">Going signs or updates your pirma.</p>
    </div>}
    <div className="detail-section">
      <h3>The plan</h3>
      <div className="plan-detail-row"><Clock3 size={16} /><div><strong>{gala.callTime} call time</strong><span>GC time: {gala.gcTime}</span></div></div>
      <div className="plan-detail-row"><MapPin size={16} /><div><strong>{gala.venue}</strong><span>{gala.address}</span><span className="map-links"><a href={googleMapsUrl} target="_blank" rel="noreferrer">Google Maps <ExternalLink size={11} /></a><a href={wazeUrl} target="_blank" rel="noreferrer">Waze <ExternalLink size={11} /></a></span></div></div>
      {gala.notes && <p className="gala-notes">“{gala.notes}”</p>}
    </div>
    {isPast && <div className="detail-section recap-editor">
      <div className="recap-heading"><div><h3>Proof of life</h3><p>Drop the album and save a little memory.</p></div><span className="recap-spark">✦</span></div>
      <label className="field-label recap-note-label">A note from the day<textarea maxLength={500} value={recapNote} onChange={(event) => setRecapNote(event.target.value)} placeholder="The best moment, funniest quote, or what we should do next…" /></label>
      <button className="secondary-action recap-save" type="button" onClick={saveRecapNote}>Save recap note</button>
      <div className="album-link-list">{(gala.recap?.albums ?? []).map((album) => <div className="album-link-row" key={album.id}><a href={album.url} target="_blank" rel="noreferrer"><Link2 size={14} /><span>{album.label}</span><ExternalLink size={11} /></a><button type="button" aria-label={`Remove ${album.label}`} onClick={() => removeAlbum(album.id)}><Trash2 size={13} /></button></div>)}</div>
      <form className="album-link-form" onSubmit={addAlbum}>
        <label className="field-label">Album name<input maxLength={40} value={albumLabel} onChange={(event) => setAlbumLabel(event.target.value)} placeholder="La Union weekend photos" /></label>
        <label className="field-label">Shared album URL<input type="url" value={albumUrl} onChange={(event) => setAlbumUrl(event.target.value)} placeholder="https://photos.google.com/…" /></label>
        {recapError && <p className="form-error" role="alert">{recapError}</p>}
        <button className="primary-button album-add-button" type="submit"><Plus size={14} /> Add album link</button>
      </form>
    </div>}
    <div className="detail-section ambagan-section">
      <div className="ambagan-heading"><div><h3>Ambagan</h3><span>{gala.expenses.length ? 'Shared expenses' : 'No shared costs added yet'}</span></div><div className="ambagan-total"><strong>{peso(total)}</strong><span>total</span></div></div>
      {gala.expenses.length > 0 && <div className="per-head-banner"><span>Per head right now</span><strong>{splitLabel}</strong><small>{going.length} confirmed {going.length === 1 ? 'person' : 'people'}</small></div>}
      <div className="expense-list">{gala.expenses.map((expense) => {
        const each = going.length > 0 ? expense.amount / going.length : expense.amount
        return <div className="expense-row" key={expense.id}>
          <div className="expense-main"><span className={`expense-icon expense-${expense.category}`}><ArrowUpRight size={14} /></span><div><strong>{expense.label}</strong><span>{peso(expense.amount)} · {peso(each)} each</span></div><div className="expense-row-actions"><button type="button" aria-label={`Edit ${expense.label}`} onClick={() => onEditExpense(expense)}><PenLine size={12} /></button><button type="button" aria-label={`Delete ${expense.label}`} onClick={() => onDeleteExpense(expense.id)}><Trash2 size={12} /></button></div></div>
          <div className="expense-people" aria-label={`Payment status for ${expense.label}`}>{going.map((rsvp) => {
            const member = members.find((item) => item.id === rsvp.memberId)
            if (!member) return null
            const paid = expense.paidMemberIds.includes(member.id)
            return <button key={member.id} className={`paid-person${paid ? ' paid' : ''}`} type="button" title={`${member.isYou ? 'You' : member.name}: ${paid ? 'Paid' : 'Unpaid'}. Toggle status`} aria-label={`Toggle ${member.isYou ? 'your' : `${member.name}’s`} payment status, currently ${paid ? 'paid' : 'unpaid'}`} onClick={() => onTogglePaid(expense.id, member.id)}><i style={{ backgroundColor: member.color }}>{paid ? <Check size={10} /> : member.initials.slice(0, 1)}</i><span>{member.isYou ? 'You' : member.name.split(' ')[0]}</span></button>
          })}</div>
        </div>
      })}</div>
      <button className="add-expense-inline" type="button" onClick={onAddExpense}><Plus size={14} /> Add expense</button>
    </div>
    <div className="details-bottom-note"><span className="bottom-note-line" />Easy plans, good memories.</div>
  </motion.section>
}
