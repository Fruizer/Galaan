import { useState } from 'react'
import { Check, Copy, Link2, UsersRound } from 'lucide-react'
import { ModalFrame } from './ModalFrame'
import type { Circle } from '../types'

interface CircleHubDialogProps {
  circle: Circle
  canLeave: boolean
  onCreateInvite: () => Promise<string>
  onLeave: () => void
  onClose: () => void
  transition: object
}

export function CircleHubDialog({ circle, canLeave, onCreateInvite, onLeave, onClose, transition }: CircleHubDialogProps) {
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState(false)
  const [inviteUrl, setInviteUrl] = useState('')
  const [working, setWorking] = useState(false)

  async function copyInvite() {
    setWorking(true)
    try {
      const freshInvite = await onCreateInvite()
      setInviteUrl(freshInvite)
      await navigator.clipboard.writeText(freshInvite)
      setCopied(true)
      setCopyError(false)
      window.setTimeout(() => setCopied(false), 2200)
    } catch {
      setCopyError(true)
    } finally {
      setWorking(false)
    }
  }

  return <ModalFrame title={circle.name} subtitle={`${circle.members.length} friends in this circle`} onClose={onClose} transition={transition} className="circle-hub-dialog">
    <div className="invite-card">
      <div className="invite-card-icon"><Link2 size={17} /></div>
      <div className="invite-card-copy"><strong>Bring the barkada in</strong><span>Make a private link that expires in 7 days.</span></div>
      <button className="primary-button invite-copy-button" type="button" disabled={working} onClick={copyInvite}>{copied ? <Check size={15} /> : <Copy size={15} />}{working ? 'Making link…' : copied ? 'Copied' : 'Copy link'}</button>
    </div>
    <p className="demo-caption">Friends sign in with Google before joining.{copyError && inviteUrl ? ' Select the link to copy it manually.' : copyError ? ' Could not create the invite. Check your connection and try again.' : ''}</p>
    {copyError && inviteUrl && <input className="invite-link-fallback" aria-label="Circle invite link" readOnly value={inviteUrl} onFocus={(event) => event.currentTarget.select()} />}
    <div className="circle-members-heading"><span><UsersRound size={15} /> Circle members</span><strong>{circle.members.length}</strong></div>
    <div className="circle-member-list">{circle.members.map((member) => <div className="circle-member-row" key={`${circle.id}-${member.id}`}>
      <i style={{ backgroundColor: member.color }}>{member.initials}</i>
      <span><strong>{member.name}</strong><small>{member.isYou ? 'You' : 'Barkada member'}</small></span>
      {member.role === 'organizer' && <span className="member-role-badge">Organizer</span>}
    </div>)}</div>
    <div className="leave-circle-row"><div><strong>Leave this circle</strong><span>{canLeave ? 'You can join again if someone invites you.' : 'Promote another organizer before leaving.'}</span></div><button type="button" disabled={!canLeave} onClick={onLeave}>Leave</button></div>
  </ModalFrame>
}
