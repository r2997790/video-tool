import type { FlowNode, FlowProject, ToasterType, VideoPausePoint, VideoToaster, Chapter } from '../types'
import { getChapterIdFromNode, getNextNodes, isPlaybackTriggerNode } from './flowRuntime'

export type FlowToasterTrigger = VideoToaster & { flowNodeId: string; source: 'flow' }
export type FlowPauseTrigger = VideoPausePoint & { flowNodeId: string; source: 'flow' }

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
  }
}

function collectEventsFromVideoNode(flow: FlowProject, videoNodeId: string, chapterId: number | null): {
  toasters: FlowToasterTrigger[]
  pauses: FlowPauseTrigger[]
} {
  const toasters: FlowToasterTrigger[] = []
  const pauses: FlowPauseTrigger[] = []
  const seen = new Set<string>()

  const walk = (nodeId: string) => {
    for (const next of getNextNodes(flow, nodeId)) {
      if (seen.has(next.id)) continue
      if (!isPlaybackTriggerNode(next)) break
      seen.add(next.id)
      if (next.type === 'toaster') toasters.push(flowNodeToToaster(next, chapterId))
      if (next.type === 'pause') pauses.push(flowNodeToPause(next, chapterId))
      walk(next.id)
    }
  }

  walk(videoNodeId)
  return { toasters, pauses }
}

export function collectChapterPlaybackTriggers(
  flow: FlowProject | undefined,
  activeChapterId: number | null,
  activeVideoNodeId?: string | null,
): {
  toasters: FlowToasterTrigger[]
  pauses: FlowPauseTrigger[]
} {
  if (!flow || activeChapterId == null) return { toasters: [], pauses: [] }

  if (activeVideoNodeId) {
    const videoNode = flow.nodes.find(n => n.id === activeVideoNodeId)
    if (videoNode?.type === 'video') {
      const chId = getChapterIdFromNode(videoNode) ?? activeChapterId
      const { toasters, pauses } = collectEventsFromVideoNode(flow, activeVideoNodeId, chId)
      return {
        toasters: toasters.sort((a, b) => a.triggerAtSeconds - b.triggerAtSeconds),
        pauses: pauses.sort((a, b) => a.triggerAtSeconds - b.triggerAtSeconds),
      }
    }
  }

  const toasters: FlowToasterTrigger[] = []
  const pauses: FlowPauseTrigger[] = []
  const chapterNodes = flow.nodes.filter(n =>
    (n.type === 'chapter' || n.type === 'video') && getChapterIdFromNode(n) === activeChapterId)

  for (const ch of chapterNodes) {
    const videoNode = ch.type === 'video' ? ch : getNextNodes(flow, ch.id).find(n => n.type === 'video')
    const fromId = videoNode?.id ?? ch.id
    const { toasters: t, pauses: p } = collectEventsFromVideoNode(flow, fromId, activeChapterId)
    toasters.push(...t)
    pauses.push(...p)
  }

  return {
    toasters: toasters.sort((a, b) => a.triggerAtSeconds - b.triggerAtSeconds),
    pauses: pauses.sort((a, b) => a.triggerAtSeconds - b.triggerAtSeconds),
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
): { name: string; videoType: string; videoValue: string; duration?: string } | null {
  if (!chapter) return null
  if (videoId != null && chapter.videos?.length) {
    const v = chapter.videos.find(x => x.id === videoId)
    if (v) {
      return {
        name: v.title || chapter.name,
        videoType: v.videoType || 'none',
        videoValue: v.videoValue || v.videoLink || '',
        duration: v.duration,
      }
    }
  }
  return {
    name: chapter.name,
    videoType: chapter.videoType,
    videoValue: chapter.videoValue,
    duration: chapter.duration,
  }
}
