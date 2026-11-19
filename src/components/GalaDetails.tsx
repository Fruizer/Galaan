import { useMemo } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowUpRight, Check, Clock3, ExternalLink, MapPin, PenLine, UsersRound, X } from 'lucide-react'
import type { Gala, Member } from '../types'

interface GalaDetailsProps {
  gala: Gala
  members: Member[]
  onSign: () => void
  onMaybe: () => void
  onTogglePaid: (expenseId: string, memberId: string) => void
  onClose: () => void
}

function formatLongDate(date: string) {
  return new Intl.DateTimeFormat('en-PH', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date(`${date}T12:00:00`))
}

function peso(amount: number) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(amount)
}

export function GalaDetails({ gala, members, onSign, onMaybe, onTogglePaid, onClose }: GalaDetailsProps) {
  const reduceMotion = useReducedMotion()
  const going = gala.rsvps.filter((rsvp) => rsvp.status === 'going')
  const quorumMet = going.length >= gala.quorum
  const ownRsvp = gala.rsvps.find((rsvp) => rsvp.memberId === 'you')
  const total = gala.expenses.reduce((sum, expense) => sum + expense.amount, 0)
  const perHead = going.length > 0 ? total / going.length : 0
  const splitLabel = useMemo(() => peso(perHead), [perHead])
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(gala.address)}`
  const wazeUrl = `https://waze.com/ul?q=${encodeURIComponent(gala.address)}&navigate=yes`

  return <motion.section className={`details-panel${quorumMet ? ' details-color' : ' details-drawing'}`} aria-labelledby="details-title" initial={{ opacity: 0, y: reduceMotion ? 0 : 15 }} animate={{ opacity: 1, y: 0 }} transition={reduceMotion ? { duration: 0.01 } : { type: 'spring', stiffness: 300, damping: 27, mass: 0.85 }}>
    <div className="details-topline"><span className={`status-pill ${quorumMet ? 'status-color' : 'status-drawing'}`}><i />{quorumMet ? 'May Kulay Na' : 'Drawing'}</span><button className="icon-button details-close" type="button" aria-label="Close gala details" onClick={onClose}><X size={17} /></button></div>
    <div className="details-date-label">{formatLongDate(gala.date)}</div><h2 id="details-title">{gala.title}</h2><span className="details-vibe">{gala.vibe}</span>
    <div className="details-commitment">
      <div className="commitment-copy"><UsersRound size={16} /><strong>{going.length} of {gala.quorum} going</strong><span>{quorumMet ? 'The plan has color.' : `${Math.max(0, gala.quorum - going.length)} more to make it happen.`}</span></div>
      <div className="commitment-track"><i style={{ transform: `scaleX(${Math.min(1, going.length / gala.quorum)})` }} /></div>
      <div className="detail-going-list">{gala.rsvps.filter((rsvp) => rsvp.status === 'going').map((rsvp) => {
        const member = members.find((item) => item.id === rsvp.memberId)
        if (!member) return null
        return <span className={`going-person${rsvp.signature ? ' has-signature' : ''}`} key={rsvp.memberId}><i style={{ backgroundColor: member.color }}>{rsvp.signature?.startsWith('data:image/') ? <img src={rsvp.signature} alt="" /> : rsvp.signature ? <PenLine size={10} /> : member.initials.slice(0, 1)}</i>{member.isYou ? 'You' : member.name.split(' ')[0]}</span>
      })}</div>
      {ownRsvp?.status === 'going' ? <button className="details-rsvp-button is-going" type="button" onClick={onMaybe}><Check size={15} /> You’re going <span>· change to maybe</span></button> : <button className="details-rsvp-button" type="button" onClick={onSign}><PenLine size={15} /> Sign your pirma</button>}
    </div>
    <div className="detail-section">
      <h3>The plan</h3>
      <div className="plan-detail-row"><Clock3 size={16} /><div><strong>{gala.callTime} call time</strong><span>GC time: {gala.gcTime}</span></div></div>
      <div className="plan-detail-row"><MapPin size={16} /><div><strong>{gala.venue}</strong><span>{gala.address}</span><span className="map-links"><a href={googleMapsUrl} target="_blank" rel="noreferrer">Google Maps <ExternalLink size={11} /></a><a href={wazeUrl} target="_blank" rel="noreferrer">Waze <ExternalLink size={11} /></a></span></div></div>
      {gala.notes && <p className="gala-notes">“{gala.notes}”</p>}
    </div>
    <div className="detail-section ambagan-section">
      <div className="ambagan-heading"><div><h3>Ambagan</h3><span>{gala.expenses.length ? 'Shared expenses' : 'No shared costs added yet'}</span></div><div className="ambagan-total"><strong>{peso(total)}</strong><span>total</span></div></div>
      {gala.expenses.length > 0 && <div className="per-head-banner"><span>Per head right now</span><strong>{splitLabel}</strong><small>{going.length} confirmed {going.length === 1 ? 'person' : 'people'}</small></div>}
      <div className="expense-list">{gala.expenses.map((expense) => {
        const each = going.length > 0 ? expense.amount / going.length : expense.amount
        return <div className="expense-row" key={expense.id}>
          <div className="expense-main"><span className={`expense-icon expense-${expense.category}`}><ArrowUpRight size={14} /></span><div><strong>{expense.label}</strong><span>{peso(expense.amount)} · {peso(each)} each</span></div></div>
          <div className="expense-people" aria-label={`Payment status for ${expense.label}`}>{going.map((rsvp) => {
            const member = members.find((item) => item.id === rsvp.memberId)
            if (!member) return null
            const paid = expense.paidMemberIds.includes(member.id)
            return <button key={member.id} className={`paid-person${paid ? ' paid' : ''}`} type="button" title={`${member.isYou ? 'You' : member.name}: ${paid ? 'Paid' : 'Unpaid'}. Toggle status`} aria-label={`Toggle ${member.isYou ? 'your' : `${member.name}’s`} payment status, currently ${paid ? 'paid' : 'unpaid'}`} onClick={() => onTogglePaid(expense.id, member.id)}><i style={{ backgroundColor: member.color }}>{paid ? <Check size={10} /> : member.initials.slice(0, 1)}</i><span>{member.isYou ? 'You' : member.name.split(' ')[0]}</span></button>
          })}</div>
        </div>
      })}</div>
    </div>
    <div className="details-bottom-note"><span className="bottom-note-line" />Easy plans, good memories.</div>
  </motion.section>
}
