import type { FlowNode, FlowProject, ToasterType, VideoPausePoint, VideoToaster, Chapter } from '../types'
import { getChapterIdFromNode, getNextNodes, isPlaybackTriggerNode } from './flowRuntime'
import { parseVideoLink } from '../utils/videoLink'

export type FlowToasterTrigger = VideoToaster & { flowNodeId: string; source: 'flow' }
export type FlowPauseTrigger = VideoPausePoint & { flowNodeId: string; source: 'flow' }
export type FlowQuestionTrigger = {
  flowNodeId: string
  source: 'flow'
  triggerKey: string
  chapterId: number | null
  triggerAtSeconds: number
  prompt: string
  fieldId: string
  inputType: string
  options?: string[]
  required: boolean
  placeholder?: string | null
}
export type FlowAichatTrigger = {
  flowNodeId: string
  source: 'flow'
  triggerKey: string
  chapterId: number | null
  triggerAtSeconds: number
  node: FlowNode
}

function flowNodeToToaster(node: FlowNode, chapterId: number | null): FlowToasterTrigger {
  const p = node.parameters
  return {
    flowNodeId: node.id,
    source: 'flow',
    id: 0,
    chapterId,
    triggerAtSeconds: (p.triggerAtSeconds as number) || 0,
    durationSeconds: (p.durationSeconds as number) || 5,
    title: (p.title as string) || '',
    message: (p.message as string) || '',
    toasterType: ((p.toasterType as string) || 'popup') as ToasterType,
    imageUrl: (p.imageUrl as string) || null,
    linkUrl: (p.linkUrl as string) || null,
    linkNewWindow: !!p.linkNewWindow,
    thumbnailUrl: (p.thumbnailUrl as string) || null,
    downloadUrl: (p.downloadUrl as string) || null,
    downloadFileName: (p.downloadFileName as string) || null,
    bannerPosition: ((p.bannerPosition as string) || 'top') as 'top' | 'bottom',
  }
}

function flowNodeToPause(node: FlowNode, chapterId: number | null): FlowPauseTrigger {
  const p = node.parameters
  const options = (p.options as string[]) || []
  return {
    flowNodeId: node.id,
    source: 'flow',
    id: 0,
    chapterId,
    triggerAtSeconds: (p.triggerAtSeconds as number) || 0,
    prompt: (p.prompt as string) || 'Please answer',
    fieldId: (p.fieldId as string) || 'answer',
    inputType: (p.inputType as string) || 'text',
    options: options.length ? options : undefined,
    required: p.required !== false,
    placeholder: (p.placeholder as string) || null,
    timeoutSeconds: (p.timeoutSeconds as number) || 0,
  }
}

function flowNodeToQuestion(node: FlowNode, chapterId: number | null): FlowQuestionTrigger {
  const p = node.parameters
  const options = (p.options as string[]) || []
  return {
    flowNodeId: node.id,
    source: 'flow',
    triggerKey: `flow-${node.id}`,
    chapterId,
    triggerAtSeconds: (p.triggerAtSeconds as number) || 0,
    prompt: (p.prompt as string) || 'Please answer',
    fieldId: (p.fieldId as string) || 'answer',
    inputType: (p.inputType as string) || 'text',
    options: options.length ? options : undefined,
    required: p.required !== false,
    placeholder: (p.placeholder as string) || null,
  }
}

function flowNodeToAichat(node: FlowNode, chapterId: number | null): FlowAichatTrigger {
  return {
    flowNodeId: node.id,
    source: 'flow',
    triggerKey: `flow-${node.id}`,
    chapterId,
    triggerAtSeconds: (node.parameters.triggerAtSeconds as number) || 0,
    node,
  }
}

function collectEventsFromVideoNode(flow: FlowProject, videoNodeId: string, chapterId: number | null): {
  toasters: FlowToasterTrigger[]
  pauses: FlowPauseTrigger[]
  questions: FlowQuestionTrigger[]
  aichats: FlowAichatTrigger[]
} {
  const toasters: FlowToasterTrigger[] = []
  const pauses: FlowPauseTrigger[] = []
  const questions: FlowQuestionTrigger[] = []
  const aichats: FlowAichatTrigger[] = []
  const seen = new Set<string>()

  const walk = (nodeId: string) => {
    for (const next of getNextNodes(flow, nodeId)) {
      if (seen.has(next.id)) continue
      if (!isPlaybackTriggerNode(next, flow)) continue
      seen.add(next.id)
      if (next.type === 'toaster') toasters.push(flowNodeToToaster(next, chapterId))
      if (next.type === 'pause') pauses.push(flowNodeToPause(next, chapterId))
      if (next.type === 'question') questions.push(flowNodeToQuestion(next, chapterId))
      if (next.type === 'aichat') aichats.push(flowNodeToAichat(next, chapterId))
      walk(next.id)
    }
  }

  walk(videoNodeId)
  return { toasters, pauses, questions, aichats }
}

export function collectChapterPlaybackTriggers(
  flow: FlowProject | undefined,
  activeChapterId: number | null,
  activeVideoNodeId?: string | null,
): {
  toasters: FlowToasterTrigger[]
  pauses: FlowPauseTrigger[]
  questions: FlowQuestionTrigger[]
  aichats: FlowAichatTrigger[]
} {
  if (!flow || activeChapterId == null) return { toasters: [], pauses: [], questions: [], aichats: [] }

  if (activeVideoNodeId) {
    const videoNode = flow.nodes.find(n => n.id === activeVideoNodeId)
    if (videoNode?.type === 'video') {
      const chId = getChapterIdFromNode(videoNode) ?? activeChapterId
      const { toasters, pauses, questions, aichats } = collectEventsFromVideoNode(flow, activeVideoNodeId, chId)
      const sortByTime = <T extends { triggerAtSeconds: number }>(a: T, b: T) => a.triggerAtSeconds - b.triggerAtSeconds
      return {
        toasters: toasters.sort(sortByTime),
        pauses: pauses.sort(sortByTime),
        questions: questions.sort(sortByTime),
        aichats: aichats.sort(sortByTime),
      }
    }
  }

  const toasters: FlowToasterTrigger[] = []
  const pauses: FlowPauseTrigger[] = []
  const questions: FlowQuestionTrigger[] = []
  const aichats: FlowAichatTrigger[] = []
  const chapterNodes = flow.nodes.filter(n =>
    (n.type === 'chapter' || n.type === 'video') && getChapterIdFromNode(n) === activeChapterId)

  for (const ch of chapterNodes) {
    const videoNode = ch.type === 'video' ? ch : getNextNodes(flow, ch.id).find(n => n.type === 'video')
    const fromId = videoNode?.id ?? ch.id
    const { toasters: t, pauses: p, questions: q, aichats: a } = collectEventsFromVideoNode(flow, fromId, activeChapterId)
    toasters.push(...t)
    pauses.push(...p)
    questions.push(...q)
    aichats.push(...a)
  }

  const sortByTime = <T extends { triggerAtSeconds: number }>(a: T, b: T) => a.triggerAtSeconds - b.triggerAtSeconds
  return {
    toasters: toasters.sort(sortByTime),
    pauses: pauses.sort(sortByTime),
    questions: questions.sort(sortByTime),
    aichats: aichats.sort(sortByTime),
  }
}

export function mergeToasterTriggers(api: VideoToaster[], flow: FlowToasterTrigger[]): Array<VideoToaster & { triggerKey: string; flowNodeId?: string }> {
  return [
    ...api.map(t => ({ ...t, triggerKey: `api-${t.id}` })),
    ...flow.map(t => ({ ...t, id: -1, triggerKey: `flow-${t.flowNodeId}` })),
  ].sort((a, b) => a.triggerAtSeconds - b.triggerAtSeconds)
}

export function mergePauseTriggers(api: VideoPausePoint[], flow: FlowPauseTrigger[]): Array<VideoPausePoint & { triggerKey: string; flowNodeId?: string }> {
  return [
    ...api.map(p => ({ ...p, triggerKey: `api-${p.id}` })),
    ...flow.map(p => ({ ...p, id: -1, triggerKey: `flow-${p.flowNodeId}` })),
  ].sort((a, b) => a.triggerAtSeconds - b.triggerAtSeconds)
}

export function resolveChapterVideo(
  chapter: Chapter | null,
  videoId: number | null,
): { name: string; videoType: string; videoValue: string; duration?: string; isLive?: boolean } | null {
  if (!chapter) return null
  if (videoId != null && chapter.videos?.length) {
    const v = chapter.videos.find(x => x.id === videoId)
    if (v) {
      const parsed = parseVideoLink(v.videoValue || v.videoLink)
      return {
        name: v.title || chapter.name,
        videoType: v.videoType || parsed.type,
        videoValue: v.videoValue || parsed.value || v.videoLink || '',
        duration: v.duration,
        isLive: parsed.isLive,
      }
    }
  }
  const parsed = parseVideoLink(chapter.videoValue || chapter.videoLink)
  return {
    name: chapter.name,
    videoType: chapter.videoType || parsed.type,
    videoValue: chapter.videoValue || parsed.value || chapter.videoLink,
    duration: chapter.duration,
    isLive: parsed.isLive,
  }
}

export function resolveVideoNodePlayback(
  chapter: Chapter | null,
  videoId: number | null,
  videoNode?: FlowNode | null,
): { name: string; videoType: string; videoValue: string; duration?: string; isLive?: boolean } | null {
  if (videoNode?.type === 'video') {
    const source = (videoNode.parameters.videoSource as string) || 'library'
    if (source !== 'library') {
      const link = (videoNode.parameters.videoLink as string) || ''
      const parsed = parseVideoLink(link)
      const isLive = !!videoNode.parameters.isLive || parsed.isLive
      return {
        name: videoNode.name,
        videoType: source === 'youtube' || parsed.type === 'youtube' ? 'youtube' : 'direct',
        videoValue: parsed.value || link,
        isLive,
      }
    }
  }
  return resolveChapterVideo(chapter, videoId)
}
