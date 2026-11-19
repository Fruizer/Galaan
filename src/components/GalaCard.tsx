import { ArrowUpRight, Clock3, MapPin, PenLine, UsersRound } from 'lucide-react'
import type { Gala, Member } from '../types'

interface GalaCardProps {
  gala: Gala
  members: Member[]
  selected: boolean
  onOpen: () => void
  onSign: () => void
  onMaybe: () => void
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat('en-PH', { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date(`${date}T12:00:00`))
}

export function GalaCard({ gala, members, selected, onOpen, onSign, onMaybe }: GalaCardProps) {
  const going = gala.rsvps.filter((rsvp) => rsvp.status === 'going')
  const quorumMet = going.length >= gala.quorum
  const ownRsvp = gala.rsvps.find((rsvp) => rsvp.memberId === 'you')
  const rsvpMembers = going.slice(0, 4).map((rsvp) => ({ rsvp, member: members.find((member) => member.id === rsvp.memberId) })).filter((item) => item.member)
  const signedMembers = going.map((rsvp) => ({ rsvp, member: members.find((member) => member.id === rsvp.memberId) })).filter((item) => item.member && item.rsvp.signature)

  return (
    <article className={`gala-card${quorumMet ? ' has-color' : ' is-drawing'}${selected ? ' is-selected' : ''}`}>
      <button className="gala-card-main" type="button" onClick={onOpen} aria-label={`View details for ${gala.title}`}>
        <span className="gala-date-block"><span>{formatDate(gala.date).split(',')[0]}</span><strong>{new Date(`${gala.date}T12:00:00`).getDate()}</strong></span>
        <span className="gala-card-body">
          <span className="gala-card-topline"><span className="vibe-tag">{gala.vibe}</span><span className={`status-pill ${quorumMet ? 'status-color' : 'status-drawing'}`}><i />{quorumMet ? 'May Kulay Na' : 'Drawing'}</span></span>
          <strong className="gala-title">{gala.title}</strong>
          <span className="gala-meta-row"><span><Clock3 size={13} />{gala.callTime}</span><span><MapPin size={13} />{gala.venue}</span></span>
          {signedMembers.length > 0 && <span className="gala-signature-list" aria-label="Signed RSVPs">
            {signedMembers.slice(0, 3).map(({ member, rsvp }) => <span className="signed-person" key={member!.id}>
              <i>{rsvp.signature?.startsWith('data:image/') ? <img src={rsvp.signature} alt="" /> : <PenLine size={9} />}</i>
              <span>{member!.isYou ? 'You' : member!.name.split(' ')[0]}</span>
            </span>)}
            <span className="signature-label">pirma</span>
          </span>}
        </span>
        <span className="gala-open-icon"><ArrowUpRight size={16} /></span>
      </button>
      <div className="gala-card-footer">
        <div className="rsvp-progress" aria-label={`${going.length} of ${gala.quorum} going`}>
          <div className="mini-avatars">{rsvpMembers.map(({ member, rsvp }) => <span key={member!.id} className="mini-avatar" title={`${member!.name}${rsvp.signature ? ' · signed' : ''}`} style={{ backgroundColor: member!.color }}>{rsvp.signature?.startsWith('data:image/') ? <img src={rsvp.signature} alt="" /> : rsvp.signature ? <PenLine size={10} /> : member!.initials.slice(0, 1)}</span>)}</div>
          <span className="going-count"><UsersRound size={13} /><strong>{going.length}</strong><span>/{gala.quorum} going</span></span>
          <span className="progress-track"><i style={{ transform: `scaleX(${Math.min(1, going.length / gala.quorum)})` }} /></span>
        </div>
        {ownRsvp?.status === 'going' ? <button className="rsvp-action is-going" type="button" onClick={onMaybe} aria-label="Change your RSVP to maybe"><PenLine size={13} /> You’re in</button> : <button className="rsvp-action" type="button" onClick={onSign}><PenLine size={13} /> Pirma to go</button>}
      </div>
    </article>
  )
}
