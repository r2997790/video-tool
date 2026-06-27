import { useEffect, useState } from 'react'
import { api } from '../api'

export type AdminBranding = {
  brandName: string
  logoUrl: string
  primaryColor: string
  accentColor: string
  loading: boolean
}

const defaults: AdminBranding = {
  brandName: 'Demo Studio',
  logoUrl: '',
  primaryColor: '#55e6c1',
  accentColor: '#6c5ce7',
  loading: true,
}

export function useAdminBranding(): AdminBranding {
  const [branding, setBranding] = useState<AdminBranding>(defaults)

  useEffect(() => {
    api.getAdminConfig()
      .then(cfg => {
        setBranding({
          brandName: (cfg.themeBrandName as string) || defaults.brandName,
          logoUrl: (cfg.themeLogoUrl as string) || '',
          primaryColor: (cfg.themePrimaryColor as string) || defaults.primaryColor,
          accentColor: (cfg.themeAccentColor as string) || defaults.accentColor,
          loading: false,
        })
      })
      .catch(() => setBranding(b => ({ ...b, loading: false })))
  }, [])

  return branding
}

export function applyAdminBrandingCss(branding: AdminBranding) {
  const root = document.documentElement
  root.style.setProperty('--admin-accent', branding.primaryColor)
  root.style.setProperty('--admin-accent-deep', branding.accentColor)
}
