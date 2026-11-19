import { useEffect, type PropsWithChildren } from 'react'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'

interface ModalFrameProps extends PropsWithChildren {
  title: string
  subtitle?: string
  onClose: () => void
  transition: object
  className?: string
}

export function ModalFrame({ title, subtitle, onClose, transition, className = '', children }: ModalFrameProps) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return <motion.div className="dialog-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.16 }} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <motion.section className={`dialog-panel ${className}`} role="dialog" aria-modal="true" aria-labelledby="dialog-title" initial={{ opacity: 0, y: 16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.98 }} transition={transition}>
      <div className="dialog-heading"><div><h2 id="dialog-title">{title}</h2>{subtitle && <p>{subtitle}</p>}</div><button className="icon-button" type="button" aria-label="Close" onClick={onClose}><X size={18} /></button></div>
      {children}
    </motion.section>
  </motion.div>
}
