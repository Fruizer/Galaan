import { useState, type FormEvent } from 'react'
import { ArrowRight, CalendarDays, CirclePlus, Mail, UsersRound } from 'lucide-react'

interface SignInScreenProps {
  loading: boolean
  error: string
  invitePending: boolean
  onEmailAuth: (email: string, password: string, createAccount: boolean) => void
}

export function SignInScreen({ loading, error, invitePending, onEmailAuth }: SignInScreenProps) {
  const [createAccount, setCreateAccount] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [formError, setFormError] = useState('')

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (password.length < 8) return setFormError('Use a password with at least 8 characters.')
    if (createAccount && password !== confirmPassword) return setFormError('Those passwords don’t match.')
    setFormError('')
    onEmailAuth(email.trim(), password, createAccount)
  }

  return <main className="account-screen">
    <section className="account-card">
      <a className="brand-lockup account-brand" href="#home" aria-label="Galaan"><span className="brand-mark" aria-hidden="true"><span /><span /><span /></span><span>galaan</span></a>
      <div className="account-illustration"><CalendarDays size={24} /><UsersRound size={24} /><span /></div>
      <h1>Make time for your people.</h1>
      <p>Sign in with your email and password to see your circles and keep every RSVP together.</p>
      {invitePending && <div className="invite-pending-note">Your circle invite is ready. Sign in to join it.</div>}
      {error && <div className="account-error" role="alert">{error}</div>}
      {formError && <div className="account-error" role="alert">{formError}</div>}
      <form className="email-auth-form" onSubmit={submit}>
        <label htmlFor="auth-email">Email address</label>
        <input id="auth-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required />
        <label htmlFor="auth-password">Password</label>
        <input id="auth-password" type="password" autoComplete={createAccount ? 'new-password' : 'current-password'} minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" required />
        {createAccount && <><label htmlFor="auth-confirm-password">Confirm password</label><input id="auth-confirm-password" type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Enter it again" required /></>}
        <button className="primary-button email-auth-submit" type="submit" disabled={loading}><Mail size={15} />{loading ? 'Please wait…' : createAccount ? 'Create account' : 'Sign in'}<ArrowRight size={15} /></button>
      </form>
      <button className="auth-mode-toggle" type="button" disabled={loading} onClick={() => { setCreateAccount((current) => !current); setFormError('') }}>
        {createAccount ? 'Already have an account? Sign in' : 'New to Galaan? Create an account'}
      </button>
      <small>Your circles are private to their members.</small>
    </section>
  </main>
}

interface FirstCircleScreenProps {
  loading: boolean
  error: string
  onCreate: (name: string) => void
  onJoin: (code: string) => void
  startWithJoin?: boolean
  onSignOut: () => void
}

export function FirstCircleScreen({ loading, error, onCreate, onJoin, startWithJoin = false, onSignOut }: FirstCircleScreenProps) {
  const [name, setName] = useState('')
  const [joining, setJoining] = useState(startWithJoin)
  const [code, setCode] = useState('')
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (loading) return
    if (joining) onJoin(code)
    else if (name.trim().length >= 2) onCreate(name.trim())
  }

  return <main className="account-screen">
    <section className="account-card circle-start-card">
      <a className="brand-lockup account-brand" href="#home" aria-label="Galaan"><span className="brand-mark" aria-hidden="true"><span /><span /><span /></span><span>galaan</span></a>
      <div className="account-illustration"><UsersRound size={25} /><span /></div>
      <h1>{joining ? 'Your barkada is waiting.' : 'Start your first circle.'}</h1>
      <p>{joining ? 'Enter the circle code your organizer shared with you.' : 'Create a home for one barkada, then invite everyone with a link or circle code.'}</p>
      {error && <div className="account-error" role="alert">{error}</div>}
      <form className="circle-start-form" onSubmit={submit}>
        {joining ? <><label htmlFor="join-code">Circle code</label><input id="join-code" className="join-code-input" autoComplete="off" autoCapitalize="characters" spellCheck={false} value={code} onChange={(event) => setCode(event.target.value.toUpperCase().replace(/[^A-F0-9-]/g, '').slice(0, 14))} placeholder="ABCD-EF12-3456" required /></> : <><label htmlFor="circle-name">Circle name</label><input id="circle-name" value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={60} placeholder="e.g. College Tropa" required /></>}
        <button className="primary-button" type="submit" disabled={loading || (joining ? code.replace(/-/g, '').length !== 12 : name.trim().length < 2)}><CirclePlus size={16} />{loading ? 'Please wait…' : joining ? 'Join circle' : 'Create my circle'}</button>
      </form>
      <button className="auth-mode-toggle" type="button" disabled={loading} onClick={() => setJoining((value) => !value)}>{joining ? 'Want to start your own? Create a circle' : 'Already have a circle? Join with a code'}</button>
      <button className="account-signout" type="button" onClick={onSignOut}>Sign out</button>
    </section>
  </main>
}
