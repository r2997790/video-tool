import type { Node } from '@xyflow/react'
import type { AdminChapter, AdminChapterVideo, FlowNode, FlowProject } from '../types'
import { isPlaybackTriggerNode } from './flowRuntime'
import {
  findChapterAncestor,
  parseChapterBlockForLayout,
  projectToTimeline,
  type ChapterSegment,
} from './flowTimeline'

export const CHAPTER_GROUP_MIN_WIDTH = 280
export const CHAPTER_GROUP_MIN_HEIGHT = 160
export const CHAPTER_GROUP_PADDING = 24
export const NESTED_NODE_WIDTH = 200
export const NESTED_NODE_HEIGHT = 72

function findVideoParent(project: FlowProject, nodeId: string): FlowNode | null {
  const node = project.nodes.find(n => n.id === nodeId)
  if (!node || !isPlaybackTriggerNode(node)) return null

  const seen = new Set<string>()
  const queue = [nodeId]
  while (queue.length > 0) {
    const id = queue.shift()!
    if (seen.has(id)) continue
    seen.add(id)
    for (const inc of project.connections.filter(c => c.to === id)) {
      const parent = project.nodes.find(n => n.id === inc.from)
      if (!parent) continue
      if (parent.type === 'video') return parent
      if (isPlaybackTriggerNode(parent)) queue.push(parent.id)
    }
  }
  return null
}

function segmentNodeId(seg: ChapterSegment): string {
  return seg.kind === 'video' ? seg.nodeId : seg.node.id
}

function computeChapterGroupSize(segmentCount: number, maxEvents: number): { width: number; height: number } {
  const rows = Math.max(1, segmentCount)
  const eventRows = Math.max(0, maxEvents)
  const width = CHAPTER_GROUP_MIN_WIDTH + 40
  const height = Math.max(
    CHAPTER_GROUP_MIN_HEIGHT,
    CHAPTER_GROUP_PADDING * 2 + 48 + rows * (NESTED_NODE_HEIGHT + 12) + eventRows * 40,
  )
  return { width, height }
}

export function projectToGraph(
  project: FlowProject,
  chapters: AdminChapter[],
  chapterVideos: AdminChapterVideo[],
): Node[] {
  const timeline = projectToTimeline(project, chapters, chapterVideos)
  const nodes: Node[] = []
  const placed = new Set<string>()
  let topX = 80
  const topY = 80

  for (const row of timeline) {
    if (row.kind === 'step') {
      const n = project.nodes.find(x => x.id === row.node.id)
      if (!n || placed.has(n.id)) continue
      placed.add(n.id)
      nodes.push({
        id: n.id,
        type: 'flowNode',
        position: { x: n.x ?? topX, y: n.y ?? topY },
        data: { label: n.name, nodeType: n.type, parameters: n.parameters, raw: n },
      })
      topX += 240
      continue
    }

    const chapterNode = project.nodes.find(n => n.id === row.nodeId)
    if (!chapterNode || placed.has(chapterNode.id)) continue

    const block = parseChapterBlockForLayout(project, chapterNode, chapterVideos)
    const maxEvents = block.segments.reduce((m, s) => {
      if (s.kind !== 'video') return m
      return Math.max(m, s.events.length)
    }, 0)
    const size = computeChapterGroupSize(block.segments.length, maxEvents)

    const groupX = chapterNode.x ?? topX
    const groupY = chapterNode.y ?? topY
    placed.add(chapterNode.id)

    nodes.push({
      id: chapterNode.id,
      type: 'chapterGroup',
      position: { x: groupX, y: groupY },
      style: { width: size.width, height: size.height },
      data: {
        label: chapterNode.name,
        nodeType: 'chapter',
        parameters: chapterNode.parameters,
        raw: chapterNode,
        segmentCount: block.segments.length,
      },
      draggable: true,
      selectable: true,
    })

    let childY = CHAPTER_GROUP_PADDING + 40
    for (const seg of block.segments) {
      if (seg.kind === 'step') {
        const n = seg.node
        if (placed.has(n.id)) continue
        placed.add(n.id)
        nodes.push({
          id: n.id,
          type: 'flowNode',
          parentId: chapterNode.id,
          extent: 'parent',
          position: { x: CHAPTER_GROUP_PADDING, y: childY },
          data: { label: n.name, nodeType: n.type, parameters: n.parameters, raw: n },
          draggable: true,
        })
        childY += NESTED_NODE_HEIGHT + 12
        continue
      }

      const videoNode = project.nodes.find(n => n.id === seg.nodeId)
      if (!videoNode || placed.has(videoNode.id)) continue
      placed.add(videoNode.id)
      nodes.push({
        id: videoNode.id,
        type: 'flowNode',
        parentId: chapterNode.id,
        extent: 'parent',
        position: { x: CHAPTER_GROUP_PADDING, y: childY },
        data: { label: videoNode.name, nodeType: videoNode.type, parameters: videoNode.parameters, raw: videoNode },
        draggable: true,
      })
      childY += NESTED_NODE_HEIGHT + 8

      let eventX = CHAPTER_GROUP_PADDING + 20
      for (const ev of seg.events) {
        if (placed.has(ev.id)) continue
        placed.add(ev.id)
        nodes.push({
          id: ev.id,
          type: 'flowNode',
          parentId: chapterNode.id,
          extent: 'parent',
          position: { x: eventX, y: childY },
          data: { label: ev.name, nodeType: ev.type, parameters: ev.parameters, raw: ev },
          draggable: true,
        })
        eventX += 160
      }
      if (seg.events.length > 0) childY += 56
      childY += 8
    }

    topX = groupX + size.width + 40
  }

  for (const n of project.nodes) {
    if (placed.has(n.id)) continue
    const chapterAncestor = findChapterAncestor(project, n.id)
    if (chapterAncestor) {
      placed.add(n.id)
      nodes.push({
        id: n.id,
        type: 'flowNode',
        parentId: chapterAncestor.id,
        extent: 'parent',
        position: { x: n.x ?? CHAPTER_GROUP_PADDING, y: n.y ?? CHAPTER_GROUP_PADDING + 40 },
        data: { label: n.name, nodeType: n.type, parameters: n.parameters, raw: n },
        draggable: true,
      })
      continue
    }

    const videoParent = findVideoParent(project, n.id)
    if (videoParent) {
      const chapterAncestor2 = findChapterAncestor(project, videoParent.id)
      placed.add(n.id)
      nodes.push({
        id: n.id,
        type: 'flowNode',
        parentId: chapterAncestor2?.id,
        extent: chapterAncestor2 ? 'parent' : undefined,
        position: { x: n.x ?? 80, y: n.y ?? 80 },
        data: { label: n.name, nodeType: n.type, parameters: n.parameters, raw: n },
        draggable: true,
      })
      continue
    }

    placed.add(n.id)
    nodes.push({
      id: n.id,
      type: 'flowNode',
      position: { x: n.x ?? topX, y: n.y ?? topY },
      data: { label: n.name, nodeType: n.type, parameters: n.parameters, raw: n },
      draggable: true,
    })
    topX += 220
  }

  return nodes
}

export type DropTarget =
  | { scope: 'top' }
  | { scope: 'chapter'; chapterNodeId: string; afterSegmentIndex?: number }
  | { scope: 'video'; videoNodeId: string }

const TOP_LEVEL_TYPES = new Set<FlowNode['type']>(['intro', 'question', 'branch', 'outro', 'event', 'aichat', 'chapter', 'video'])
const CHAPTER_NEST_TYPES = new Set<FlowNode['type']>(['question', 'branch', 'event', 'aichat', 'video'])
const VIDEO_NEST_TYPES = new Set<FlowNode['type']>(['pause', 'toaster'])

export function resolveDropTarget(
  project: FlowProject,
  draggedNodeId: string,
  absolutePosition: { x: number; y: number },
  graphNodes: Node[],
  _chapters: AdminChapter[],
  chapterVideos: AdminChapterVideo[],
): DropTarget | null {
  const dragged = project.nodes.find(n => n.id === draggedNodeId)
  if (!dragged) return null

  const chapterGroups = graphNodes.filter(n => n.type === 'chapterGroup')
  const centerX = absolutePosition.x + NESTED_NODE_WIDTH / 2
  const centerY = absolutePosition.y + NESTED_NODE_HEIGHT / 2

  for (const group of chapterGroups) {
    const gx = group.position.x
    const gy = group.position.y
    const gw = (group.style?.width as number) ?? CHAPTER_GROUP_MIN_WIDTH
    const gh = (group.style?.height as number) ?? CHAPTER_GROUP_MIN_HEIGHT
    if (centerX < gx || centerX > gx + gw || centerY < gy || centerY > gy + gh) continue

    if (CHAPTER_NEST_TYPES.has(dragged.type)) {
      const chapterNode = project.nodes.find(n => n.id === group.id)
      if (!chapterNode) continue

      const block = parseChapterBlockForLayout(project, chapterNode, chapterVideos)
      const localY = centerY - gy
      let afterIndex: number | undefined
      let childY = CHAPTER_GROUP_PADDING + 40
      for (let i = 0; i < block.segments.length; i++) {
        const seg = block.segments[i]
        const segHeight = seg.kind === 'video'
          ? NESTED_NODE_HEIGHT + 8 + (seg.events.length > 0 ? 56 : 0) + 8
          : NESTED_NODE_HEIGHT + 12
        if (localY > childY + segHeight / 2) afterIndex = i
        childY += segHeight
      }

      return { scope: 'chapter', chapterNodeId: group.id, afterSegmentIndex: afterIndex }
    }

    if (VIDEO_NEST_TYPES.has(dragged.type)) {
      const children = graphNodes.filter(n => n.parentId === group.id && (n.data as { nodeType: string }).nodeType === 'video')
      for (const child of children) {
        const cx = gx + child.position.x
        const cy = gy + child.position.y
        if (centerX >= cx && centerX <= cx + NESTED_NODE_WIDTH && centerY >= cy && centerY <= cy + NESTED_NODE_HEIGHT + 40) {
          return { scope: 'video', videoNodeId: child.id }
        }
      }
    }
  }

  if (TOP_LEVEL_TYPES.has(dragged.type)) {
    const currentChapter = findChapterAncestor(project, draggedNodeId)
    if (currentChapter) return { scope: 'top' }
  }

  return null
}

export function dropTargetToEdit(
  draggedNodeId: string,
  target: DropTarget,
  project: FlowProject,
  chapterVideos: AdminChapterVideo[],
): import('./applyFlowEdit').FlowEdit | null {
  const dragged = project.nodes.find(n => n.id === draggedNodeId)
  if (!dragged || !target) return null

  if (target.scope === 'top') {
    return { type: 'moveToTopLevel', nodeId: draggedNodeId }
  }

  if (target.scope === 'video') {
    if (dragged.type !== 'pause' && dragged.type !== 'toaster') return null
    return { type: 'moveNodeToVideo', nodeId: draggedNodeId, videoNodeId: target.videoNodeId }
  }

  if (target.scope === 'chapter') {
    const chapterNode = project.nodes.find(n => n.id === target.chapterNodeId)
    if (!chapterNode) return null

    const currentChapter = findChapterAncestor(project, draggedNodeId)
    if (currentChapter?.id === target.chapterNodeId) {
      const block = parseChapterBlockForLayout(project, chapterNode, chapterVideos)
      const segmentIds = block.segments.map(segmentNodeId)
      const currentIdx = segmentIds.indexOf(draggedNodeId)
      const targetIdx = target.afterSegmentIndex != null ? target.afterSegmentIndex + 1 : segmentIds.length - 1
      const overId = segmentIds[targetIdx]
      if (overId && overId !== draggedNodeId && currentIdx >= 0) {
        return {
          type: 'reorderChapterSegment',
          chapterNodeId: target.chapterNodeId,
          segmentNodeId: draggedNodeId,
          overSegmentNodeId: overId,
        }
      }
      return null
    }

    let afterVideoNodeId: string | undefined
    if (target.afterSegmentIndex != null) {
      const block = parseChapterBlockForLayout(project, chapterNode, chapterVideos)
      const seg = block.segments[target.afterSegmentIndex]
      if (seg?.kind === 'video') afterVideoNodeId = seg.nodeId
    }

    return {
      type: 'moveIntoChapter',
      nodeId: draggedNodeId,
      chapterNodeId: target.chapterNodeId,
      afterVideoNodeId,
    }
  }

  return null
}
