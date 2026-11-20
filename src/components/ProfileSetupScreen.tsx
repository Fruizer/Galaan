import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ArrowRight, Pencil } from 'lucide-react'

interface ProfileSetupProps {
  displayName: string
  onSave: (name: string, photo?: File) => Promise<void>
  onSignOut: () => void
}

export function ProfileSetupScreen({ displayName, onSave, onSignOut }: ProfileSetupProps) {
  const [name, setName] = useState(displayName === 'Barkada member' ? '' : displayName)
  const [photo, setPhoto] = useState<File>()
  const [preview, setPreview] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (!photo) return
    const url = URL.createObjectURL(photo)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [photo])
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    try { await onSave(name.trim(), photo) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save your profile. Try again.') }
    finally { setBusy(false) }
  }
  return <main className="account-screen"><section className="account-card">
    <div className="brand-lockup account-brand"><span className="brand-mark" aria-hidden="true"><span /><span /><span /></span><span>galaan</span></div>
    <h1>What should we call you?</h1><p>Give the barkada a name and a face to look out for.</p>
    <form className="circle-start-form" onSubmit={(event) => { void submit(event) }}>
      <button className="onboarding-photo" type="button" disabled={busy} onClick={() => input.current?.click()} aria-label="Choose profile picture">{preview ? <img src={preview} alt="Your selected profile picture" /> : <span>{name.trim().slice(0, 1).toUpperCase() || 'You'}</span>}<i><Pencil size={15} /></i></button>
      <input ref={input} type="file" hidden accept="image/jpeg,image/png,image/webp,image/avif" onChange={(event) => {
        const file = event.target.files?.[0]
        event.target.value = ''
        if (!file) return
        if (file.size > 8 * 1024 * 1024) { setError('Choose a photo smaller than 8 MB.'); return }
        setError(''); setPhoto(file)
      }} />
      <span className="photo-help">Photo optional · JPG, PNG, WebP or AVIF · up to 8 MB.<br />We resize it automatically to keep things light.</span>
      <label htmlFor="setup-name">Your name</label><input id="setup-name" autoComplete="nickname" minLength={2} maxLength={36} required value={name} onChange={(event) => setName(event.target.value)} disabled={busy} placeholder="What your friends call you" />
      {error && <p className="account-error" role="alert">{error}</p>}
      <button className="primary-button email-auth-submit" disabled={busy || name.trim().length < 2}>{busy ? 'Saving your profile…' : 'Continue'}<ArrowRight size={16} /></button>
    </form><button className="account-signout" type="button" disabled={busy} onClick={onSignOut}>Sign out</button>
  </section></main>
}
