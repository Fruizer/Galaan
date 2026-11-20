import { useState } from 'react'
import { ModalFrame } from './ModalFrame'

interface ConfirmDialogProps {
  title: string
  message: string
  confirmLabel: string
  onConfirm: () => Promise<void>
  onClose: () => void
  transition: object
}

export function ConfirmDialog({ title, message, confirmLabel, onConfirm, onClose, transition }: ConfirmDialogProps) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const dismiss = () => { if (!busy) onClose() }

  async function confirm() {
    if (busy) return
    setBusy(true)
    setError('')
    try { await onConfirm(); setBusy(false); onClose(); return }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save that change. Try again.') }
    setBusy(false)
  }

  return <ModalFrame title={title} onClose={dismiss} transition={transition} className="decision-dialog">
    <p className="decision-message">{message}</p>
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="decision-actions"><button className="clear-button" type="button" disabled={busy} onClick={dismiss}>Cancel</button><button className="decision-danger" type="button" disabled={busy} onClick={() => { void confirm() }}>{busy ? 'Please wait…' : confirmLabel}</button></div>
  </ModalFrame>
}
