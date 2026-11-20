import { useState, type FormEvent } from 'react'
import { UsersRound } from 'lucide-react'
import { ModalFrame } from './ModalFrame'

interface CreateCircleDialogProps {
  onCreate: (name: string) => Promise<void>
  onClose: () => void
  transition: object
}

export function CreateCircleDialog({ onCreate, onClose, transition }: CreateCircleDialogProps) {
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const dismiss = () => { if (!busy) onClose() }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy || name.trim().length < 2) return
    setBusy(true)
    setError('')
    try { await onCreate(name.trim()); setBusy(false); onClose(); return }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not create the circle. Try again.') }
    setBusy(false)
  }

  return <ModalFrame title="Make a new circle" subtitle="A separate space for a different barkada." onClose={dismiss} transition={transition} className="decision-dialog">
    <form onSubmit={(event) => { void submit(event) }}>
      <label className="field-label" htmlFor="new-circle-name">Circle name</label>
      <input id="new-circle-name" className="decision-input" value={name} onChange={(event) => { setName(event.target.value); setError('') }} minLength={2} maxLength={60} placeholder="e.g. Dubai cousins" autoFocus required />
      <p className="decision-hint"><UsersRound size={14} /> You can invite friends once it’s made.</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="decision-actions"><button className="clear-button" type="button" disabled={busy} onClick={dismiss}>Cancel</button><button className="primary-button" type="submit" disabled={busy || name.trim().length < 2}>{busy ? 'Creating…' : 'Create circle'}</button></div>
    </form>
  </ModalFrame>
}
