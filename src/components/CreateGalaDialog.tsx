import { useState, type FormEvent } from 'react'
import { Minus, Plus, Trash2 } from 'lucide-react'
import type { NewGalaInput, VibeTag } from '../types'
import { ModalFrame } from './ModalFrame'

interface CreateGalaDialogProps {
  onClose: () => void
  onCreate: (input: NewGalaInput) => void
  transition: object
}

const vibes: VibeTag[] = ['Food Trip', 'Roadtrip', 'Tambay', 'Beach Day', 'Coffee Run', 'Birthday']
const categories: NewGalaInput['expenses'][number]['category'][] = ['food', 'stay', 'transpo', 'other']
interface ExpenseDraft { label: string; amount: string; category: NewGalaInput['expenses'][number]['category'] }

export function CreateGalaDialog({ onClose, onCreate, transition }: CreateGalaDialogProps) {
  const [title, setTitle] = useState('')
  const [vibe, setVibe] = useState<VibeTag>('Tambay')
  const [date, setDate] = useState('2026-11-29')
  const [callTime, setCallTime] = useState('6:00 PM')
  const [gcTime, setGcTime] = useState('6:30 PM')
  const [venue, setVenue] = useState('')
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [quorum, setQuorum] = useState(4)
  const [expenses, setExpenses] = useState<ExpenseDraft[]>([{ label: '', amount: '', category: 'food' }])
  const [error, setError] = useState('')

  function changeExpense(index: number, field: keyof ExpenseDraft, value: string) {
    setExpenses((current) => current.map((expense, i) => i === index ? { ...expense, [field]: value } : expense))
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!title.trim() || !date || !venue.trim()) {
      setError('Add a title, date, and venue to get this gala on the calendar.')
      return
    }
    const validExpenses = expenses.filter((expense) => expense.label.trim() && Number(expense.amount) > 0).map((expense) => ({ label: expense.label.trim(), amount: Number(expense.amount), category: expense.category }))
    onCreate({ title: title.trim(), vibe, date, callTime, gcTime, venue: venue.trim(), address: address.trim() || venue.trim(), notes: notes.trim(), quorum, expenses: validExpenses })
  }

  return <ModalFrame title="Plan a new gala" subtitle="Get the basics down. The barkada can take it from here." onClose={onClose} transition={transition} className="create-dialog">
    <form className="create-form" onSubmit={submit} noValidate>
      <label className="field-label">What are we doing?<input autoFocus value={title} onChange={(event) => { setTitle(event.target.value); setError('') }} placeholder="e.g. Saturday seafood run" maxLength={80} /></label>
      <fieldset className="vibe-fieldset"><legend className="field-label">Pick the vibe</legend><div className="vibe-options">{vibes.map((option) => <button key={option} type="button" className={`vibe-choice${vibe === option ? ' active' : ''}`} aria-pressed={vibe === option} onClick={() => setVibe(option)}>{option}</button>)}</div></fieldset>
      <div className="form-grid two-up">
        <label className="field-label">Date<input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
        <label className="field-label">Minimum headcount<div className="quorum-stepper"><button type="button" aria-label="Decrease minimum headcount" disabled={quorum <= 2} onClick={() => setQuorum((value) => Math.max(2, value - 1))}><Minus size={14} /></button><strong>{quorum}</strong><button type="button" aria-label="Increase minimum headcount" onClick={() => setQuorum((value) => value + 1)}><Plus size={14} /></button></div></label>
      </div>
      <div className="form-grid two-up"><label className="field-label">Call time<input value={callTime} onChange={(event) => setCallTime(event.target.value)} placeholder="6:00 PM" /></label><label className="field-label">GC time<input value={gcTime} onChange={(event) => setGcTime(event.target.value)} placeholder="6:30 PM" /></label></div>
      <label className="field-label">Where to?<input value={venue} onChange={(event) => setVenue(event.target.value)} placeholder="Place or venue name" maxLength={100} /></label>
      <label className="field-label">Address for map links <span className="optional-label">Optional</span><input value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Street, city, or landmark" maxLength={160} /></label>
      <label className="field-label">Notes <span className="optional-label">Optional</span><textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Bring a jacket, share a ride, ambag for snacks…" maxLength={320} rows={2} /></label>
      <div className="expense-draft-section">
        <div className="expense-draft-heading"><div><strong>Start the ambagan</strong><span>Add shared costs if you know them.</span></div><button type="button" className="add-expense-button" onClick={() => setExpenses((current) => [...current, { label: '', amount: '', category: 'food' }])}><Plus size={14} /> Add item</button></div>
        {expenses.map((expense, index) => <div className="expense-draft-row" key={`draft-${index}`}>
          <input aria-label={`Expense ${index + 1} name`} value={expense.label} onChange={(event) => changeExpense(index, 'label', event.target.value)} placeholder={index === 0 ? 'Food & drinks' : 'Expense name'} maxLength={50} />
          <select aria-label={`Expense ${index + 1} category`} value={expense.category} onChange={(event) => changeExpense(index, 'category', event.target.value)}>{categories.map((category) => <option key={category} value={category}>{category === 'stay' ? 'Stay' : category === 'food' ? 'Food' : category === 'transpo' ? 'Transpo' : 'Other'}</option>)}</select>
          <div className="expense-amount-input"><span>₱</span><input aria-label={`Expense ${index + 1} amount in pesos`} type="number" min="0" max="999999" value={expense.amount} onChange={(event) => changeExpense(index, 'amount', event.target.value)} placeholder="0" /></div>
          {expenses.length > 1 && <button className="remove-expense-button" type="button" aria-label="Remove expense" onClick={() => setExpenses((current) => current.filter((_, i) => i !== index))}><Trash2 size={14} /></button>}
        </div>)}
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="form-bottom"><span>New galas start as <strong>Drawing</strong>.</span><button className="primary-button" type="submit">Add to the calendar</button></div>
    </form>
  </ModalFrame>
}
