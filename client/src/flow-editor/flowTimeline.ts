import type { AdminChapter, AdminChapterVideo, FlowConnection, FlowNode, FlowProject } from '../types'
import { getChapterIdFromNode, getNextNodes, getNextTraversalNode, getStartNodes, isPlaybackTriggerNode } from './flowRuntime'
import { canConnect, newNode } from './flowSchema'

export type TimelineVideoSegment = {
  kind: 'video'
  nodeId: string
  chapterId: number
  videoId: number
  events: FlowNode[]
}

export type TimelineStepSegment = {
  kind: 'step'
  node: FlowNode
}

export type ChapterSegment = TimelineVideoSegment | TimelineStepSegment

export type TimelineChapterRow = {
  kind: 'chapter'
  nodeId: string
  chapterId: number
  segments: ChapterSegment[]
}

export type TimelineStepRow = {
  kind: 'step'
  node: FlowNode
}

export type TimelineRow = TimelineStepRow | TimelineChapterRow

/** Nested inside chapter blocks only (between videos). */
const CHAPTER_INTERSTITIAL = new Set<FlowNode['type']>(['question', 'branch', 'event', 'aichat'])

/** Top-level timeline rows (intro/outro stay outside chapter blocks). */
const TOP_LEVEL_STEP = new Set<FlowNode['type']>(['intro', 'question', 'branch', 'outro', 'event', 'aichat'])

export function getVideoIdFromNode(node: FlowNode): number | null {
  const id = node.parameters.videoId
  return typeof id === 'number' ? id : typeof id === 'string' ? parseInt(id, 10) : null
}

function collectVideoEvents(flow: FlowProject, videoNodeId: string): FlowNode[] {
  const events: FlowNode[] = []
  const seen = new Set<string>()
  const walk = (nodeId: string) => {
    for (const next of getNextNodes(flow, nodeId)) {
      if (seen.has(next.id)) continue
      if (!isPlaybackTriggerNode(next)) break
      seen.add(next.id)
      events.push(next)
      walk(next.id)
    }
  }
  walk(videoNodeId)
  return events.sort((a, b) =>
    ((a.parameters.triggerAtSeconds as number) || 0) - ((b.parameters.triggerAtSeconds as number) || 0))
}

function isChapterHeader(node: FlowNode): boolean {
  return node.type === 'chapter'
}

function isVideoNode(node: FlowNode): boolean {
  return node.type === 'video'
}

function isChapterInterstitial(node: FlowNode): boolean {
  return CHAPTER_INTERSTITIAL.has(node.type)
}

function isTopLevelStep(node: FlowNode): boolean {
  return TOP_LEVEL_STEP.has(node.type)
}

function getSpineSuccessors(flow: FlowProject, fromId: string): FlowNode[] {
  return getNextNodes(flow, fromId).filter(n => !isPlaybackTriggerNode(n))
}

function stopsChapterBlock(node: FlowNode): boolean {
  return isChapterHeader(node) || node.type === 'intro' || node.type === 'outro'
}

export function findChapterAncestor(project: FlowProject, nodeId: string): FlowNode | null {
  const start = project.nodes.find(n => n.id === nodeId)
  if (!start) return null
  if (start.type === 'chapter') return start

  const seen = new Set<string>()
  const queue = [nodeId]
  while (queue.length > 0) {
    const id = queue.shift()!
    if (seen.has(id)) continue
    seen.add(id)
    for (const inc of project.connections.filter(c => c.to === id)) {
      const parent = project.nodes.find(n => n.id === inc.from)
      if (!parent) continue
      if (parent.type === 'chapter') return parent
      queue.push(parent.id)
    }
  }
  return null
}

function collectNodesInChapterBoundary(flow: FlowProject, chapterNodeId: string): FlowNode[] {
  const result: FlowNode[] = []
  const seen = new Set<string>([chapterNodeId])
  const queue = [chapterNodeId]
  while (queue.length > 0) {
    const id = queue.shift()!
    for (const succ of getSpineSuccessors(flow, id)) {
      if (stopsChapterBlock(succ)) continue
      if (seen.has(succ.id)) continue
      seen.add(succ.id)
      result.push(succ)
      queue.push(succ.id)
    }
  }
  return result
}

function segmentNodeId(seg: ChapterSegment): string {
  return seg.kind === 'video' ? seg.nodeId : seg.node.id
}

function appendUnvisitedChapterSegments(
  flow: FlowProject,
  chapterNode: FlowNode,
  segments: ChapterSegment[],
): void {
  const inSegments = new Set(segments.map(segmentNodeId))
  for (const node of collectNodesInChapterBoundary(flow, chapterNode.id)) {
    if (inSegments.has(node.id)) continue
    if (isVideoNode(node)) {
      const vid = getVideoIdFromNode(node)
      if (vid != null) {
        segments.push({
          kind: 'video',
          nodeId: node.id,
          chapterId: getChapterIdFromNode(node) ?? getChapterIdFromNode(chapterNode) ?? 0,
          videoId: vid,
          events: collectVideoEvents(flow, node.id),
        })
        inSegments.add(node.id)
      }
    } else if (isChapterInterstitial(node)) {
      segments.push({ kind: 'step', node })
      inSegments.add(node.id)
    }
  }
}

function getAfterSegmentIndexForSelection(
  project: FlowProject,
  chapterNode: FlowNode,
  selectedNode: FlowNode,
  videos: AdminChapterVideo[],
): number | undefined {
  if (selectedNode.type === 'chapter') return undefined
  const row = parseChapterBlock(project, chapterNode, videos)
  if (selectedNode.type === 'video') {
    const idx = row.segments.findIndex(s => s.kind === 'video' && s.nodeId === selectedNode.id)
    return idx >= 0 ? idx : undefined
  }
  if (isChapterInterstitial(selectedNode)) {
    const idx = row.segments.findIndex(s => s.kind === 'step' && s.node.id === selectedNode.id)
    return idx >= 0 ? idx : undefined
  }
  if (selectedNode.type === 'pause' || selectedNode.type === 'toaster') {
    for (const inc of project.connections.filter(c => c.to === selectedNode.id)) {
      const parent = project.nodes.find(n => n.id === inc.from)
      if (parent?.type === 'video') {
        const idx = row.segments.findIndex(s => s.kind === 'video' && s.nodeId === parent.id)
        return idx >= 0 ? idx : undefined
      }
    }
  }
  return undefined
}

export function pickNextUnusedChapterVideo(
  project: FlowProject,
  chapterNode: FlowNode,
  chapterVideos: AdminChapterVideo[],
): AdminChapterVideo | null {
  const chapterId = getChapterIdFromNode(chapterNode)
  if (chapterId == null) return null
  const available = chapterVideos
    .filter(v => v.chapterId === chapterId)
    .sort((a, b) => a.sortOrder - b.sortOrder)
  const usedIds = new Set(
    project.nodes
      .filter(n => n.type === 'video' && getChapterIdFromNode(n) === chapterId)
      .map(n => getVideoIdFromNode(n))
      .filter((id): id is number => id != null && id > 0),
  )
  return available.find(v => !usedIds.has(v.id)) ?? null
}

export type InsertTarget =
  | { scope: 'top'; afterRowIndex?: number }
  | { scope: 'chapter'; chapterNodeId: string; afterSegmentIndex?: number }
  | { scope: 'video'; videoNodeId: string }
  | { scope: 'reject'; message: string }

const NEST_IN_CHAPTER_TYPES = new Set<FlowNode['type']>(['question', 'branch', 'aichat', 'event'])

export function resolveInsertTarget(
  project: FlowProject,
  selectedNode: FlowNode | null,
  type: FlowNode['type'],
  _chapterVideos: AdminChapterVideo[],
): InsertTarget {
  if (type === 'pause' || type === 'toaster') {
    if (selectedNode?.type === 'video') {
      return { scope: 'video', videoNodeId: selectedNode.id }
    }
    if (selectedNode && findChapterAncestor(project, selectedNode.id)) {
      return { scope: 'reject', message: 'Select a video inside this chapter first' }
    }
    return { scope: 'reject', message: 'Select a video to attach pause/pop-up' }
  }

  if (type === 'video') {
    const chapter = selectedNode ? findChapterAncestor(project, selectedNode.id) : null
    if (chapter) {
      const afterSegmentIndex = selectedNode
        ? getAfterSegmentIndexForSelection(project, chapter, selectedNode, _chapterVideos)
        : undefined
      return { scope: 'chapter', chapterNodeId: chapter.id, afterSegmentIndex }
    }
    return { scope: 'top' }
  }

  if (NEST_IN_CHAPTER_TYPES.has(type)) {
    if (selectedNode) {
      const chapter = findChapterAncestor(project, selectedNode.id)
      if (chapter) {
        const afterSegmentIndex = getAfterSegmentIndexForSelection(project, chapter, selectedNode, _chapterVideos)
        return { scope: 'chapter', chapterNodeId: chapter.id, afterSegmentIndex }
      }
    }
    return { scope: 'top' }
  }

  return { scope: 'top' }
}

function resolveParentIdForInsert(
  project: FlowProject,
  nodeId: string,
  target: Parameters<typeof insertNodeInTimeline>[4],
): string | null {
  if (target.scope === 'video') return target.videoNodeId
  if (target.scope === 'chapter') {
    const incoming = project.connections.find(c => c.to === nodeId)
    return incoming?.from ?? target.chapterNodeId
  }
  const incoming = project.connections.find(c => c.to === nodeId)
  return incoming?.from ?? null
}

function positionNewNode(project: FlowProject, nodeId: string, parentId: string | null): FlowProject {
  if (!parentId) return project
  const parent = project.nodes.find(n => n.id === parentId)
  if (!parent) return project
  const node = project.nodes.find(n => n.id === nodeId)
  if (!node) return project
  const yOffset = parent.type === 'video' && (node.type === 'pause' || node.type === 'toaster') ? 60 : 0
  const px = (parent.x ?? 80) + 220
  const py = (parent.y ?? 80) + yOffset
  return {
    ...project,
    nodes: project.nodes.map(n => (n.id === nodeId ? { ...n, x: px, y: py } : n)),
  }
}

function legacyVideoSegment(flow: FlowProject, chapterNode: FlowNode, videos: AdminChapterVideo[]): TimelineVideoSegment | null {
  const chapterId = getChapterIdFromNode(chapterNode)
  if (chapterId == null) return null
  const firstVideo = videos.filter(v => v.chapterId === chapterId).sort((a, b) => a.sortOrder - b.sortOrder)[0]
  if (!firstVideo) return null
  return {
    kind: 'video',
    nodeId: chapterNode.id,
    chapterId,
    videoId: firstVideo.id,
    events: collectVideoEvents(flow, chapterNode.id),
  }
}

function parseChapterBlock(
  flow: FlowProject,
  chapterNode: FlowNode,
  videos: AdminChapterVideo[],
): TimelineChapterRow {
  const chapterId = getChapterIdFromNode(chapterNode) ?? 0
  const segments: ChapterSegment[] = []
  const visited = new Set<string>()
  visited.add(chapterNode.id)

  const enqueueSuccessors = (fromId: string, queue: string[]) => {
    for (const succ of getSpineSuccessors(flow, fromId)) {
      if (stopsChapterBlock(succ)) continue
      if (!visited.has(succ.id)) queue.push(succ.id)
    }
  }

  const queue: string[] = []
  enqueueSuccessors(chapterNode.id, queue)

  while (queue.length > 0) {
    const id = queue.shift()!
    if (visited.has(id)) continue
    const current = flow.nodes.find(n => n.id === id)
    if (!current || stopsChapterBlock(current)) continue

    if (isVideoNode(current)) {
      visited.add(current.id)
      const vid = getVideoIdFromNode(current)
      if (vid != null) {
        segments.push({
          kind: 'video',
          nodeId: current.id,
          chapterId: getChapterIdFromNode(current) ?? chapterId,
          videoId: vid,
          events: collectVideoEvents(flow, current.id),
        })
      }
      const events = collectVideoEvents(flow, current.id)
      const exit = events.length > 0 ? events[events.length - 1].id : current.id
      enqueueSuccessors(exit, queue)
      continue
    }

    if (isChapterInterstitial(current)) {
      visited.add(current.id)
      segments.push({ kind: 'step', node: current })
      enqueueSuccessors(current.id, queue)
      continue
    }

    visited.add(current.id)
    enqueueSuccessors(current.id, queue)
  }

  appendUnvisitedChapterSegments(flow, chapterNode, segments)

  if (segments.length === 0) {
    const legacy = legacyVideoSegment(flow, chapterNode, videos)
    if (legacy) segments.push(legacy)
  }

  return { kind: 'chapter', nodeId: chapterNode.id, chapterId, segments }
}

function markChapterRowVisited(row: TimelineChapterRow, visited: Set<string>): void {
  visited.add(row.nodeId)
  for (const seg of row.segments) {
    if (seg.kind === 'step') {
      visited.add(seg.node.id)
    } else {
      visited.add(seg.nodeId)
      for (const ev of seg.events) visited.add(ev.id)
    }
  }
}

function findRowForNode(timeline: TimelineRow[], nodeId: string): TimelineRow | null {
  for (const row of timeline) {
    if (row.kind === 'step') {
      if (row.node.id === nodeId) return row
      continue
    }
    if (row.nodeId === nodeId) return row
    for (const seg of row.segments) {
      if (seg.kind === 'step' && seg.node.id === nodeId) return row
      if (seg.kind === 'video' && (seg.nodeId === nodeId || seg.events.some(e => e.id === nodeId))) return row
    }
  }
  return null
}

function appendUnvisitedTopLevelRows(
  project: FlowProject,
  visited: Set<string>,
  rows: TimelineRow[],
  videos: AdminChapterVideo[],
): void {
  for (const n of project.nodes) {
    if (visited.has(n.id)) continue
    if (isChapterHeader(n)) {
      const row = parseChapterBlock(project, n, videos)
      markChapterRowVisited(row, visited)
      rows.push(row)
    } else if (isTopLevelStep(n)) {
      visited.add(n.id)
      rows.push({ kind: 'step', node: n })
    }
  }
}

export function projectToTimeline(
  project: FlowProject,
  _chapters: AdminChapter[],
  videos: AdminChapterVideo[],
): TimelineRow[] {
  const rows: TimelineRow[] = []
  const visited = new Set<string>()

  const enqueueSuccessors = (fromId: string, queue: string[]) => {
    for (const succ of getSpineSuccessors(project, fromId)) {
      if (!visited.has(succ.id)) queue.push(succ.id)
    }
  }

  const walkFrom = (startId: string) => {
    const queue: string[] = [startId]
    while (queue.length > 0) {
      const id = queue.shift()!
      if (visited.has(id)) continue
      const current = project.nodes.find(n => n.id === id)
      if (!current) continue

      if (isChapterHeader(current)) {
        const row = parseChapterBlock(project, current, videos)
        markChapterRowVisited(row, visited)
        rows.push(row)
        const exit = getChapterRowExit(project, row, videos)
        enqueueSuccessors(exit, queue)
        continue
      }

      if (isTopLevelStep(current)) {
        visited.add(current.id)
        rows.push({ kind: 'step', node: current })
        enqueueSuccessors(current.id, queue)
        continue
      }

      if (isVideoNode(current)) {
        visited.add(current.id)
        const chId = getChapterIdFromNode(current) ?? 0
        rows.push({
          kind: 'chapter',
          nodeId: `synthetic-ch-${current.id}`,
          chapterId: chId,
          segments: [{
            kind: 'video',
            nodeId: current.id,
            chapterId: chId,
            videoId: getVideoIdFromNode(current) ?? 0,
            events: collectVideoEvents(project, current.id),
          }],
        })
        const events = collectVideoEvents(project, current.id)
        const exit = events.length > 0 ? events[events.length - 1].id : current.id
        enqueueSuccessors(exit, queue)
        continue
      }

      visited.add(current.id)
      enqueueSuccessors(current.id, queue)
    }
  }

  const starts = getStartNodes(project)
  if (starts.length) {
    walkFrom(starts[0].id)
  } else {
    for (const n of project.nodes) {
      if (!visited.has(n.id) && (isChapterHeader(n) || isTopLevelStep(n))) walkFrom(n.id)
    }
  }

  appendUnvisitedTopLevelRows(project, visited, rows, videos)
  return rows
}

function getSegmentExit(flow: FlowProject, seg: ChapterSegment): string {
  if (seg.kind === 'step') return seg.node.id
  const events = collectVideoEvents(flow, seg.nodeId)
  return events.length > 0 ? events[events.length - 1].id : seg.nodeId
}

function getSegmentEntry(seg: ChapterSegment, _chapterNodeId: string): string {
  if (seg.kind === 'step') return seg.node.id
  return seg.nodeId
}

function getChapterRowExit(flow: FlowProject, row: TimelineChapterRow, _videos: AdminChapterVideo[]): string {
  if (row.segments.length === 0) return row.nodeId
  const last = row.segments[row.segments.length - 1]
  return getSegmentExit(flow, last)
}

function getRowEntry(row: TimelineRow): string {
  if (row.kind === 'step') return row.node.id
  return row.nodeId
}

function getRowExit(flow: FlowProject, row: TimelineRow, videos: AdminChapterVideo[]): string {
  if (row.kind === 'step') return row.node.id
  return getChapterRowExit(flow, row, videos)
}

function collectLinearSpinePairs(
  flow: FlowProject,
  timeline: TimelineRow[],
  videos: AdminChapterVideo[],
): FlowConnection[] {
  const pairs: FlowConnection[] = []
  for (let i = 0; i < timeline.length - 1; i++) {
    const exit = getRowExit(flow, timeline[i], videos)
    const entry = getRowEntry(timeline[i + 1])
    if (exit && entry) pairs.push({ from: exit, to: entry })
  }
  pairs.push(...collectChapterInternalPairs(flow, timeline))
  return pairs
}

function collectChapterInternalPairs(flow: FlowProject, timeline: TimelineRow[]): FlowConnection[] {
  const pairs: FlowConnection[] = []
  for (const row of timeline) {
    if (row.kind !== 'chapter') continue
    let prev = row.nodeId
    for (const seg of row.segments) {
      const entry = getSegmentEntry(seg, row.nodeId)
      if (prev !== entry) pairs.push({ from: prev, to: entry })
      prev = getSegmentExit(flow, seg)
    }
  }
  return pairs
}

function collectGraphSpinePairs(
  flow: FlowProject,
  timeline: TimelineRow[],
  videos: AdminChapterVideo[],
): FlowConnection[] {
  const pairs = collectChapterInternalPairs(flow, timeline)
  const pairKeys = new Set(pairs.map(p => `${p.from}->${p.to}`))

  for (const row of timeline) {
    const exit = getRowExit(flow, row, videos)
    for (const succ of getSpineSuccessors(flow, exit)) {
      const targetRow = findRowForNode(timeline, succ.id)
      if (!targetRow) continue
      const entry = getRowEntry(targetRow)
      if (entry === exit) continue
      const key = `${exit}->${entry}`
      if (!pairKeys.has(key)) {
        pairKeys.add(key)
        pairs.push({ from: exit, to: entry })
      }
    }
  }
  return pairs
}

/** @deprecated internal alias — linear spine for explicit row reorder */
function collectSpinePairs(
  flow: FlowProject,
  timeline: TimelineRow[],
  videos: AdminChapterVideo[],
): FlowConnection[] {
  return collectLinearSpinePairs(flow, timeline, videos)
}

export function rebuildSpineConnections(
  project: FlowProject,
  chapters: AdminChapter[],
  videos: AdminChapterVideo[],
): FlowProject {
  const timeline = projectToTimeline(project, chapters, videos)
  const newSpine = collectGraphSpinePairs(project, timeline, videos)
  const spineSet = new Set(newSpine.map(s => `${s.from}->${s.to}`))

  const oldTimeline = projectToTimeline(project, chapters, videos)
  const oldSpine = collectGraphSpinePairs(project, oldTimeline, videos)
  const oldSpineSet = new Set(oldSpine.map(s => `${s.from}->${s.to}`))

  const connections = project.connections.filter(c => {
    const key = `${c.from}->${c.to}`
    if (oldSpineSet.has(key) && !spineSet.has(key)) return false
    return true
  })

  for (const s of newSpine) {
    if (!connections.some(c => c.from === s.from && c.to === s.to)) {
      connections.push(s)
    }
  }

  return { ...project, connections }
}

export function reorderEventsUnderVideo(
  project: FlowProject,
  videoNodeId: string,
  orderedIds: string[],
): FlowProject {
  const events = orderedIds
    .map(id => project.nodes.find(n => n.id === id))
    .filter((n): n is FlowNode => !!n && (n.type === 'pause' || n.type === 'toaster'))

  const eventIdSet = new Set(events.map(e => e.id))
  if (eventIdSet.size === 0) return project

  let afterChain: string | null = null
  for (const ev of events) {
    for (const c of project.connections.filter(x => x.from === ev.id)) {
      const target = project.nodes.find(n => n.id === c.to)
      if (target && !eventIdSet.has(c.to)) {
        afterChain = c.to
        break
      }
    }
    if (afterChain) break
  }
  if (!afterChain) {
    for (const c of project.connections.filter(x => x.from === videoNodeId)) {
      if (!eventIdSet.has(c.to)) {
        const target = project.nodes.find(n => n.id === c.to)
        if (target && target.type !== 'pause' && target.type !== 'toaster') {
          afterChain = c.to
        }
      }
    }
  }

  const connections = project.connections.filter(c => {
    if (eventIdSet.has(c.from) && eventIdSet.has(c.to)) return false
    if (c.from === videoNodeId && eventIdSet.has(c.to)) return false
    if (eventIdSet.has(c.from) && !eventIdSet.has(c.to)) return false
    if (c.from === videoNodeId && c.to === afterChain && events.length > 0) return false
    return true
  })

  let prev = videoNodeId
  for (const ev of events) {
    connections.push({ from: prev, to: ev.id })
    prev = ev.id
  }
  if (afterChain) connections.push({ from: prev, to: afterChain })

  return { ...project, connections }
}

export function reorderVideosInChapter(
  project: FlowProject,
  chapterNodeId: string,
  orderedVideoIds: string[],
  chapters: AdminChapter[],
  videos: AdminChapterVideo[],
): FlowProject {
  const chapterNode = project.nodes.find(n => n.id === chapterNodeId)
  if (!chapterNode) return project

  const row = parseChapterBlock(project, chapterNode, videos)
  const videoSegs = row.segments.filter((s): s is TimelineVideoSegment => s.kind === 'video')
  const byId = new Map(videoSegs.map(s => [s.nodeId, s]))
  const reorderedVideos = orderedVideoIds.map(id => byId.get(id)).filter((s): s is TimelineVideoSegment => !!s)

  const newSegments: ChapterSegment[] = []
  let vi = 0
  for (const seg of row.segments) {
    if (seg.kind === 'video') {
      if (reorderedVideos[vi]) newSegments.push(reorderedVideos[vi])
      vi++
    } else {
      newSegments.push(seg)
    }
  }

  return rewireChapterBlock(project, chapterNodeId, newSegments, chapters, videos)
}

function rewireChapterBlock(
  project: FlowProject,
  chapterNodeId: string,
  segments: ChapterSegment[],
  chapters: AdminChapter[],
  videos: AdminChapterVideo[],
): FlowProject {
  const chapterNode = project.nodes.find(n => n.id === chapterNodeId)
  if (!chapterNode) return project

  const oldRow = parseChapterBlock(project, chapterNode, videos)
  const oldInternal: FlowConnection[] = []
  let prev = chapterNodeId
  for (const seg of oldRow.segments) {
    const entry = getSegmentEntry(seg, chapterNodeId)
    const exit = getSegmentExit(project, seg)
    if (prev !== entry) oldInternal.push({ from: prev, to: entry })
    if (seg.kind === 'video') {
      const events = collectVideoEvents(project, seg.nodeId)
      let ep = seg.nodeId
      for (const ev of events) {
        oldInternal.push({ from: ep, to: ev.id })
        ep = ev.id
      }
    }
    prev = exit
  }
  const oldInternalSet = new Set(oldInternal.map(c => `${c.from}->${c.to}`))

  let connections = project.connections.filter(c => !oldInternalSet.has(`${c.from}->${c.to}`))

  prev = chapterNodeId
  for (const seg of segments) {
    const entry = getSegmentEntry(seg, chapterNodeId)
    const exit = getSegmentExit(project, seg)
    if (prev !== entry && !connections.some(c => c.from === prev && c.to === entry)) {
      connections.push({ from: prev, to: entry })
    }
    if (seg.kind === 'video') {
      const events = collectVideoEvents(project, seg.nodeId)
      let ep = seg.nodeId
      for (const ev of events) {
        if (!connections.some(c => c.from === ep && c.to === ev.id)) {
          connections.push({ from: ep, to: ev.id })
        }
        ep = ev.id
      }
    }
    prev = exit
  }

  const timeline = projectToTimeline({ ...project, connections }, chapters, videos)
  return rebuildSpineConnections(
    applyTopLevelOrder({ ...project, connections }, timeline, chapters, videos),
    chapters,
    videos,
  )
}

export function applyTopLevelOrder(
  project: FlowProject,
  orderedRows: TimelineRow[],
  chapters: AdminChapter[],
  videos: AdminChapterVideo[],
): FlowProject {
  const timeline = projectToTimeline(project, chapters, videos)
  const oldSpine = collectSpinePairs(project, timeline, videos)
  const newSpine = collectSpinePairs(project, orderedRows, videos)
  const oldSpineSet = new Set(oldSpine.map(s => `${s.from}->${s.to}`))
  const newSpineSet = new Set(newSpine.map(s => `${s.from}->${s.to}`))

  const connections = project.connections.filter(c => {
    const key = `${c.from}->${c.to}`
    return !(oldSpineSet.has(key) && !newSpineSet.has(key))
  })
  for (const s of newSpine) {
    if (!connections.some(c => c.from === s.from && c.to === s.to)) {
      connections.push(s)
    }
  }
  return { ...project, connections }
}

export type TimelineEdit =
  | { type: 'remove'; nodeId: string }
  | { type: 'insert'; node: FlowNode; target: Parameters<typeof insertNodeInTimeline>[4] }
  | { type: 'reorderEvents'; videoNodeId: string; orderedIds: string[] }
  | { type: 'reorderTopLevel'; activeRowKey: string; overRowKey: string }
  | { type: 'reorderVideos'; chapterNodeId: string; orderedVideoIds: string[] }
  | { type: 'reorderChapterSegment'; chapterNodeId: string; segmentNodeId: string; overSegmentNodeId: string }
  | { type: 'moveNodeToVideo'; nodeId: string; videoNodeId: string }
  | { type: 'moveIntoChapter'; nodeId: string; chapterNodeId: string; afterVideoNodeId?: string }
  | { type: 'moveToTopLevel'; nodeId: string }

export function canNestInChapter(node: FlowNode): boolean {
  return isChapterInterstitial(node) || node.type === 'video'
}

export function resolveTimelineDragId(id: string): string {
  if (id.startsWith('step:')) return id.slice(5)
  if (id.startsWith('video:')) return id.slice(6)
  if (id.startsWith('chapter:')) return id.slice(8)
  return id
}

export function segmentSortableId(seg: ChapterSegment): string {
  return seg.kind === 'video' ? `video:${seg.nodeId}` : `step:${seg.node.id}`
}

export function rowKey(row: TimelineRow): string {
  if (row.kind === 'step') return `step:${row.node.id}`
  return `chapter:${row.nodeId}`
}

export function applyTimelineEdit(
  project: FlowProject,
  edit: TimelineEdit,
  chapters: AdminChapter[],
  videos: AdminChapterVideo[],
): FlowProject {
  switch (edit.type) {
    case 'remove':
      return removeNodeFromProject(project, edit.nodeId)
    case 'insert': {
      let next = insertNodeInTimeline(project, chapters, videos, edit.node, edit.target)
      next = rebuildSpineConnections(next, chapters, videos)
      const parentId = resolveParentIdForInsert(next, edit.node.id, edit.target)
      return positionNewNode(next, edit.node.id, parentId)
    }
    case 'reorderEvents':
      return reorderEventsUnderVideo(project, edit.videoNodeId, edit.orderedIds)
    case 'reorderVideos':
      return reorderVideosInChapter(project, edit.chapterNodeId, edit.orderedVideoIds, chapters, videos)
    case 'moveNodeToVideo': {
      let next = removeNodeFromProject(project, edit.nodeId)
      const node = project.nodes.find(n => n.id === edit.nodeId)
      if (!node || (node.type !== 'pause' && node.type !== 'toaster')) return next
      next = { ...next, nodes: [...next.nodes, node] }
      next = insertNodeInTimeline(next, chapters, videos, node, { scope: 'video', videoNodeId: edit.videoNodeId })
      next = rebuildSpineConnections(next, chapters, videos)
      return positionNewNode(next, node.id, edit.videoNodeId)
    }
    case 'moveIntoChapter': {
      const node = project.nodes.find(n => n.id === edit.nodeId)
      const chapterNode = project.nodes.find(n => n.id === edit.chapterNodeId)
      if (!node || !chapterNode || chapterNode.type !== 'chapter') return project
      if (!isChapterInterstitial(node) && node.type !== 'video') return project

      const row = parseChapterBlock(project, chapterNode, videos)
      let fromNode: FlowNode | undefined = chapterNode
      if (edit.afterVideoNodeId) {
        const seg = row.segments.find(s => s.kind === 'video' && s.nodeId === edit.afterVideoNodeId)
        if (seg?.kind === 'video') {
          fromNode = project.nodes.find(n => n.id === seg.nodeId)
        }
      } else if (row.segments.length > 0) {
        const last = row.segments[row.segments.length - 1]
        const fromId = last.kind === 'video' ? last.nodeId : last.node.id
        fromNode = project.nodes.find(n => n.id === fromId)
      }
      if (fromNode && !canConnect(fromNode, node)) return project

      let afterSegmentIndex: number | undefined
      if (edit.afterVideoNodeId) {
        const row = parseChapterBlock(project, chapterNode, videos)
        const idx = row.segments.findIndex(
          s => s.kind === 'video' && s.nodeId === edit.afterVideoNodeId,
        )
        afterSegmentIndex = idx >= 0 ? idx : row.segments.length - 1
      }

      let next = removeNodeFromProject(project, edit.nodeId)
      next = { ...next, nodes: [...next.nodes, node] }
      next = insertNodeInTimeline(next, chapters, videos, node, {
        scope: 'chapter',
        chapterNodeId: edit.chapterNodeId,
        afterSegmentIndex,
      })
      return rebuildSpineConnections(next, chapters, videos)
    }
    case 'moveToTopLevel': {
      const node = project.nodes.find(n => n.id === edit.nodeId)
      if (!node || (!isTopLevelStep(node) && node.type !== 'video')) return project
      let next = removeNodeFromProject(project, edit.nodeId)
      next = { ...next, nodes: [...next.nodes, node] }
      next = insertNodeInTimeline(next, chapters, videos, node, { scope: 'top' })
      return rebuildSpineConnections(next, chapters, videos)
    }
    case 'reorderChapterSegment': {
      const chapterNode = project.nodes.find(n => n.id === edit.chapterNodeId)
      if (!chapterNode) return project
      const row = parseChapterBlock(project, chapterNode, videos)
      const segmentIds = row.segments.map(s => (s.kind === 'video' ? s.nodeId : s.node.id))
      const oldIndex = segmentIds.indexOf(edit.segmentNodeId)
      const newIndex = segmentIds.indexOf(edit.overSegmentNodeId)
      if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return project
      const reordered = [...row.segments]
      const [moved] = reordered.splice(oldIndex, 1)
      reordered.splice(newIndex, 0, moved)
      return rewireChapterBlock(project, edit.chapterNodeId, reordered, chapters, videos)
    }
    case 'reorderTopLevel': {
      const timeline = projectToTimeline(project, chapters, videos)
      const keys = timeline.map(rowKey)
      const oldIndex = keys.indexOf(edit.activeRowKey)
      const newIndex = keys.indexOf(edit.overRowKey)
      if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return project
      const reordered = [...timeline]
      const [moved] = reordered.splice(oldIndex, 1)
      reordered.splice(newIndex, 0, moved)
      return applyTopLevelOrder(project, reordered, chapters, videos)
    }
    default:
      return project
  }
}

export function autoLayoutProject(
  project: FlowProject,
  chapters: AdminChapter[],
  videos: AdminChapterVideo[],
): FlowProject {
  const timeline = projectToTimeline(project, chapters, videos)
  const nodeById = new Map(project.nodes.map(n => [n.id, n]))
  let x = 80
  let y = 80

  const nodes = project.nodes.map(n => ({ ...n }))

  const setPos = (id: string, px: number, py: number) => {
    const node = nodes.find(n => n.id === id)
    if (node) {
      node.x = px
      node.y = py
    } else if (nodeById.has(id)) {
      const src = nodeById.get(id)!
      nodes.push({ ...src, x: px, y: py })
    }
  }

  for (const row of timeline) {
    if (row.kind === 'step') {
      setPos(row.node.id, x, y)
      x += 220
      continue
    }
    if (!row.nodeId.startsWith('synthetic-')) setPos(row.nodeId, x, y)
    x += 220
    for (const seg of row.segments) {
      if (seg.kind === 'step') {
        setPos(seg.node.id, x, y)
        x += 200
        continue
      }
      setPos(seg.nodeId, x, y + 40)
      x += 200
      for (const ev of seg.events) {
        setPos(ev.id, x, y + 100)
        x += 160
      }
    }
  }

  const laidOut = { ...project, nodes }
  return rebuildSpineConnections(laidOut, chapters, videos)
}

export function layoutGraphFromTimeline(
  _timeline: TimelineRow[],
  existing: FlowProject,
  chapters: AdminChapter[] = [],
  videos: AdminChapterVideo[] = [],
): FlowProject {
  return autoLayoutProject(existing, chapters, videos)
}

export function insertNodeInTimeline(
  project: FlowProject,
  chapters: AdminChapter[],
  videos: AdminChapterVideo[],
  node: FlowNode,
  target: { scope: 'top'; afterRowIndex?: number }
    | { scope: 'chapter'; chapterNodeId: string; afterSegmentIndex?: number }
    | { scope: 'video'; videoNodeId: string },
): FlowProject {
  const next = { ...project, nodes: [...project.nodes], connections: [...project.connections] }

  if (target.scope === 'video' && (node.type === 'pause' || node.type === 'toaster')) {
    const events = collectVideoEvents(next, target.videoNodeId)
    const lastEvent = events[events.length - 1]
    const fromId = lastEvent?.id ?? target.videoNodeId
    next.nodes.push(node)
    next.connections.push({ from: fromId, to: node.id })
    return next
  }

  if (target.scope === 'chapter' && node.type === 'video') {
    next.nodes.push(node)
    const chapterNode = next.nodes.find(n => n.id === target.chapterNodeId)
    if (!chapterNode) return next
    const segs = parseChapterBlock(next, chapterNode, videos).segments
    const idx = target.afterSegmentIndex ?? segs.length - 1
    const seg = segs[idx]
    const fromId = seg?.kind === 'video' ? seg.nodeId : chapterNode.id
    next.connections.push({ from: fromId, to: node.id })
    const after = getNextTraversalNode(next, fromId)
    if (after && after.id !== node.id && after.type !== 'video') {
      next.connections.push({ from: node.id, to: after.id })
      next.connections = next.connections.filter(c => !(c.from === fromId && c.to === after.id))
    }
    return next
  }

  if (target.scope === 'chapter' && (isChapterInterstitial(node) || node.type === 'video')) {
    next.nodes.push(node)
    const chapterNode = next.nodes.find(n => n.id === target.chapterNodeId)
    if (!chapterNode) return next
    const segs = parseChapterBlock(next, chapterNode, videos).segments
    const idx = target.afterSegmentIndex ?? segs.length - 1
    const seg = segs[idx]
    const fromId = seg?.kind === 'video' ? seg.nodeId : chapterNode.id
    next.connections.push({ from: fromId, to: node.id })
    const after = getNextTraversalNode(next, fromId)
    if (after && after.id !== node.id) {
      next.connections.push({ from: node.id, to: after.id })
      next.connections = next.connections.filter(c => !(c.from === fromId && c.to === after.id && c.from !== node.id))
    }
    return next
  }

  next.nodes.push(node)
  const timeline = projectToTimeline(next, chapters, videos)
  const rowIndex = target.scope === 'top' ? (target.afterRowIndex ?? timeline.length - 1) : timeline.length - 1
  const prevRow = timeline[rowIndex]
  let fromId: string | null = null
  if (prevRow?.kind === 'step') fromId = prevRow.node.id
  else if (prevRow?.kind === 'chapter') {
    const lastSeg = prevRow.segments[prevRow.segments.length - 1]
    fromId = lastSeg?.kind === 'video' ? lastSeg.nodeId : prevRow.nodeId
  }
  if (fromId) next.connections.push({ from: fromId, to: node.id })
  else if (next.nodes.length === 1) { /* first node */ }
  else {
    const orphan = next.nodes.find(n => n.id !== node.id && !next.connections.some(c => c.to === n.id))
    if (orphan) next.connections.push({ from: orphan.id, to: node.id })
  }
  return next
}

export function removeNodeFromProject(project: FlowProject, nodeId: string): FlowProject {
  const nodes = project.nodes.filter(n => n.id !== nodeId)
  const connections = project.connections.filter(c => c.from !== nodeId && c.to !== nodeId)
  const incoming = project.connections.filter(c => c.to === nodeId)
  const outgoing = project.connections.filter(c => c.from === nodeId)
  for (const inc of incoming) {
    for (const out of outgoing) {
      if (!connections.some(c => c.from === inc.from && c.to === out.to)) {
        connections.push({ from: inc.from, to: out.to })
      }
    }
  }
  return { ...project, nodes, connections }
}

export function chapterLabel(chapterId: number, chapters: AdminChapter[]): string {
  return chapters.find(c => c.id === chapterId)?.name ?? `Chapter #${chapterId}`
}

export function videoLabel(videoId: number, videos: AdminChapterVideo[]): string {
  const v = videos.find(x => x.id === videoId)
  return v ? `${v.title}${v.duration ? ` (${v.duration})` : ''}` : `Video #${videoId}`
}

export function nodeSummary(node: FlowNode): string {
  switch (node.type) {
    case 'intro': return getNodeHeading(node)
    case 'outro': return getNodeHeading(node)
    case 'question': return (node.parameters.prompt as string) || node.name
    case 'branch': return `Branch on ${node.parameters.sourceField || 'field'}`
    case 'chapter': return 'Chapter block'
    case 'video': return 'Video'
    case 'toaster': return (node.parameters.title as string) || 'Pop-up'
    case 'pause': return (node.parameters.prompt as string) || 'Pause question'
    case 'aichat': return (node.parameters.heading as string) || 'AI chat'
    case 'event': return (node.parameters.holdingHeading as string) || 'Event'
    default: return node.name
  }
}

function getNodeHeading(node: FlowNode): string {
  return (node.parameters.heading as string) || node.name
}

export function ensureLegacyChapterVideos(
  project: FlowProject,
  videos: AdminChapterVideo[],
): FlowProject {
  let changed = false
  const nodes = [...project.nodes]
  const connections = [...project.connections]

  for (const n of project.nodes) {
    if (n.type !== 'chapter') continue
    const chapterId = getChapterIdFromNode(n)
    if (chapterId == null) continue
    const hasVideoChild = getNextNodes(project, n.id).some(x => x.type === 'video')
    if (hasVideoChild) continue
    const firstVideo = videos.filter(v => v.chapterId === chapterId).sort((a, b) => a.sortOrder - b.sortOrder)[0]
    if (!firstVideo) continue
    const vid = newNode('video', firstVideo.title)
    vid.parameters = { chapterId, videoId: firstVideo.id }
    nodes.push(vid)
    connections.push({ from: n.id, to: vid.id })
    for (const c of project.connections.filter(c => c.from === n.id && project.nodes.find(x => x.id === c.to)?.type !== 'toaster' && project.nodes.find(x => x.id === c.to)?.type !== 'pause')) {
      const target = project.nodes.find(x => x.id === c.to)
      if (target && !isPlaybackTriggerNode(target)) {
        connections.push({ from: vid.id, to: c.to })
        const idx = connections.findIndex(x => x.from === n.id && x.to === c.to)
        if (idx >= 0) connections.splice(idx, 1)
      }
    }
    changed = true
  }

  return changed ? { ...project, nodes, connections } : project
}
