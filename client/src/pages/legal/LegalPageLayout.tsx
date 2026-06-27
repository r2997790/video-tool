import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { api } from '../../api'
import type { HomePageContact, HomePageData } from '../../types'
import { LandingFooter } from '../../components/LandingFooter'
import { getAuthNav, type AuthMeResponse } from '../../utils/authNav'

import '../../styles/landing.css'

const LegalContactContext = createContext<HomePageContact | undefined>(undefined)

export function useLegalContact() {
  return useContext(LegalContactContext)
}

type LegalPageLayoutProps = {
  title: string
  children: ReactNode
}

export function LegalPageLayout({ title, children }: LegalPageLayoutProps) {
  const [auth, setAuth] = useState<AuthMeResponse | null>(null)
  const [homeData, setHomeData] = useState<HomePageData | null>(null)

  useEffect(() => {
    api.me().then(setAuth).catch(() => setAuth({ authenticated: false }))
    api.getHome().then(setHomeData).catch(() => setHomeData(null))
  }, [])

  const brandName = homeData?.brandName || 'Demo Studio'
  const authNav = getAuthNav(auth)

  return (
    <LegalContactContext.Provider value={homeData?.contact}>
      <div className="lp-page">
        <header className="lp-header">
          <div className="lp-wrap lp-header-inner">
            <Link to="/" className="lp-brand">
              <span className="lp-brand-name">{brandName}</span>
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
          <section className="lp-section lp-legal-hero">
            <div className="lp-wrap">
              <p className="lp-eyebrow">Legal</p>
              <h1 className="lp-section-title">{title}</h1>
            </div>
          </section>

          <section className="lp-section lp-legal-body">
            <div className="lp-wrap lp-legal-content">
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
    </LegalContactContext.Provider>
  )
}
