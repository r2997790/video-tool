export function slugify(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64) || `flow-${Date.now().toString(36)}`
}

export function fullPublicUrl(path: string): string {
  return `${window.location.origin}${path.startsWith('/') ? path : `/${path}`}`
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
