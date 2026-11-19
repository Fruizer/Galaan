import { useCallback, useEffect, useRef, useState } from 'react'
import { Eraser, PenLine } from 'lucide-react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import type { Gala } from '../types'
import { ModalFrame } from './ModalFrame'

interface SignatureDialogProps {
  gala: Gala
  onClose: () => void
  onConfirm: (signature: string) => void
  transition: object
}

export function SignatureDialog({ gala, onClose, onConfirm, transition }: SignatureDialogProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawingRef = useRef(false)
  const [hasInk, setHasInk] = useState(false)

  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const ratio = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = Math.round(rect.width * ratio)
    canvas.height = Math.round(rect.height * ratio)
    const context = canvas.getContext('2d')
    if (!context) return
    context.setTransform(ratio, 0, 0, ratio, 0, 0)
    context.lineWidth = 2.7
    context.lineCap = 'round'
    context.lineJoin = 'round'
    context.strokeStyle = '#344f3d'
  }, [])

  useEffect(() => {
    setupCanvas()
    window.addEventListener('resize', setupCanvas)
    return () => window.removeEventListener('resize', setupCanvas)
  }, [setupCanvas])

  function point(event: ReactPointerEvent<HTMLCanvasElement>) {
    const bounds = event.currentTarget.getBoundingClientRect()
    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top }
  }

  function startDrawing(event: ReactPointerEvent<HTMLCanvasElement>) {
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    const context = event.currentTarget.getContext('2d')
    if (!context) return
    const { x, y } = point(event)
    context.beginPath()
    context.moveTo(x, y)
    drawingRef.current = true
  }

  function draw(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return
    event.preventDefault()
    const context = event.currentTarget.getContext('2d')
    if (!context) return
    const { x, y } = point(event)
    context.lineTo(x, y)
    context.stroke()
    setHasInk(true)
  }

  function clearCanvas() {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return
    context.clearRect(0, 0, canvas.width, canvas.height)
    setupCanvas()
    setHasInk(false)
  }

  function confirmSignature() {
    if (canvasRef.current && hasInk) onConfirm(canvasRef.current.toDataURL('image/png'))
  }

  return <ModalFrame title="Put your pirma on it." subtitle={`A little doodle says you’re in for ${gala.title}.`} onClose={onClose} transition={transition} className="signature-dialog">
    <div className="signature-instruction"><PenLine size={15} /><span>Sign your name or draw a quick doodle.</span></div>
    <div className="signature-canvas-wrap">
      <canvas ref={canvasRef} className="signature-canvas" aria-label="Signature drawing area. Draw with a finger, stylus, or mouse." onPointerDown={startDrawing} onPointerMove={draw} onPointerUp={() => { drawingRef.current = false }} onPointerCancel={() => { drawingRef.current = false }} onPointerLeave={() => { drawingRef.current = false }} />
      {!hasInk && <span className="canvas-placeholder">Your pirma goes here</span>}
      <span className="canvas-preview-line" aria-hidden="true" />
    </div>
    <div className="signature-actions"><button className="clear-button" type="button" onClick={clearCanvas} disabled={!hasInk}><Eraser size={14} /> Clear</button><span className="signature-limit">Just for fun · no legal magic</span><button className="primary-button" type="button" onClick={confirmSignature} disabled={!hasInk}>Confirm I’m going</button></div>
  </ModalFrame>
}
