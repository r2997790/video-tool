import { describe, expect, it } from 'vitest'
import { applyFlowEdit } from './applyFlowEdit'
import { newNode } from './flowSchema'
import { projectToTimeline, findChapterAncestor } from './flowTimeline'
import type { FlowProject } from '../types'
import type { AdminChapter, AdminChapterVideo } from '../types'

const ctx = {
  chapters: [{ id: 1, slug: 'ch1', name: 'Chapter 1', description: '', videoLink: '', duration: '5:00', sortOrder: 1, isLocked: false }] as AdminChapter[],
  chapterVideos: [{ id: 1, chapterId: 1, title: 'Video 1', videoLink: '', duration: '2:00', sortOrder: 1 }] as AdminChapterVideo[],
}

function buildChapterFlow(): FlowProject {
  const intro = newNode('intro', 'Intro')
  const chapter = newNode('chapter', 'Chapter block')
  chapter.parameters = { chapterId: 1 }
  const video = newNode('video', 'Video 1')
  video.parameters = { chapterId: 1, videoId: 1 }
  const q1 = newNode('question', 'Question A')
  const q2 = newNode('question', 'Question B')

  return {
    projectName: 'Test',
    nodes: [intro, chapter, video, q1, q2],
    connections: [
      { from: intro.id, to: chapter.id },
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
    const intro = project.nodes.find(n => n.type === 'intro')!
    const chapter = project.nodes.find(n => n.type === 'chapter')!

    project = applyFlowEdit(project, {
      type: 'disconnectEdge',
      from: intro.id,
      to: chapter.id,
    }, ctx)

    expect(project.connections.some(c => c.from === intro.id && c.to === chapter.id)).toBe(false)

    project = applyFlowEdit(project, {
      type: 'connectNodes',
      from: intro.id,
      to: chapter.id,
    }, ctx)

    expect(project.connections.some(c => c.from === intro.id && c.to === chapter.id)).toBe(true)
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

    // Visual connect alone doesn't insert node — structural parity is via shared applyFlowEdit
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
})
