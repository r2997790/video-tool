import type { Node } from '@xyflow/react'
import type { AdminChapter, AdminChapterVideo, FlowNode, FlowProject } from '../types'
import { findVideoAncestor, isPlaybackTriggerNode, isVideoAttachType } from './flowRuntime'
import {
  CHAPTER_NEST_TYPES,
  findChapterAncestor,
  parseChapterBlockForLayout,
  projectToTimeline,
  TOP_LEVEL_DRAG_TYPES,
  VIDEO_NEST_TYPES,
  VIDEO_REQUIRED_ATTACH_TYPES,
  type ChapterSegment,
  type InsertTarget,
} from './flowTimeline'

export const CHAPTER_GROUP_MIN_WIDTH = 280
export const CHAPTER_GROUP_MIN_HEIGHT = 160
export const CHAPTER_GROUP_PADDING = 24
export const NESTED_NODE_WIDTH = 200
export const NESTED_NODE_HEIGHT = 72

function findVideoParent(project: FlowProject, nodeId: string): FlowNode | null {
  const node = project.nodes.find(n => n.id === nodeId)
  if (!node || !isPlaybackTriggerNode(node, project)) return null
  return findVideoAncestor(project, nodeId)
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

/** True for chapter headers and top-level nodes whose canvas position should be persisted. */
export function isFreePositionNode(project: FlowProject, nodeId: string): boolean {
  const node = project.nodes.find(n => n.id === nodeId)
  if (!node) return false
  if (node.type === 'chapter') return true
  if (findChapterAncestor(project, nodeId)) return false
  if (findVideoParent(project, nodeId)) return false
  return true
}

function videoSegmentHeight(seg: ChapterSegment): number {
  if (seg.kind !== 'video') return NESTED_NODE_HEIGHT + 12
  const nestHeight = NESTED_NODE_HEIGHT + 8 + (seg.events.length > 0 ? 56 : 0) + VIDEO_DROP_STRIP_HEIGHT + 8
  return nestHeight + 8
}

export const VIDEO_DROP_STRIP_HEIGHT = 28
export const VIDEO_NEST_HIT_PADDING = 20

function resolveVideoNestHit(
  localY: number,
  segments: ChapterSegment[],
): string | null {
  let childY = CHAPTER_GROUP_PADDING + 40
  for (const seg of segments) {
    if (seg.kind === 'video') {
      const nestHeight = NESTED_NODE_HEIGHT + 8 + (seg.events.length > 0 ? 56 : 40) + VIDEO_DROP_STRIP_HEIGHT
      const hitTop = childY - VIDEO_NEST_HIT_PADDING
      const hitBottom = childY + nestHeight + VIDEO_NEST_HIT_PADDING
      if (localY >= hitTop && localY < hitBottom) {
        return seg.nodeId
      }
      childY += nestHeight + 8
    } else {
      childY += NESTED_NODE_HEIGHT + 12
    }
  }
  return null
}

function resolveChapterDropIndex(
  localY: number,
  segments: ChapterSegment[],
): number | undefined {
  let afterIndex: number | undefined
  let childY = CHAPTER_GROUP_PADDING + 40
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]
    const segHeight = videoSegmentHeight(seg)
    if (localY > childY + segHeight / 2) afterIndex = i
    childY += segHeight
  }
  return afterIndex
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
  let chapterIndex = 0

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

    const groupX = chapterNode.x ?? (80 + chapterIndex * 60)
    const groupY = chapterNode.y ?? (80 + chapterIndex * 320)
    chapterIndex++
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

      nodes.push({
        id: `video-drop:${videoNode.id}`,
        type: 'videoDropZone',
        parentId: chapterNode.id,
        extent: 'parent',
        position: { x: CHAPTER_GROUP_PADDING, y: childY },
        data: { videoNodeId: videoNode.id },
        draggable: false,
        selectable: false,
        connectable: false,
      })
      childY += VIDEO_DROP_STRIP_HEIGHT + 8
    }
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
        position: { x: CHAPTER_GROUP_PADDING, y: CHAPTER_GROUP_PADDING + 40 },
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
        position: { x: 80, y: 80 },
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

function canInsertAtTop(nodeType: FlowNode['type']): boolean {
  return !VIDEO_REQUIRED_ATTACH_TYPES.has(nodeType)
}

function resolveDropAtPosition(
  project: FlowProject,
  nodeType: FlowNode['type'],
  absolutePosition: { x: number; y: number },
  graphNodes: Node[],
  chapterVideos: AdminChapterVideo[],
  draggedNodeId?: string,
): DropTarget | null {
  const chapterGroups = graphNodes.filter(n => n.type === 'chapterGroup')
  const centerX = absolutePosition.x + NESTED_NODE_WIDTH / 2
  const centerY = absolutePosition.y + NESTED_NODE_HEIGHT / 2
  let insideChapter = false

  for (const group of chapterGroups) {
    const gx = group.position.x
    const gy = group.position.y
    const gw = (group.style?.width as number) ?? CHAPTER_GROUP_MIN_WIDTH
    const gh = (group.style?.height as number) ?? CHAPTER_GROUP_MIN_HEIGHT
    if (centerX < gx || centerX > gx + gw || centerY < gy || centerY > gy + gh) continue

    insideChapter = true

    const chapterNode = project.nodes.find(n => n.id === group.id)
    if (!chapterNode) continue

    const block = parseChapterBlockForLayout(project, chapterNode, chapterVideos)
    const localY = centerY - gy

    if (VIDEO_NEST_TYPES.has(nodeType)) {
      const videoNodeId = resolveVideoNestHit(localY, block.segments)
      if (videoNodeId) {
        return { scope: 'video', videoNodeId }
      }
      if (VIDEO_REQUIRED_ATTACH_TYPES.has(nodeType)) {
        return null
      }
    }

    if (CHAPTER_NEST_TYPES.has(nodeType)) {
      const afterIndex = resolveChapterDropIndex(localY, block.segments)
      return { scope: 'chapter', chapterNodeId: group.id, afterSegmentIndex: afterIndex }
    }
  }

  if (!insideChapter) {
    if (draggedNodeId) {
      if (TOP_LEVEL_DRAG_TYPES.has(nodeType)) {
        const currentChapter = findChapterAncestor(project, draggedNodeId)
        if (currentChapter) return { scope: 'top' }
      }
    } else if (canInsertAtTop(nodeType)) {
      return { scope: 'top' }
    }
  }

  return null
}

export function resolveVideoDropTarget(
  flowPosition: { x: number; y: number },
  graphNodes: Node[],
): DropTarget | null {
  for (const n of graphNodes) {
    if (n.type !== 'videoDropZone') continue
    const abs = absoluteGraphPosition(n, graphNodes)
    const w = NESTED_NODE_WIDTH
    const h = VIDEO_DROP_STRIP_HEIGHT
    if (
      flowPosition.x >= abs.x
      && flowPosition.x <= abs.x + w
      && flowPosition.y >= abs.y
      && flowPosition.y <= abs.y + h
    ) {
      const videoNodeId = (n.data as { videoNodeId: string }).videoNodeId
      return { scope: 'video', videoNodeId }
    }
  }
  return null
}

function absoluteGraphPosition(node: Node, graphNodes: Node[]): { x: number; y: number } {
  let x = node.position.x
  let y = node.position.y
  let parentId = node.parentId
  while (parentId) {
    const parent = graphNodes.find(n => n.id === parentId)
    if (!parent) break
    x += parent.position.x
    y += parent.position.y
    parentId = parent.parentId
  }
  return { x, y }
}

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
  return resolveDropAtPosition(project, dragged.type, absolutePosition, graphNodes, chapterVideos, draggedNodeId)
}

export function resolveInsertDropTarget(
  project: FlowProject,
  flowPosition: { x: number; y: number },
  nodeType: FlowNode['type'],
  graphNodes: Node[],
  _chapters: AdminChapter[],
  chapterVideos: AdminChapterVideo[],
): DropTarget | null {
  return resolveDropAtPosition(project, nodeType, flowPosition, graphNodes, chapterVideos)
}

export function dropTargetToInsertTarget(target: DropTarget): InsertTarget {
  if (target.scope === 'top') return { scope: 'top' }
  if (target.scope === 'video') return { scope: 'video', videoNodeId: target.videoNodeId }
  return {
    scope: 'chapter',
    chapterNodeId: target.chapterNodeId,
    afterSegmentIndex: target.afterSegmentIndex,
  }
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
    if (!isVideoAttachType(dragged.type)) return null
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
      if (currentIdx < 0) return null

      let targetIdx: number
      if (target.afterSegmentIndex != null) {
        targetIdx = target.afterSegmentIndex + 1
      } else {
        targetIdx = 0
      }

      if (targetIdx >= segmentIds.length) {
        const lastId = segmentIds[segmentIds.length - 1]
        if (lastId && lastId !== draggedNodeId && currentIdx !== segmentIds.length - 1) {
          return {
            type: 'reorderChapterSegment',
            chapterNodeId: target.chapterNodeId,
            segmentNodeId: draggedNodeId,
            overSegmentNodeId: lastId,
          }
        }
        return null
      }

      const overId = segmentIds[targetIdx]
      if (overId && overId !== draggedNodeId) {
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
