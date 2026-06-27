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
  primaryColor: '#5CF8D0',
  accentColor: '#47dcb0',
  loading: true,
}

function normalizeBrandColor(color: string, fallback: string) {
  const normalized = color.trim().toLowerCase()
  if (normalized === '#77c043' || normalized === '#55e6c1') return fallback
  return color
}

export function useAdminBranding(): AdminBranding {
  const [branding, setBranding] = useState<AdminBranding>(defaults)

  useEffect(() => {
    api.getAdminConfig()
      .then(cfg => {
        setBranding({
          brandName: (cfg.themeBrandName as string) || defaults.brandName,
          logoUrl: (cfg.themeLogoUrl as string) || '',
          primaryColor: normalizeBrandColor((cfg.themePrimaryColor as string) || defaults.primaryColor, defaults.primaryColor),
          accentColor: normalizeBrandColor((cfg.themeAccentColor as string) || defaults.accentColor, defaults.accentColor),
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
