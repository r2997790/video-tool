import type { TrustLogo } from '../types'

type LandingTrustStripProps = {
  logos: TrustLogo[]
}

export function LandingTrustStrip({ logos }: LandingTrustStripProps) {
  if (logos.length === 0) return null

  return (
    <div className="lp-trust-strip" aria-label="Trusted by">
      <p className="lp-trust-strip-label">Trusted by teams at</p>
      <ul className="lp-trust-strip-logos">
        {logos.map(logo => (
          <li key={logo.name}>
            <img src={logo.logoUrl} alt={logo.name} loading="lazy" />
          </li>
        ))}
      </ul>
    </div>
  )
}
