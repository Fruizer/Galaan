import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import type { Gala } from '../types'

interface MonthCalendarProps {
  month: Date
  galas: Gala[]
  selectedDate: string | null
  onSelectDate: (date: string | null) => void
  onShiftMonth: (amount: number) => void
}

const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function statusFor(gala: Gala) {
  return gala.rsvps.filter((rsvp) => rsvp.status === 'going').length >= gala.quorum ? 'color' : 'drawing'
}

export function MonthCalendar({ month, galas, selectedDate, onSelectDate, onShiftMonth }: MonthCalendarProps) {
  const firstWeekday = new Date(month.getFullYear(), month.getMonth(), 1).getDay()
  const daysThisMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const cells = Array.from({ length: Math.ceil((firstWeekday + daysThisMonth) / 7) * 7 }, (_, index) => {
    const day = index - firstWeekday + 1
    return day > 0 && day <= daysThisMonth ? new Date(month.getFullYear(), month.getMonth(), day) : null
  })
  const eventsByDate = new Map<string, Gala[]>()
  galas.forEach((gala) => eventsByDate.set(gala.date, [...(eventsByDate.get(gala.date) ?? []), gala]))

  return (
    <section className="calendar-panel" aria-label="Monthly calendar">
      <div className="calendar-heading">
        <div className="calendar-heading-title"><CalendarDays size={17} strokeWidth={1.8} /><h2>{new Intl.DateTimeFormat('en-PH', { month: 'long', year: 'numeric' }).format(month)}</h2></div>
        <div className="calendar-nav" aria-label="Calendar month navigation">
          <button type="button" aria-label="Previous month" onClick={() => onShiftMonth(-1)}><ChevronLeft size={17} /></button>
          <button type="button" aria-label="Next month" onClick={() => onShiftMonth(1)}><ChevronRight size={17} /></button>
        </div>
      </div>
      <div className="calendar-weekdays" aria-hidden="true">{weekdayLabels.map((day) => <span key={day}>{day}</span>)}</div>
      <div className="calendar-days">
        {cells.map((date, index) => {
          if (!date) return <span className="calendar-blank" key={`blank-${index}`} />
          const key = dateKey(date)
          const dayGalas = eventsByDate.get(key) ?? []
          const isSelected = selectedDate === key
          return <button key={key} type="button" className={`calendar-day${isSelected ? ' selected' : ''}${dayGalas.length ? ' has-events' : ''}`} aria-label={`${new Intl.DateTimeFormat('en-PH', { month: 'long', day: 'numeric' }).format(date)}${dayGalas.length ? `, ${dayGalas.length} ${dayGalas.length === 1 ? 'gala' : 'galas'}` : ''}`} aria-pressed={isSelected} onClick={() => onSelectDate(isSelected ? null : key)}>
            <span className="day-number">{date.getDate()}</span>
            <span className="day-dots" aria-hidden="true">{dayGalas.slice(0, 3).map((gala) => <i key={gala.id} className={`day-dot ${statusFor(gala)}`} />)}</span>
          </button>
        })}
      </div>
      <div className="calendar-legend"><span><i className="legend-dot drawing" /> Drawing</span><span><i className="legend-dot color" /> May Kulay Na</span><span className="legend-hint">Tap a date to filter</span></div>
    </section>
  )
}
