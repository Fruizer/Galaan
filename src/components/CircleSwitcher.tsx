import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, UsersRound } from 'lucide-react'
import type { Circle } from '../types'

interface CircleSwitcherProps {
  circles: Circle[]
  activeCircle: Circle
  onSelect: (id: string) => void
  onCreate?: () => void
  onJoin?: () => void
}

export function CircleSwitcher({ circles, activeCircle, onSelect, onCreate, onJoin }: CircleSwitcherProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  return (
    <div className="circle-switcher" ref={rootRef}>
      <button className="circle-switcher-trigger" type="button" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <span className="circle-color-mark" style={{ backgroundColor: activeCircle.color }} />
        <span className="switcher-name">{activeCircle.name}</span>
        <ChevronDown size={15} className={open ? 'chevron-open' : ''} />
      </button>
      {open && <div className="circle-menu" role="listbox" aria-label="Switch friend circle">
        <div className="circle-menu-title"><UsersRound size={14} /> Your circles</div>
        {circles.map((circle) => <button key={circle.id} type="button" role="option" aria-selected={circle.id === activeCircle.id} className={`circle-option${circle.id === activeCircle.id ? ' is-current' : ''}`} onClick={() => { onSelect(circle.id); setOpen(false) }}>
          <span className="circle-option-dot" style={{ backgroundColor: circle.color }} />
          <span className="circle-option-copy"><strong>{circle.name}</strong><small>{circle.subtitle}</small></span>
          {circle.id === activeCircle.id && <Check size={15} />}
        </button>)}
        {onJoin && <button className="circle-create-action" type="button" onClick={() => { onJoin(); setOpen(false) }}>Join with a code</button>}
        {onCreate && <button className="circle-create-action" type="button" onClick={() => { onCreate(); setOpen(false) }}>+ Create a circle</button>}
      </div>}
    </div>
  )
}
