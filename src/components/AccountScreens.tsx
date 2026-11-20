import { useState, type FormEvent } from 'react'
import { ArrowRight, CalendarDays, CirclePlus, UsersRound } from 'lucide-react'

interface SignInScreenProps {
  loading: boolean
  error: string
  invitePending: boolean
  onGoogleSignIn: () => void
}

export function SignInScreen({ loading, error, invitePending, onGoogleSignIn }: SignInScreenProps) {
  return <main className="account-screen">
    <section className="account-card">
      <a className="brand-lockup account-brand" href="#home" aria-label="Galaan"><span className="brand-mark" aria-hidden="true"><span /><span /><span /></span><span>galaan</span></a>
      <div className="account-illustration"><CalendarDays size={24} /><UsersRound size={24} /><span /></div>
      <h1>Make time for your people.</h1>
      <p>Sign in to see your circles, plan a gala, and keep every RSVP together.</p>
      {invitePending && <div className="invite-pending-note">Your circle invite is ready. Sign in to join it.</div>}
      {error && <div className="account-error" role="alert">{error}</div>}
      <button className="google-signin-button" type="button" disabled={loading} onClick={onGoogleSignIn}>
        <span className="google-g" aria-hidden="true">G</span>{loading ? 'Opening Google…' : 'Continue with Google'}<ArrowRight size={16} />
      </button>
      <small>Your circles are private to their members.</small>
    </section>
  </main>
}

interface FirstCircleScreenProps {
  loading: boolean
  error: string
  onCreate: (name: string) => void
  onSignOut: () => void
}

export function FirstCircleScreen({ loading, error, onCreate, onSignOut }: FirstCircleScreenProps) {
  const [name, setName] = useState('')
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (name.trim().length >= 2) onCreate(name.trim())
  }

  return <main className="account-screen">
    <section className="account-card circle-start-card">
      <a className="brand-lockup account-brand" href="#home" aria-label="Galaan"><span className="brand-mark" aria-hidden="true"><span /><span /><span /></span><span>galaan</span></a>
      <div className="account-illustration"><UsersRound size={25} /><span /></div>
      <h1>Start your first circle.</h1>
      <p>Create a home for one barkada. You can invite friends with a private link after it’s set up.</p>
      {error && <div className="account-error" role="alert">{error}</div>}
      <form className="circle-start-form" onSubmit={submit}>
        <label htmlFor="circle-name">Circle name</label>
        <input id="circle-name" value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={60} placeholder="e.g. College Tropa" required />
        <button className="primary-button" type="submit" disabled={loading || name.trim().length < 2}><CirclePlus size={16} />{loading ? 'Creating…' : 'Create my circle'}</button>
      </form>
      <button className="account-signout" type="button" onClick={onSignOut}>Sign out</button>
    </section>
  </main>
}
