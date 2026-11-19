import { useState, type FormEvent } from 'react'
import { ModalFrame } from './ModalFrame'
import type { Expense } from '../types'

type ExpenseDraft = Omit<Expense, 'id' | 'paidMemberIds'>
interface ExpenseEditorDialogProps {
  initial?: Expense
  onSave: (expense: ExpenseDraft) => void
  onClose: () => void
  transition: object
}

export function ExpenseEditorDialog({ initial, onSave, onClose, transition }: ExpenseEditorDialogProps) {
  const [label, setLabel] = useState(initial?.label ?? '')
  const [category, setCategory] = useState<Expense['category']>(initial?.category ?? 'food')
  const [amount, setAmount] = useState(initial?.amount ? String(initial.amount) : '')
  const [error, setError] = useState('')

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const numericAmount = Number(amount)
    if (!label.trim()) return setError('Give this expense a name.')
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) return setError('Enter an amount greater than ₱0.')
    onSave({ label: label.trim(), category, amount: Math.round(numericAmount) })
    onClose()
  }

  return <ModalFrame title={initial ? 'Edit expense' : 'Add to ambagan'} subtitle="Keep the shared costs easy to follow." onClose={onClose} transition={transition} className="expense-editor-dialog">
    <form className="create-form" onSubmit={submit}>
      <label className="field-label">Expense name<input autoFocus maxLength={48} value={label} onChange={(event) => setLabel(event.target.value)} placeholder="e.g. Airbnb deposit" /></label>
      <div className="form-grid two-up">
        <label className="field-label">Category<select value={category} onChange={(event) => setCategory(event.target.value as Expense['category'])}><option value="stay">Stay</option><option value="food">Food & drinks</option><option value="transpo">Transpo</option><option value="other">Other</option></select></label>
        <label className="field-label">Amount<input inputMode="numeric" type="number" min="1" step="1" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="1500" /></label>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="form-bottom"><span>Split updates with confirmed attendees.</span><button className="primary-button" type="submit">Save expense</button></div>
    </form>
  </ModalFrame>
}
