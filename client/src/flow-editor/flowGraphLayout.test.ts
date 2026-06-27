import { describe, expect, it } from 'vitest'
import {
  dropTargetToEdit,
  dropTargetToInsertTarget,
  isFreePositionNode,
  projectToGraph,
  resolveInsertDropTarget,
  resolveVideoDropTarget,
  videoGroupId,
  VIDEO_GROUP_HEADER_HEIGHT,
  VIDEO_GROUP_PADDING,
  NESTED_NODE_HEIGHT,
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
  const start = newNode('question', 'Start')
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
    nodes: [start, chapter, video, q1, q2],
    connections: [
      { from: start.id, to: chapter.id },
      { from: chapter.id, to: video.id },
      { from: video.id, to: q1.id },
      { from: q1.id, to: q2.id },
    ],
  }
}

function buildVideoOnlyFlow(): FlowProject {
  const chapter = newNode('chapter', 'Chapter block')
  chapter.parameters = { chapterId: 1 }
  const video = newNode('video', 'Video 1')
  video.parameters = { chapterId: 1, videoId: 1 }
  return {
    projectName: 'Test',
    nodes: [chapter, video],
    connections: [{ from: chapter.id, to: video.id }],
  }
}

describe('flowGraphLayout', () => {
  it('isFreePositionNode returns true for chapters and top-level nodes only', () => {
    const project = buildChapterFlow()
    const chapter = project.nodes.find(n => n.type === 'chapter')!
    const start = project.nodes.find(n => n.name === 'Start')!

    expect(isFreePositionNode(project, chapter.id)).toBe(true)
    expect(isFreePositionNode(project, start.id)).toBe(true)
    const q = project.nodes.find(n => n.name === 'Question A')!
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

  it('resolveInsertDropTarget returns video scope when attach type dropped on video nest zone', () => {
    const project = buildChapterFlow()
    const graph = projectToGraph(project, ctx.chapters, ctx.chapterVideos)
    const chapter = project.nodes.find(n => n.type === 'chapter')!
    const video = project.nodes.find(n => n.type === 'video')!
    const group = graph.find(n => n.id === chapter.id)!

    const target = resolveInsertDropTarget(
      project,
      { x: group!.position.x + 40, y: group!.position.y + 120 },
      'question',
      graph,
      ctx.chapters,
      ctx.chapterVideos,
    )

    expect(target).toEqual({ scope: 'video', videoNodeId: video.id })
  })

  it('resolveInsertDropTarget returns chapter scope when attach type dropped below video nest', () => {
    const project = buildChapterFlow()
    const graph = projectToGraph(project, ctx.chapters, ctx.chapterVideos)
    const chapter = project.nodes.find(n => n.type === 'chapter')!
    const group = graph.find(n => n.id === chapter.id)!

    const target = resolveInsertDropTarget(
      project,
      { x: group!.position.x + 40, y: group!.position.y + 260 },
      'question',
      graph,
      ctx.chapters,
      ctx.chapterVideos,
    )

    expect(target?.scope).toBe('chapter')
    expect(target?.scope === 'chapter' && target.chapterNodeId).toBe(chapter.id)
  })

  it('resolveInsertDropTarget returns chapter scope for pause below video nest', () => {
    const project = buildChapterFlow()
    const graph = projectToGraph(project, ctx.chapters, ctx.chapterVideos)
    const chapter = project.nodes.find(n => n.type === 'chapter')!
    const group = graph.find(n => n.id === chapter.id)!

    const target = resolveInsertDropTarget(
      project,
      { x: group!.position.x + 40, y: group!.position.y + 260 },
      'pause',
      graph,
      ctx.chapters,
      ctx.chapterVideos,
    )

    expect(target?.scope).toBe('chapter')
  })

  it('resolveInsertDropTarget returns top scope for toaster outside chapters', () => {
    const project = buildChapterFlow()
    const graph = projectToGraph(project, ctx.chapters, ctx.chapterVideos)

    const target = resolveInsertDropTarget(
      project,
      { x: 50, y: 50 },
      'toaster',
      graph,
      ctx.chapters,
      ctx.chapterVideos,
    )

    expect(target).toEqual({ scope: 'top' })
  })

  it('projectToGraph emits videoGroup with nested video and events', () => {
    let project = buildChapterFlow()
    const video = project.nodes.find(n => n.type === 'video')!
    const pause = newNode('pause', 'During pause')
    project = {
      ...project,
      nodes: [...project.nodes, pause],
      connections: [...project.connections, { from: video.id, to: pause.id }],
    }
    const graph = projectToGraph(project, ctx.chapters, ctx.chapterVideos)
    const group = graph.find(n => n.id === videoGroupId(video.id))
    const videoNode = graph.find(n => n.id === video.id)
    const pauseNode = graph.find(n => n.id === pause.id)

    expect(group?.type).toBe('videoGroup')
    expect(videoNode?.parentId).toBe(group?.id)
    expect(pauseNode?.parentId).toBe(group?.id)
    expect(pauseNode?.position.y).toBe(VIDEO_GROUP_HEADER_HEIGHT + VIDEO_GROUP_PADDING + NESTED_NODE_HEIGHT + 8)
  })

  it('resolveInsertDropTarget returns video scope when dropped on video group bounds', () => {
    const project = buildChapterFlow()
    const graph = projectToGraph(project, ctx.chapters, ctx.chapterVideos)
    const chapter = project.nodes.find(n => n.type === 'chapter')!
    const video = project.nodes.find(n => n.type === 'video')!
    const group = graph.find(n => n.id === videoGroupId(video.id))!
    const chapterGroup = graph.find(n => n.id === chapter.id)!

    const target = resolveInsertDropTarget(
      project,
      {
        x: chapterGroup!.position.x + group.position.x + 40,
        y: chapterGroup!.position.y + group.position.y + 40,
      },
      'pause',
      graph,
      ctx.chapters,
      ctx.chapterVideos,
    )

    expect(target).toEqual({ scope: 'video', videoNodeId: video.id, eventInsertIndex: undefined })
  })

  it('resolveVideoDropTarget hits video group bounds', () => {
    const project = buildChapterFlow()
    const graph = projectToGraph(project, ctx.chapters, ctx.chapterVideos)
    const chapter = project.nodes.find(n => n.type === 'chapter')!
    const video = project.nodes.find(n => n.type === 'video')!
    const group = graph.find(n => n.id === videoGroupId(video.id))!
    const chapterGroup = graph.find(n => n.id === chapter.id)!

    const target = resolveVideoDropTarget(
      {
        x: chapterGroup!.position.x + group.position.x + 20,
        y: chapterGroup!.position.y + group.position.y + 50,
      },
      graph,
    )
    expect(target?.scope).toBe('video')
    expect(target?.scope === 'video' && target.videoNodeId).toBe(video.id)
  })

  it('dropTargetToEdit reorders events within same video', async () => {
    const { applyFlowEdit } = await import('./applyFlowEdit')
    let project = buildVideoOnlyFlow()
    const video = project.nodes.find(n => n.type === 'video')!
    const pause1 = newNode('pause', 'Pause A')
    const pause2 = newNode('pause', 'Pause B')
    project = applyFlowEdit(project, { type: 'insert', node: pause1, target: { scope: 'video', videoNodeId: video.id } }, ctx)
    project = applyFlowEdit(project, { type: 'insert', node: pause2, target: { scope: 'video', videoNodeId: video.id } }, ctx)

    const edit = dropTargetToEdit(pause2.id, {
      scope: 'video',
      videoNodeId: video.id,
      eventInsertIndex: 0,
    }, project, ctx.chapterVideos)

    expect(edit?.type).toBe('reorderEvents')
    if (edit?.type === 'reorderEvents') {
      expect(edit.orderedIds).toEqual([pause2.id, pause1.id])
    }
  })

  it('dropTargetToEdit moves during-video pause to chapter spine', async () => {
    const { applyFlowEdit } = await import('./applyFlowEdit')
    let project = buildVideoOnlyFlow()
    const chapter = project.nodes.find(n => n.type === 'chapter')!
    const video = project.nodes.find(n => n.type === 'video')!
    const pause = newNode('pause', 'During pause')
    project = applyFlowEdit(project, { type: 'insert', node: pause, target: { scope: 'video', videoNodeId: video.id } }, ctx)

    const edit = dropTargetToEdit(pause.id, {
      scope: 'chapter',
      chapterNodeId: chapter.id,
      afterSegmentIndex: 0,
    }, project, ctx.chapterVideos)

    expect(edit).toEqual({
      type: 'moveIntoChapter',
      nodeId: pause.id,
      chapterNodeId: chapter.id,
      afterVideoNodeId: video.id,
    })
  })

  it('dropTargetToEdit moves during-video pause to top level', async () => {
    const { applyFlowEdit } = await import('./applyFlowEdit')
    let project = buildVideoOnlyFlow()
    const video = project.nodes.find(n => n.type === 'video')!
    const pause = newNode('pause', 'During pause')
    project = applyFlowEdit(project, { type: 'insert', node: pause, target: { scope: 'video', videoNodeId: video.id } }, ctx)

    const edit = dropTargetToEdit(pause.id, { scope: 'top' }, project, ctx.chapterVideos)
    expect(edit).toEqual({ type: 'moveToTopLevel', nodeId: pause.id })
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
