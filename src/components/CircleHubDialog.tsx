import { useMemo, useState } from 'react'
import { Check, Copy, Link2, UsersRound } from 'lucide-react'
import { ModalFrame } from './ModalFrame'
import type { Circle } from '../types'

interface CircleHubDialogProps {
  circle: Circle
  onClose: () => void
  transition: object
}

export function CircleHubDialog({ circle, onClose, transition }: CircleHubDialogProps) {
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState(false)
  const organizerId = circle.galas[0]?.createdBy
  const inviteUrl = useMemo(() => `${window.location.origin}/?join=${encodeURIComponent(circle.id)}&code=DEMO-${circle.id.toUpperCase()}`, [circle.id])

  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      setCopyError(false)
      window.setTimeout(() => setCopied(false), 2200)
    } catch {
      setCopyError(true)
    }
  }

  return <ModalFrame title={circle.name} subtitle={`${circle.members.length} friends in this circle`} onClose={onClose} transition={transition} className="circle-hub-dialog">
    <div className="invite-card">
      <div className="invite-card-icon"><Link2 size={17} /></div>
      <div className="invite-card-copy"><strong>Bring the barkada in</strong><span>Share a demo invite link with your circle.</span></div>
      <button className="primary-button invite-copy-button" type="button" onClick={copyInvite}>{copied ? <Check size={15} /> : <Copy size={15} />}{copied ? 'Copied' : 'Copy link'}</button>
    </div>
    <p className="demo-caption">Demo link only · account invites are not connected yet.{copyError ? ' Select the link to copy it manually.' : ''}</p>
    {copyError && <input className="invite-link-fallback" aria-label="Demo invite link" readOnly value={inviteUrl} onFocus={(event) => event.currentTarget.select()} />}
    <div className="circle-members-heading"><span><UsersRound size={15} /> Circle members</span><strong>{circle.members.length}</strong></div>
    <div className="circle-member-list">{circle.members.map((member) => <div className="circle-member-row" key={`${circle.id}-${member.id}`}>
      <i style={{ backgroundColor: member.color }}>{member.initials}</i>
      <span><strong>{member.name}</strong><small>{member.isYou ? 'You' : 'Barkada member'}</small></span>
      {member.id === organizerId && <span className="member-role-badge">Organizer</span>}
    </div>)}</div>
  </ModalFrame>
}
