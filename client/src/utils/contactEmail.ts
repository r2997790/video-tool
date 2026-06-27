import type { HomePageContact } from '../types'

export function mailtoHref(email?: string | null): string | null {
  const trimmed = email?.trim()
  if (!trimmed) return null
  return `mailto:${trimmed}`
}

export function resolveContactEmail(
  contact: HomePageContact | undefined,
  kind: keyof HomePageContact,
): string | null {
  return contact?.[kind]?.trim() || null
}
