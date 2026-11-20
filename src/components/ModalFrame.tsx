import { useEffect, useId, useRef, type PropsWithChildren } from 'react'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useBodyScrollLock } from '../hooks/useBodyScrollLock'

interface ModalFrameProps extends PropsWithChildren {
  title: string
  subtitle?: string
  onClose: () => void
  transition: object
  className?: string
}

export function ModalFrame({ title, subtitle, onClose, transition, className = '', children }: ModalFrameProps) {
  const titleId = useId()
  const panelRef = useRef<HTMLElement>(null)
  const closeRef = useRef(onClose)
  useEffect(() => { closeRef.current = onClose }, [onClose])
  useBodyScrollLock(true)
  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    if (!panelRef.current?.contains(document.activeElement)) panelRef.current?.focus()
    function onKeyDown(event: KeyboardEvent) {
      const dialogs = document.querySelectorAll<HTMLElement>('[role="dialog"][aria-modal="true"]')
      if (dialogs[dialogs.length - 1] !== panelRef.current) return
      if (event.key === 'Escape') { event.preventDefault(); closeRef.current() }
      if (event.key !== 'Tab' || !panelRef.current) return
      const focusable = [...panelRef.current.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])')]
        .filter((element) => element.getClientRects().length > 0)
      if (!focusable.length) { event.preventDefault(); return }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && (document.activeElement === first || document.activeElement === panelRef.current)) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => { document.removeEventListener('keydown', onKeyDown); previousFocus?.focus() }
  }, [])

  return <motion.div className="dialog-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.16 }} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <motion.section ref={panelRef} tabIndex={-1} className={`dialog-panel ${className}`} role="dialog" aria-modal="true" aria-labelledby={titleId} initial={{ opacity: 0, y: 16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.98 }} transition={transition}>
      <div className="dialog-heading"><div><h2 id={titleId}>{title}</h2>{subtitle && <p>{subtitle}</p>}</div><button className="icon-button" type="button" aria-label="Close" onClick={onClose}><X size={18} /></button></div>
      {children}
    </motion.section>
  </motion.div>
}
