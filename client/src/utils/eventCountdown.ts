import { useEffect, useState } from 'react'

export function parseUtcMs(iso: string | null | undefined): number | null {
  if (!iso?.trim()) return null
  const normalized = iso.includes('T') && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(iso) ? `${iso}Z` : iso
  const ms = Date.parse(normalized)
  return Number.isFinite(ms) ? ms : null
}

export function useEventCountdown(startsAtUtc: string | null, serverNowUtc: string | null) {
  const [remainingMs, setRemainingMs] = useState<number | null>(null)

  useEffect(() => {
    const start = parseUtcMs(startsAtUtc)
    const server = parseUtcMs(serverNowUtc)
    if (start == null || server == null) {
      setRemainingMs(null)
      return
    }
    const skew = server - Date.now()
    const tick = () => setRemainingMs(start - (Date.now() + skew))
    tick()
    const id = window.setInterval(tick, 250)
    return () => clearInterval(id)
  }, [startsAtUtc, serverNowUtc])

  return remainingMs
}

export function formatCountdown(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const d = Math.floor(total / 86400)
  const h = Math.floor((total % 86400) / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (d > 0) return `${d}d ${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

export function eventHasStarted(remainingMs: number | null): boolean {
  return remainingMs !== null && remainingMs <= 0
}

export function eventIsWaiting(remainingMs: number | null): boolean {
  return remainingMs !== null && remainingMs > 0
}
