import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { api } from '../../api'
import type { HomePageData } from '../../types'
import { LandingFooter } from '../../components/LandingFooter'
import { getAuthNav, type AuthMeResponse } from '../../utils/authNav'

import '../../styles/landing.css'

type MarketingPageLayoutProps = {
  eyebrow: string
  title: string
  subtitle?: string
  children: ReactNode
}

export function MarketingPageLayout({ eyebrow, title, subtitle, children }: MarketingPageLayoutProps) {
  const [auth, setAuth] = useState<AuthMeResponse | null>(null)
  const [homeData, setHomeData] = useState<HomePageData | null>(null)

  useEffect(() => {
    api.me().then(setAuth).catch(() => setAuth({ authenticated: false }))
    api.getHome().then(setHomeData).catch(() => setHomeData(null))
  }, [])

  const brandName = homeData?.brandName || 'Demo Studio'
  const authNav = getAuthNav(auth)

  return (
    <div className="lp-page">
      <header className="lp-header">
        <div className="lp-wrap lp-header-inner">
          <Link to="/" className="lp-brand">
            {homeData?.logoUrl
              ? <img src={homeData.logoUrl} alt={brandName} className="lp-logo" />
              : <span className="lp-brand-name">{brandName}</span>}
          </Link>

          <nav className="lp-nav">
            <a href="/#features">Features</a>
            {(homeData?.flows?.length ?? 0) > 0 && <a href="/#demos">Demos</a>}
            {(homeData?.events?.length ?? 0) > 0 && <a href="/#events">Events</a>}
            <a href="/#pricing">Pricing</a>
            <Link to={authNav.to} className="lp-nav-admin">{authNav.label}</Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="lp-section lp-marketing-hero">
          <div className="lp-wrap">
            <p className="lp-eyebrow">{eyebrow}</p>
            <h1 className="lp-section-title">{title}</h1>
            {subtitle && <p className="lp-section-sub lp-marketing-subtitle">{subtitle}</p>}
          </div>
        </section>

        <section className="lp-section lp-marketing-body">
          <div className="lp-wrap">
            {children}
          </div>
        </section>
      </main>

      <LandingFooter
        brandName={brandName}
        auth={auth}
        showDemos={(homeData?.flows?.length ?? 0) > 0}
        showEvents={(homeData?.events?.length ?? 0) > 0}
      />
    </div>
  )
}
