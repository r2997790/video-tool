import { describe, expect, it } from 'vitest'
import { applyFlowEdit } from './applyFlowEdit'
import { newNode } from './flowSchema'
import { projectToTimeline, findChapterAncestor, resolveInsertTarget, reorderEventsUnderVideo, collectVideoEvents } from './flowTimeline'
import type { FlowProject } from '../types'
import type { AdminChapter, AdminChapterVideo } from '../types'

const ctx = {
  chapters: [{ id: 1, slug: 'ch1', name: 'Chapter 1', description: '', videoLink: '', duration: '5:00', sortOrder: 1, isLocked: false }] as AdminChapter[],
  chapterVideos: [{ id: 1, chapterId: 1, title: 'Video 1', videoLink: '', duration: '2:00', sortOrder: 1 }] as AdminChapterVideo[],
}

function buildChapterFlow(): FlowProject {
  const start = newNode('question', 'Start')
  const chapter = newNode('chapter', 'Chapter block')
  chapter.parameters = { chapterId: 1 }
  const video = newNode('video', 'Video 1')
  video.parameters = { chapterId: 1, videoId: 1 }
  const q1 = newNode('question', 'Question A')
  const q2 = newNode('question', 'Question B')

  return {
    projectName: 'Test',
    nodes: [start, chapter, video, q1, q2],
    connections: [
      { from: start.id, to: chapter.id },
      { from: chapter.id, to: video.id },
      { from: video.id, to: q1.id },
      { from: q1.id, to: q2.id },
    ],
  }
}

describe('applyFlowEdit sync', () => {
  it('inserts two questions in same chapter via timeline edits', () => {
    let project = buildChapterFlow()
    const chapter = project.nodes.find(n => n.type === 'chapter')!
    const video = project.nodes.find(n => n.type === 'video')!

    const q3 = newNode('question', 'Question C')
    project = applyFlowEdit(project, {
      type: 'insert',
      node: q3,
      target: { scope: 'chapter', chapterNodeId: chapter.id, afterSegmentIndex: 0 },
    }, ctx)

    const timeline = projectToTimeline(project, ctx.chapters, ctx.chapterVideos)
    const chapterRow = timeline.find(r => r.kind === 'chapter')
    expect(chapterRow?.kind).toBe('chapter')
    if (chapterRow?.kind === 'chapter') {
      const stepNodes = chapterRow.segments.filter(s => s.kind === 'step')
      expect(stepNodes.length).toBeGreaterThanOrEqual(2)
    }

    expect(findChapterAncestor(project, q3.id)?.id).toBe(chapter.id)
    expect(findChapterAncestor(project, video.id)?.id).toBe(chapter.id)
  })

  it('connectNodes and disconnectEdge produce consistent spine', () => {
    let project = buildChapterFlow()
    const start = project.nodes.find(n => n.name === 'Start')!
    const chapter = project.nodes.find(n => n.type === 'chapter')!

    project = applyFlowEdit(project, {
      type: 'disconnectEdge',
      from: start.id,
      to: chapter.id,
    }, ctx)

    expect(project.connections.some(c => c.from === start.id && c.to === chapter.id)).toBe(false)

    project = applyFlowEdit(project, {
      type: 'connectNodes',
      from: start.id,
      to: chapter.id,
    }, ctx)

    expect(project.connections.some(c => c.from === start.id && c.to === chapter.id)).toBe(true)
  })

  it('moveIntoChapter and moveToTopLevel round-trip', () => {
    let project = buildChapterFlow()
    const chapter = project.nodes.find(n => n.type === 'chapter')!
    const q = project.nodes.find(n => n.name === 'Question A')!

    project = applyFlowEdit(project, {
      type: 'moveToTopLevel',
      nodeId: q.id,
    }, ctx)

    expect(findChapterAncestor(project, q.id)).toBeNull()

    project = applyFlowEdit(project, {
      type: 'moveIntoChapter',
      nodeId: q.id,
      chapterNodeId: chapter.id,
    }, ctx)

    expect(findChapterAncestor(project, q.id)?.id).toBe(chapter.id)
  })

  it('moveNodesIntoChapter preserves order', () => {
    let project = buildChapterFlow()
    const chapter = project.nodes.find(n => n.type === 'chapter')!
    const q1 = project.nodes.find(n => n.name === 'Question A')!
    const q2 = project.nodes.find(n => n.name === 'Question B')!

    project = applyFlowEdit(project, { type: 'moveToTopLevel', nodeId: q1.id }, ctx)
    project = applyFlowEdit(project, { type: 'moveToTopLevel', nodeId: q2.id }, ctx)

    project = applyFlowEdit(project, {
      type: 'moveNodesIntoChapter',
      nodeIds: [q2.id, q1.id],
      chapterNodeId: chapter.id,
    }, ctx)

    expect(findChapterAncestor(project, q1.id)?.id).toBe(chapter.id)
    expect(findChapterAncestor(project, q2.id)?.id).toBe(chapter.id)
  })

  it('visual connect path matches timeline insert for nested question', () => {
    const project = buildChapterFlow()
    const chapter = project.nodes.find(n => n.type === 'chapter')!
    const video = project.nodes.find(n => n.type === 'video')!

    const viaTimeline = applyFlowEdit(project, {
      type: 'insert',
      node: (() => { const n = newNode('question', 'Via timeline'); return n })(),
      target: { scope: 'chapter', chapterNodeId: chapter.id, afterSegmentIndex: 0 },
    }, ctx)

    const viaVisual = applyFlowEdit(project, {
      type: 'connectNodes',
      from: video.id,
      to: (() => { const n = newNode('question', 'Via visual'); return n.id })(),
    }, ctx)

    const newQ = newNode('question', 'Shared')
    const viaInsert = applyFlowEdit(project, {
      type: 'insert',
      node: newQ,
      target: { scope: 'chapter', chapterNodeId: chapter.id },
    }, ctx)

    expect(findChapterAncestor(viaInsert, newQ.id)?.id).toBe(chapter.id)
    expect(viaTimeline.nodes.length).toBeGreaterThan(project.nodes.length)
    expect(viaVisual.connections.length).toBeGreaterThanOrEqual(project.connections.length)
  })

  it('connectNodes from video sets placement during on question', () => {
    let project = buildChapterFlow()
    const video = project.nodes.find(n => n.type === 'video')!
    const q = newNode('question', 'During question')
    project = { ...project, nodes: [...project.nodes, q] }

    project = applyFlowEdit(project, {
      type: 'connectNodes',
      from: video.id,
      to: q.id,
    }, ctx)

    expect(project.nodes.find(n => n.id === q.id)?.parameters.placement).toBe('during')
  })

  it('resolveInsertTarget targets parent video when during-event is selected', () => {
    let project = buildChapterFlow()
    const video = project.nodes.find(n => n.type === 'video')!
    const pause = newNode('pause', 'Pause')
    project = applyFlowEdit(project, {
      type: 'insert',
      node: pause,
      target: { scope: 'video', videoNodeId: video.id },
    }, ctx)

    const inserted = project.nodes.find(n => n.name === 'Pause')!
    const target = resolveInsertTarget(project, inserted, 'toaster', ctx.chapterVideos)
    expect(target).toEqual({ scope: 'video', videoNodeId: video.id })
  })

  it('reorderEventsUnderVideo rewires question nodes in event chain', () => {
    let project = buildChapterFlow()
    const video = project.nodes.find(n => n.type === 'video')!
    const q1 = newNode('question', 'Q during 1')
    q1.parameters = { placement: 'during', triggerAtSeconds: 10 }
    const q2 = newNode('question', 'Q during 2')
    q2.parameters = { placement: 'during', triggerAtSeconds: 20 }
    project = applyFlowEdit(project, {
      type: 'insert',
      node: q1,
      target: { scope: 'video', videoNodeId: video.id },
    }, ctx)
    project = applyFlowEdit(project, {
      type: 'insert',
      node: q2,
      target: { scope: 'video', videoNodeId: video.id },
    }, ctx)

    const q1Node = project.nodes.find(n => n.name === 'Q during 1')!
    const q2Node = project.nodes.find(n => n.name === 'Q during 2')!
    project = reorderEventsUnderVideo(project, video.id, [q2Node.id, q1Node.id])

    const fromVideo = project.connections.filter(c => c.from === video.id).map(c => c.to)
    expect(fromVideo).toContain(q2Node.id)
    expect(project.connections.some(c => c.from === q2Node.id && c.to === q1Node.id)).toBe(true)
  })

  it('updatePositions does not change connections', () => {
    const project = buildChapterFlow()
    const node = project.nodes[0]
    const connCount = project.connections.length

    const next = applyFlowEdit(project, {
      type: 'updatePositions',
      positions: [{ nodeId: node.id, x: 200, y: 300 }],
    }, ctx)

    expect(next.connections.length).toBe(connCount)
    expect(next.nodes.find(n => n.id === node.id)?.x).toBe(200)
    expect(next.nodes.find(n => n.id === node.id)?.y).toBe(300)
  })

  it('disconnectEdge removes video to pause event-chain link without restoring it', () => {
    let project = buildChapterFlow()
    const video = project.nodes.find(n => n.type === 'video')!
    const pause = newNode('pause', 'Pause 1')
    project = applyFlowEdit(project, {
      type: 'insert',
      node: pause,
      target: { scope: 'video', videoNodeId: video.id },
    }, ctx)

    const pauseNode = project.nodes.find(n => n.name === 'Pause 1')!
    expect(collectVideoEvents(project, video.id).map(n => n.id)).toContain(pauseNode.id)

    project = applyFlowEdit(project, {
      type: 'disconnectEdge',
      from: video.id,
      to: pauseNode.id,
    }, ctx)

    expect(project.connections.some(c => c.from === video.id && c.to === pauseNode.id)).toBe(false)
    expect(collectVideoEvents(project, video.id).map(n => n.id)).not.toContain(pauseNode.id)
  })

  it('supports multiple pause nodes chained under one video', () => {
    let project = buildChapterFlow()
    const video = project.nodes.find(n => n.type === 'video')!
    const pause1 = newNode('pause', 'Pause A')
    pause1.parameters = { ...pause1.parameters, triggerAtSeconds: 10 }
    const pause2 = newNode('pause', 'Pause B')
    pause2.parameters = { ...pause2.parameters, triggerAtSeconds: 30 }

    project = applyFlowEdit(project, { type: 'insert', node: pause1, target: { scope: 'video', videoNodeId: video.id } }, ctx)
    project = applyFlowEdit(project, { type: 'insert', node: pause2, target: { scope: 'video', videoNodeId: video.id } }, ctx)

    const events = collectVideoEvents(project, video.id).filter(n => n.type === 'pause')
    expect(events).toHaveLength(2)
    expect(events.map(n => n.name)).toEqual(['Pause A', 'Pause B'])
  })

  it('resolveInsertTarget rejects top-level pause insert', () => {
    const project = buildChapterFlow()
    const target = resolveInsertTarget(project, null, 'pause', ctx.chapterVideos)
    expect(target).toEqual({ scope: 'reject', message: 'Place Pause & Ask on a video (during playback).' })
  })
})
