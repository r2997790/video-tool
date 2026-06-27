import { Link } from 'react-router-dom'

import { getAuthNav, type AuthMeResponse } from '../utils/authNav'

type LandingFooterProps = {
  brandName: string
  auth: AuthMeResponse | null
  showDemos?: boolean
  showEvents?: boolean
}

export function LandingFooter({ brandName, auth, showDemos = false, showEvents = false }: LandingFooterProps) {
  const authNav = getAuthNav(auth)

  return (
    <footer className="lp-footer">
      <div className="lp-wrap lp-footer-inner">
        <span>{brandName}</span>

        <div className="lp-footer-links">
          <a href="/#features">Features</a>
          {showDemos && <a href="/#demos">Demos</a>}
          {showEvents && <a href="/#events">Events</a>}
          <a href="/#pricing">Pricing</a>
          <Link to="/terms">Terms</Link>
          <Link to="/privacy">Privacy</Link>
          <Link to="/gdpr">GDPR</Link>
          <Link to={authNav.to}>{authNav.label}</Link>
        </div>
      </div>
    </footer>
  )
}
