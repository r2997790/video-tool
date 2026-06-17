import type { FlowNode, FlowProject } from '../types'
import type { FlowQuestionField } from './flowTypes'
import { newNode } from './flowSchema'
import { getChapterIdFromNode, getNextNodes, isVideoAttachType } from './flowRuntime'
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
  const events = getNextNodes(project, videoNodeId).filter(n => isVideoAttachType(n.type))
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

function migrateIntroOutroNode(_project: FlowProject, legacy: FlowNode & { type: string }): FlowNode[] {
  const questions = (legacy.parameters.questions as FlowQuestionField[]) || []
  const heading = (legacy.parameters.heading as string) || legacy.name
  const subtext = (legacy.parameters.subtext as string) || ''

  if (questions.length === 0) {
    const node = newNode('question', heading)
    node.parameters = {
      prompt: heading,
      fieldId: `legacy_${legacy.id}`,
      inputType: 'text',
      required: false,
      subtext,
    }
    return [node]
  }

  return questions.map((q, i) => {
    const node = newNode('question', q.label || `Question ${i + 1}`)
    node.parameters = {
      prompt: q.label,
      fieldId: q.id,
      inputType: q.inputType || q.type || 'text',
      options: q.options || [],
      required: q.required !== false,
      placeholder: q.placeholder || '',
      subtext: i === 0 ? subtext : '',
    }
    if (i === 0 && heading && heading !== q.label) {
      node.parameters.heading = heading
    }
    return node
  })
}

function rewireLegacyGate(
  project: FlowProject,
  legacyId: string,
  replacementIds: string[],
): void {
  if (replacementIds.length === 0) return
  const incoming = project.connections.filter(c => c.to === legacyId)
  const outgoing = project.connections.filter(c => c.from === legacyId)
  project.connections = project.connections.filter(c => c.from !== legacyId && c.to !== legacyId)

  for (const inc of incoming) {
    project.connections.push({ from: inc.from, to: replacementIds[0] })
  }
  for (let i = 0; i < replacementIds.length - 1; i++) {
    project.connections.push({ from: replacementIds[i], to: replacementIds[i + 1] })
  }
  const lastId = replacementIds[replacementIds.length - 1]
  for (const out of outgoing) {
    project.connections.push({ from: lastId, to: out.to })
  }
}

export function migrateIntroOutroNodes(project: FlowProject): FlowProject {
  const legacyNodes = project.nodes.filter(n => {
    const t = n.type as string
    return t === 'intro' || t === 'outro'
  }) as Array<FlowNode & { type: string }>
  if (legacyNodes.length === 0) return project

  const next: FlowProject = {
    ...project,
    nodes: project.nodes.filter(n => {
      const t = n.type as string
      return t !== 'intro' && t !== 'outro'
    }),
    connections: [...project.connections],
  }

  for (const legacy of legacyNodes) {
    const replacements = migrateIntroOutroNode(next, legacy)
    next.nodes.push(...replacements)
    rewireLegacyGate(next, legacy.id, replacements.map(n => n.id))
  }

  return next
}

export function migrateLegacyEventNodes(project: FlowProject): FlowProject {
  let changed = false
  const nodes = project.nodes.map(n => {
    if (n.type !== 'event') return n
    const mode = n.parameters.mode as string | undefined
    if (mode !== 'inline') return n
    changed = true
    const { mode: _m, title, holdingHeading, holdingMessage, startsAtUtc, holdingImageUrl, holdingVideoUrl, holdingVideoType, defaultChapterId, ...rest } = n.parameters
    return {
      ...n,
      parameters: {
        ...rest,
        eventSlug: '',
        heading: (holdingHeading as string) || (title as string) || '',
        subtext: (holdingMessage as string) || '',
      },
    }
  })
  return changed ? { ...project, nodes } : project
}
