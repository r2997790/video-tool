import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api'
import { useToast } from '../../components/Toast'
import { applyAdminBrandingCss, useAdminBranding } from '../../hooks/useAdminBranding'
import { useEffect } from 'react'
import { SaveIcon } from '../../components/icons/uiIcons'
import '../../styles/admin.css'

export function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const navigate = useNavigate()
  const toast = useToast()
  const branding = useAdminBranding()

  useEffect(() => {
    applyAdminBrandingCss(branding)
  }, [branding])

  useEffect(() => {
    api.me().then(r => {
      if (!r.authenticated) navigate('/admin/login', { replace: true })
    }).catch(() => navigate('/admin/login', { replace: true }))
  }, [navigate])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setSaving(true)
    try {
      await api.changePassword(currentPassword, newPassword)
      toast.success('Password updated')
      navigate('/admin/flows')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change password')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="admin-login">
      <div className="admin-login-card">
        <div className="admin-login-brand">
          {branding.logoUrl && <img src={branding.logoUrl} alt="" />}
          <h1>Set a new password</h1>
          <p style={{ color: '#9b9d9f', fontSize: 13, margin: '8px 0 0' }}>
            Replace the default password before continuing to {branding.brandName}.
          </p>
        </div>
        {error && <p className="admin-error">{error}</p>}
        <form onSubmit={submit}>
          <div className="admin-field">
            <label>Current password</label>
            <input
              className="admin-input"
              type="password"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          <div className="admin-field">
            <label>New password</label>
            <input
              className="admin-input"
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>
          <div className="admin-field">
            <label>Confirm new password</label>
            <input
              className="admin-input"
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>
          <button className="admin-btn admin-btn-primary btn-with-icon" type="submit" style={{ width: '100%' }} disabled={saving}>
            <SaveIcon />
            {saving ? 'Saving…' : 'Update password'}
          </button>
        </form>
      </div>
    </div>
  )
}
