import { api, getSessionId } from '../api'

export type LandingCtaEvent =
  | 'hero_build_demo'
  | 'hero_watch_example'
  | 'pricing_free_trial'
  | 'pricing_starter'
  | 'pricing_pro'
  | 'pricing_enterprise'

export function trackLandingCta(name: LandingCtaEvent) {
  api.logEvent(getSessionId(), 'landing_cta', {
    dataJson: JSON.stringify({ name }),
  }).catch(() => {})
}
