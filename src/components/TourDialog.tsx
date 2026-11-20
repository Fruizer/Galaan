import { useState } from 'react'
import { CalendarDays, Check, ChevronLeft, ChevronRight, PenLine, UsersRound } from 'lucide-react'
import { ModalFrame } from './ModalFrame'

interface TourDialogProps {
  circleName: string
  hasGalas: boolean
  onFinish: (startPlanning: boolean) => void
  transition: object
}

const steps = [
  { title: 'Your plans live with your people.', description: 'Each circle has its own calendar and members. Switch circles at the top whenever you’re planning with a different barkada.' },
  { title: 'Find the plan on the calendar.', description: 'Dates with galas have a dot. Tap a date to see its plans, or scroll the feed for what’s coming up.' },
  { title: 'Turn a drawing into a plan.', description: 'Pirma when you’re going. Once enough people join, the gala gets its color. Open it to see the details and split the ambagan.' },
]

export function TourDialog({ circleName, hasGalas, onFinish, transition }: TourDialogProps) {
  const [step, setStep] = useState(0)
  const current = steps[step]

  return <ModalFrame title={current.title} subtitle={`A quick look around ${circleName}.`} onClose={() => onFinish(false)} transition={transition} className="tour-dialog">
    <div className="tour-visual" aria-hidden="true">
      {step === 0 && <div className="tour-circle-preview"><span className="tour-preview-label">Your circle</span><span className="tour-preview-pill"><i /><strong>{circleName}</strong><ChevronRight size={14} /></span><span className="tour-preview-note"><UsersRound size={15} /> Only its members see its plans</span></div>}
      {step === 1 && <div className="tour-calendar-preview"><span className="tour-preview-label"><CalendarDays size={14} /> Example calendar</span><span className="tour-calendar-days"><i>19</i><i>20</i><i className="tour-day-active">21<b /></i><i>22</i><i>23</i></span><span className="tour-preview-note">Tap a date with a dot to filter the feed</span></div>}
      {step === 2 && <div className="tour-gala-preview"><span className="tour-preview-label">Example gala</span><span className="tour-progress-copy"><PenLine size={15} /> 3 of 4 going <Check size={14} /></span><span className="tour-progress-track"><i /></span><span className="tour-preview-note">One more pirma and it’s May Kulay Na</span></div>}
    </div>
    <p className="tour-description">{current.description}</p>
    <div className="tour-footer"><div className="tour-progress" aria-label={`Step ${step + 1} of ${steps.length}`}>{steps.map((_, index) => <i key={index} className={index === step ? 'active' : ''} />)}</div><span>{step + 1} of {steps.length}</span></div>
    <div className="tour-actions">{step === 0 ? <button className="clear-button" type="button" onClick={() => onFinish(false)}>Skip tour</button> : <button className="clear-button" type="button" onClick={() => setStep(step - 1)}><ChevronLeft size={15} /> Back</button>}{step < steps.length - 1 ? <button className="primary-button" type="button" onClick={() => setStep(step + 1)}>Next <ChevronRight size={15} /></button> : <button className="primary-button" type="button" onClick={() => onFinish(!hasGalas)}>{hasGalas ? 'Explore galas' : 'Plan a gala'} <ChevronRight size={15} /></button>}</div>
  </ModalFrame>
}
