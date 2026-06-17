import { describe, expect, it } from 'vitest'
import {
  dropTargetToEdit,
  dropTargetToInsertTarget,
  isFreePositionNode,
  projectToGraph,
  resolveInsertDropTarget,
} from './flowGraphLayout'
import { newNode } from './flowSchema'
import { projectToTimeline } from './flowTimeline'
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
  chapter.x = 400
  chapter.y = 200
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

describe('flowGraphLayout', () => {
  it('isFreePositionNode returns true for chapters and top-level nodes only', () => {
    const project = buildChapterFlow()
    const chapter = project.nodes.find(n => n.type === 'chapter')!
    const intro = project.nodes.find(n => n.type === 'intro')!
    const q = project.nodes.find(n => n.name === 'Question A')!

    expect(isFreePositionNode(project, chapter.id)).toBe(true)
    expect(isFreePositionNode(project, intro.id)).toBe(true)
    expect(isFreePositionNode(project, q.id)).toBe(false)
  })

  it('projectToGraph preserves chapter x/y coordinates', () => {
    const project = buildChapterFlow()
    const chapter = project.nodes.find(n => n.type === 'chapter')!
    const graph = projectToGraph(project, ctx.chapters, ctx.chapterVideos)
    const group = graph.find(n => n.id === chapter.id)
    expect(group?.position).toEqual({ x: 400, y: 200 })
  })

  it('dropTargetToEdit reorders segment to end of chapter', () => {
    const project = buildChapterFlow()
    const chapter = project.nodes.find(n => n.type === 'chapter')!
    const q1 = project.nodes.find(n => n.name === 'Question A')!
    const q2 = project.nodes.find(n => n.name === 'Question B')!

    const edit = dropTargetToEdit(q1.id, {
      scope: 'chapter',
      chapterNodeId: chapter.id,
      afterSegmentIndex: 2,
    }, project, ctx.chapterVideos)

    expect(edit).toEqual({
      type: 'reorderChapterSegment',
      chapterNodeId: chapter.id,
      segmentNodeId: q1.id,
      overSegmentNodeId: q2.id,
    })
  })

  it('dropTargetToEdit reorders segment to start of chapter', () => {
    const project = buildChapterFlow()
    const chapter = project.nodes.find(n => n.type === 'chapter')!
    const video = project.nodes.find(n => n.type === 'video')!
    const q2 = project.nodes.find(n => n.name === 'Question B')!

    const edit = dropTargetToEdit(q2.id, {
      scope: 'chapter',
      chapterNodeId: chapter.id,
      afterSegmentIndex: undefined,
    }, project, ctx.chapterVideos)

    expect(edit).toEqual({
      type: 'reorderChapterSegment',
      chapterNodeId: chapter.id,
      segmentNodeId: q2.id,
      overSegmentNodeId: video.id,
    })
  })

  it('dropTargetToInsertTarget maps scopes', () => {
    expect(dropTargetToInsertTarget({ scope: 'top' })).toEqual({ scope: 'top' })
    expect(dropTargetToInsertTarget({
      scope: 'chapter',
      chapterNodeId: 'ch-1',
      afterSegmentIndex: 1,
    })).toEqual({
      scope: 'chapter',
      chapterNodeId: 'ch-1',
      afterSegmentIndex: 1,
    })
    expect(dropTargetToInsertTarget({
      scope: 'video',
      videoNodeId: 'vid-1',
    })).toEqual({
      scope: 'video',
      videoNodeId: 'vid-1',
    })
  })

  it('resolveInsertDropTarget returns top scope for chapter outside groups', () => {
    const project = buildChapterFlow()
    const graph = projectToGraph(project, ctx.chapters, ctx.chapterVideos)

    const target = resolveInsertDropTarget(
      project,
      { x: 50, y: 50 },
      'chapter',
      graph,
      ctx.chapters,
      ctx.chapterVideos,
    )

    expect(target).toEqual({ scope: 'top' })
  })

  it('resolveInsertDropTarget returns chapter scope when dropped inside group', () => {
    const project = buildChapterFlow()
    const graph = projectToGraph(project, ctx.chapters, ctx.chapterVideos)
    const chapter = project.nodes.find(n => n.type === 'chapter')!
    const group = graph.find(n => n.id === chapter.id)!

    const target = resolveInsertDropTarget(
      project,
      { x: group!.position.x + 40, y: group!.position.y + 120 },
      'question',
      graph,
      ctx.chapters,
      ctx.chapterVideos,
    )

    expect(target?.scope).toBe('chapter')
    expect(target?.scope === 'chapter' && target.chapterNodeId).toBe(chapter.id)
  })
})

describe('applyFlowEdit position guards', () => {
  it('updatePositions does not mutate nested-in-chapter node coordinates', async () => {
    const { applyFlowEdit } = await import('./applyFlowEdit')
    const project = buildChapterFlow()
    const q = project.nodes.find(n => n.name === 'Question A')!
    const originalX = q.x
    const originalY = q.y

    const next = applyFlowEdit(project, {
      type: 'updatePositions',
      positions: [{ nodeId: q.id, x: 999, y: 888 }],
    }, ctx)

    const updated = next.nodes.find(n => n.id === q.id)
    expect(updated?.x).toBe(originalX)
    expect(updated?.y).toBe(originalY)
  })

  it('chapter position survives timeline rebuild', () => {
    const project = buildChapterFlow()
    const chapter = project.nodes.find(n => n.type === 'chapter')!
    const timeline = projectToTimeline(project, ctx.chapters, ctx.chapterVideos)
    const graph = projectToGraph(project, ctx.chapters, ctx.chapterVideos)
    const group = graph.find(n => n.id === chapter.id)

    expect(timeline.length).toBeGreaterThan(0)
    expect(group?.position).toEqual({ x: 400, y: 200 })
  })
})
