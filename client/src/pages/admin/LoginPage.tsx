import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '../../api'
import { applyAdminBrandingCss, useAdminBranding } from '../../hooks/useAdminBranding'
import { LoginIcon } from '../../components/icons/uiIcons'
import { getPostLoginPath } from '../../utils/authNav'

export function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [checkingAuth, setCheckingAuth] = useState(true)
  const navigate = useNavigate()
  const branding = useAdminBranding()

  useEffect(() => {
    applyAdminBrandingCss(branding)
  }, [branding])

  useEffect(() => {
    api.me()
      .then(res => {
        if (res.authenticated) navigate(getPostLoginPath(res), { replace: true })
      })
      .catch(() => {})
      .finally(() => setCheckingAuth(false))
  }, [navigate])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      const res = await api.login(username, password)
      if (res.mustChangePassword) navigate('/admin/change-password')
      else navigate('/admin/flows')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    }
  }

  if (checkingAuth) {
    return (
      <div className="admin-login">
        <div className="admin-login-card" style={{ textAlign: 'center', color: '#9b9d9f' }}>
          Loading…
        </div>
      </div>
    )
  }

  return (
    <div className="admin-login">
      <div className="admin-login-card">
        <div className="admin-login-brand">
          {branding.logoUrl && <img src={branding.logoUrl} alt="" />}
          <h1>{branding.brandName}</h1>
          <p style={{ color: '#9b9d9f', fontSize: 13, margin: '8px 0 0' }}>Sign in to manage your demos</p>
        </div>
        {error && <p className="admin-error">{error}</p>}
        <form onSubmit={submit}>
          <div className="admin-field">
            <label>Username</label>
            <input className="admin-input" value={username} onChange={e => setUsername(e.target.value)} autoComplete="username" />
          </div>
          <div className="admin-field">
            <label>Password</label>
            <input className="admin-input" type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" />
          </div>
          <button className="admin-btn admin-btn-primary btn-with-icon" type="submit" style={{ width: '100%' }}>
            <LoginIcon />
            Sign in
          </button>
        </form>
        <p style={{ color: '#9b9d9f', fontSize: 13, margin: '20px 0 0', textAlign: 'center' }}>
          New to Demo Studio?{' '}
          <Link to="/signup" style={{ color: 'var(--accent-site)' }}>Start free trial</Link>
        </p>
      </div>
    </div>
  )
}
