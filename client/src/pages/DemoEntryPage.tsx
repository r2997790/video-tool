import { useEffect, useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { api } from '../api'
import { DemoPageSkeleton } from '../components/DemoPageSkeleton'
import { NoDemoAvailablePage } from './NoDemoAvailablePage'

export function DemoEntryPage() {
  const [searchParams] = useSearchParams()
  const flowParam = searchParams.get('flow')
  const [defaultSlug, setDefaultSlug] = useState<string | null>(null)
  const [loading, setLoading] = useState(!flowParam)

  useEffect(() => {
    if (flowParam) return
    api.getHome()
      .then(home => {
        const preferred = home.flows.find(f => f.slug === 'test-demo') ?? home.flows[0]
        setDefaultSlug(preferred?.slug ?? null)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [flowParam])

  if (flowParam) {
    const params = new URLSearchParams(searchParams)
    params.delete('flow')
    const qs = params.toString()
    return <Navigate to={`/flow/${encodeURIComponent(flowParam)}${qs ? `?${qs}` : ''}`} replace />
  }

  if (loading) return <DemoPageSkeleton />
  if (defaultSlug) return <Navigate to={`/flow/${encodeURIComponent(defaultSlug)}`} replace />

  return <NoDemoAvailablePage />
}
