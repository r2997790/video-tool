import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { api } from '../../api'
import { applyAdminBrandingCss, useAdminBranding } from '../../hooks/useAdminBranding'
import '../../styles/admin.css'

export function AdminLayout() {
  const [auth, setAuth] = useState<{ authenticated: boolean; username?: string; mustChangePassword?: boolean } | null>(null)
  const [navOpen, setNavOpen] = useState(true)
  const location = useLocation()
  const navigate = useNavigate()
  const branding = useAdminBranding()

  useEffect(() => {
    applyAdminBrandingCss(branding)
  }, [branding])

  useEffect(() => {
    api.me().then(setAuth).catch(() => setAuth({ authenticated: false }))
  }, [location.pathname])

  useEffect(() => {
    if (auth?.authenticated && auth.mustChangePassword && location.pathname !== '/admin/change-password') {
      navigate('/admin/change-password')
    }
  }, [auth, location.pathname, navigate])

  if (auth === null || branding.loading) {
    return (
      <div className="admin-main" style={{ padding: 32 }}>
        <div className="admin-skeleton" style={{ width: 200, height: 24 }} />
        <div className="admin-skeleton" style={{ width: '100%', height: 120, marginTop: 16 }} />
      </div>
    )
  }

  if (!auth.authenticated) {
    navigate('/admin/login')
    return null
  }

  const links = [
    { to: '/admin/flows', label: 'Flows' },
    { to: '/admin/events', label: 'Events' },
    { to: '/admin/settings', label: 'Settings' },
  ]

  const isFlowsSection = location.pathname.startsWith('/admin/flows')
  const isEventsSection = location.pathname.startsWith('/admin/events')

  const handleLogout = () => {
    api.logout().then(() => navigate('/admin/login'))
  }

  return (
    <div className="admin-layout">
      <nav className={`admin-nav${navOpen ? '' : ' collapsed'}`}>
        <button type="button" className="admin-nav-toggle" onClick={() => setNavOpen(v => !v)} aria-label="Toggle menu">
          Menu
        </button>
        <div className="admin-nav-brand">
          {branding.logoUrl ? (
            <img src={branding.logoUrl} alt={branding.brandName} />
          ) : null}
          <span>{branding.brandName}</span>
        </div>
        <div className="admin-nav-links">
          {links.map(l => (
            <Link
              key={l.to}
              to={l.to}
              className={
                location.pathname === l.to
                || (l.to === '/admin/flows' && isFlowsSection)
                || (l.to === '/admin/events' && isEventsSection)
                  ? 'active'
                  : ''
              }
            >
              {l.label}
            </Link>
          ))}
          <button type="button" className="admin-nav-logout" onClick={handleLogout}>
            Logout ({auth.username})
          </button>
        </div>
      </nav>
      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  )
}
