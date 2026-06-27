import type { FlowProject } from '../types'
import type { AdminChapterVideo } from '../types'
import { getChapterIdFromNode, getNextNodes, getStartNodes, isVideoEventChainNode } from './flowRuntime'
import { getVideoIdFromNode } from './flowTimeline'

function buildAdjacency(project: FlowProject): Map<string, string[]> {
  const adj = new Map<string, string[]>()
  for (const n of project.nodes) adj.set(n.id, [])
  for (const c of project.connections) {
    adj.get(c.from)?.push(c.to)
  }
  return adj
}

function canReachPlayback(startId: string, project: FlowProject): boolean {
  const adj = buildAdjacency(project)
  const playbackIds = new Set(
    project.nodes.filter(n => n.type === 'chapter' || n.type === 'video').map(n => n.id),
  )
  if (playbackIds.size === 0) return false

  const seen = new Set<string>()
  const queue = [startId]
  while (queue.length > 0) {
    const id = queue.shift()!
    if (seen.has(id)) continue
    seen.add(id)
    if (playbackIds.has(id)) return true
    for (const next of adj.get(id) ?? []) queue.push(next)
  }
  return false
}

export function validateFlowProject(
  project: FlowProject,
  options?: { chapterCount?: number; isEnabled?: boolean; chapterVideos?: AdminChapterVideo[] },
): string[] {
  const warnings: string[] = []
  const chapterNodes = project.nodes.filter(n => n.type === 'chapter')
  const videoNodes = project.nodes.filter(n => n.type === 'video')
  const videos = options?.chapterVideos ?? []

  for (const node of chapterNodes) {
    if (!node.parameters.chapterId) {
      warnings.push(`Chapter node "${node.name}" is not linked to a video chapter.`)
    }
    const chId = getChapterIdFromNode(node)
    if (chId != null) {
      const chVideos = videos.filter(v => v.chapterId === chId)
      const hasVideoNode = getNextNodes(project, node.id).some(n => n.type === 'video')
      if (chVideos.length === 0 && !hasVideoNode) {
        warnings.push(`Chapter "${node.name}" has no videos configured.`)
      }
    }
  }

  for (const node of videoNodes) {
    const source = (node.parameters.videoSource as string) || 'library'
    if (source === 'library') {
      const vid = getVideoIdFromNode(node)
      if (!vid) {
        warnings.push(`Video node "${node.name}" is missing a video clip selection.`)
      }
    } else if (!(node.parameters.videoLink as string)?.trim()) {
      warnings.push(`Video node "${node.name}" is missing an inline video URL.`)
    }
  }

  for (const node of project.nodes.filter(n => n.type === 'pause' || n.type === 'toaster')) {
    if (isVideoEventChainNode(project, node.id)) continue
    const hasSpineParent = project.connections.some(c => c.to === node.id)
    if (!hasSpineParent) {
      warnings.push(`${node.type === 'pause' ? 'Pause' : 'Pop-up'} "${node.name}" is not connected in the flow.`)
    }
  }

  for (const node of project.nodes.filter(n => n.type === 'question' || n.type === 'aichat' || n.type === 'pause')) {
    if (isVideoEventChainNode(project, node.id) && (node.parameters.triggerAtSeconds as number | undefined) == null) {
      warnings.push(`"${node.name}" is attached to a video but has no trigger time.`)
    }
  }

  for (const node of project.nodes.filter(n => n.type === 'event')) {
    if (!(node.parameters.eventSlug as string)?.trim()) {
      warnings.push(`Event registration node "${node.name}" has no scheduled event selected.`)
    }
  }

  const starts = getStartNodes(project)
  for (const start of starts) {
    if ((chapterNodes.length > 0 || videoNodes.length > 0) && !canReachPlayback(start.id, project)) {
      warnings.push(`No path from "${start.name}" to video content — viewers may never reach playback.`)
    }
  }

  if (options?.isEnabled && (options.chapterCount ?? 0) === 0) {
    warnings.push('This flow is live but has no chapters configured.')
  }

  if (options?.isEnabled && videoNodes.length === 0 && chapterNodes.length === 0) {
    warnings.push('This flow is live but has no video nodes in the graph.')
  }

  return warnings
}
