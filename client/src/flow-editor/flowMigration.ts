import type { FlowNode, FlowProject } from '../types'
import { newNode } from './flowSchema'
import { getChapterIdFromNode, getNextNodes } from './flowRuntime'
import { ensureLegacyChapterVideos } from './flowTimeline'
import type { AdminChapterVideo } from '../types'

type LegacyToaster = {
  id: number
  chapterId: number | null
  triggerAtSeconds: number
  durationSeconds: number
  title: string
  message: string
  toasterType: string
  imageUrl?: string | null
  linkUrl?: string | null
  linkNewWindow?: boolean
  thumbnailUrl?: string | null
  downloadUrl?: string | null
  downloadFileName?: string | null
  bannerPosition?: string
}

type LegacyPause = {
  id: number
  chapterId: number | null
  triggerAtSeconds: number
  prompt: string
  fieldId: string
  inputType: string
  optionsJson?: string | null
  required: boolean
  placeholder?: string | null
}

function parseOptions(json: string | null | undefined): string[] {
  if (!json) return []
  try { return JSON.parse(json) as string[] } catch { return [] }
}

function findVideoNodeForChapter(project: FlowProject, chapterId: number): FlowNode | null {
  return project.nodes.find(n =>
    n.type === 'video' && getChapterIdFromNode(n) === chapterId) ?? null
}

function findChapterNode(project: FlowProject, chapterId: number): FlowNode | null {
  return project.nodes.find(n =>
    n.type === 'chapter' && getChapterIdFromNode(n) === chapterId) ?? null
}

function attachToVideo(
  project: FlowProject,
  videoNodeId: string,
  eventNode: FlowNode,
): void {
  const events = getNextNodes(project, videoNodeId).filter(n => n.type === 'pause' || n.type === 'toaster')
  const last = events[events.length - 1]
  const from = last?.id ?? videoNodeId
  if (!project.connections.some(c => c.from === from && c.to === eventNode.id)) {
    project.connections.push({ from, to: eventNode.id })
  }
}

export function migrateLegacyPlaybackToFlow(
  project: FlowProject,
  videos: AdminChapterVideo[],
  legacyToasters: LegacyToaster[],
  legacyPauses: LegacyPause[],
): FlowProject {
  let next: FlowProject = {
    ...project,
    nodes: [...project.nodes],
    connections: [...project.connections],
  }
  next = ensureLegacyChapterVideos(next, videos)

  for (const t of legacyToasters) {
    if (next.nodes.some(n => n.parameters.legacyToasterId === t.id)) continue
    const chId = t.chapterId
    let videoNode = chId != null ? findVideoNodeForChapter(next, chId) : null
    if (!videoNode && chId != null) {
      const chNode = findChapterNode(next, chId)
      if (chNode) videoNode = getNextNodes(next, chNode.id).find(n => n.type === 'video') ?? null
    }
    if (!videoNode) continue

    const node = newNode('toaster', t.title || 'Pop-up')
    node.parameters = {
      legacyToasterId: t.id,
      triggerAtSeconds: t.triggerAtSeconds,
      durationSeconds: t.durationSeconds,
      title: t.title,
      message: t.message,
      toasterType: t.toasterType,
      imageUrl: t.imageUrl ?? '',
      linkUrl: t.linkUrl ?? '',
      linkNewWindow: t.linkNewWindow ?? false,
      thumbnailUrl: t.thumbnailUrl ?? '',
      downloadUrl: t.downloadUrl ?? '',
      downloadFileName: t.downloadFileName ?? '',
      bannerPosition: t.bannerPosition ?? 'top',
    }
    next.nodes.push(node)
    attachToVideo(next, videoNode.id, node)
  }

  for (const p of legacyPauses) {
    if (next.nodes.some(n => n.parameters.legacyPauseId === p.id)) continue
    const chId = p.chapterId
    let videoNode = chId != null ? findVideoNodeForChapter(next, chId) : null
    if (!videoNode && chId != null) {
      const chNode = findChapterNode(next, chId)
      if (chNode) videoNode = getNextNodes(next, chNode.id).find(n => n.type === 'video') ?? null
    }
    if (!videoNode) continue

    const node = newNode('pause', 'Pause question')
    node.parameters = {
      legacyPauseId: p.id,
      triggerAtSeconds: p.triggerAtSeconds,
      prompt: p.prompt,
      fieldId: p.fieldId,
      inputType: p.inputType,
      options: parseOptions(p.optionsJson),
      required: p.required,
      placeholder: p.placeholder ?? '',
    }
    next.nodes.push(node)
    attachToVideo(next, videoNode.id, node)
  }

  return next
}
