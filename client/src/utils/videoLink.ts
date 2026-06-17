export function parseVideoLink(link: string | undefined | null): { type: 'youtube' | 'direct' | 'none'; value: string; isLive: boolean } {
  if (!link?.trim()) return { type: 'none', value: '', isLive: false }

  const trimmed = link.trim()
  const isLiveUrl = /youtube\.com\/live\//i.test(trimmed)

  if (trimmed.startsWith('http')) {
    if (trimmed.includes('youtube.com/live/')) {
      const id = trimmed.split('/live/')[1]?.split(/[?&#]/)[0]
      if (id) return { type: 'youtube', value: id, isLive: true }
    }
    if (trimmed.includes('youtube.com/watch')) {
      const match = trimmed.match(/[?&]v=([^&]+)/)
      if (match?.[1]) return { type: 'youtube', value: match[1], isLive: isLiveUrl }
    }
    if (trimmed.includes('youtu.be/')) {
      const id = trimmed.split('youtu.be/')[1]?.split(/[?&#]/)[0]
      if (id) return { type: 'youtube', value: id, isLive: false }
    }
    if (trimmed.includes('youtube.com/embed/')) {
      const id = trimmed.split('/embed/')[1]?.split(/[?&#]/)[0]
      if (id) return { type: 'youtube', value: id, isLive: false }
    }
    return { type: 'direct', value: trimmed, isLive: false }
  }

  if (trimmed.length === 11 && /^[\w-]+$/.test(trimmed)) {
    return { type: 'youtube', value: trimmed, isLive: false }
  }

  return { type: 'direct', value: trimmed, isLive: false }
}
