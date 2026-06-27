import type { AdminChapter, AdminChapterVideo, FlowNode, FlowProject } from '../types'
import { isFreePositionNode } from './flowGraphLayout'
import { canConnect } from './flowSchema'
import { isVideoAttachType } from './flowRuntime'
import {
  applyTimelineEdit,
  autoLayoutProject,
  findChapterAncestor,
  isManagedSpineConnection,
  rebuildSpineConnections,
  type TimelineEdit,
} from './flowTimeline'

export type FlowEditContext = {
  chapters: AdminChapter[]
  chapterVideos: AdminChapterVideo[]
}

export type FlowEdit =
  | TimelineEdit
  | { type: 'connectNodes'; from: string; to: string }
  | { type: 'disconnectEdge'; from: string; to: string }
  | { type: 'reconnectEdge'; oldFrom: string; oldTo: string; newFrom: string; newTo: string }
  | { type: 'removeNodes'; nodeIds: string[] }
  | { type: 'updatePositions'; positions: Array<{ nodeId: string; x: number; y: number }> }
  | { type: 'autoLayout' }
  | { type: 'replaceProject'; project: FlowProject }

function isTimelineEdit(edit: FlowEdit): edit is TimelineEdit {
  return !['connectNodes', 'disconnectEdge', 'reconnectEdge', 'removeNodes', 'updatePositions', 'autoLayout', 'replaceProject'].includes(edit.type)
}

function applyAttachPlacement(
  project: FlowProject,
  fromNode: FlowNode,
  toNode: FlowNode,
): FlowProject {
  if (!isVideoAttachType(toNode.type)) return project

  let placement: 'during' | 'between' | undefined
  if (fromNode.type === 'video') {
    placement = 'during'
  } else if (!isVideoAttachType(fromNode.type)) {
    placement = 'between'
  }

  if (!placement) return project

  return {
    ...project,
    nodes: project.nodes.map(n =>
      n.id === toNode.id
        ? { ...n, parameters: { ...n.parameters, placement } }
        : n,
    ),
  }
}

function connectWithSpine(
  project: FlowProject,
  from: string,
  to: string,
  ctx: FlowEditContext,
): FlowProject {
  const fromNode = project.nodes.find(n => n.id === from)
  const toNode = project.nodes.find(n => n.id === to)
  if (!fromNode || !toNode || !canConnect(fromNode, toNode)) return project
  if (project.connections.some(c => c.from === from && c.to === to)) return project

  let next = applyAttachPlacement(project, fromNode, toNode)
  const connections = [...next.connections, { from, to }]
  next = { ...next, connections }
  const fromChapter = findChapterAncestor(project, from)
  const toChapter = findChapterAncestor(project, to)
  if (fromChapter && toChapter && fromChapter.id === toChapter.id) {
    return rebuildSpineConnections(next, ctx.chapters, ctx.chapterVideos)
  }
  return next
}

export function applyFlowEdit(
  project: FlowProject,
  edit: FlowEdit,
  ctx: FlowEditContext,
): FlowProject {
  if (isTimelineEdit(edit)) {
    return applyTimelineEdit(project, edit, ctx.chapters, ctx.chapterVideos)
  }

  switch (edit.type) {
    case 'connectNodes':
      return connectWithSpine(project, edit.from, edit.to, ctx)

    case 'disconnectEdge': {
      const connections = project.connections.filter(
        c => !(c.from === edit.from && c.to === edit.to),
      )
      const next = { ...project, connections }
      if (isManagedSpineConnection(project, edit.from, edit.to, ctx.chapters, ctx.chapterVideos)) {
        return rebuildSpineConnections(next, ctx.chapters, ctx.chapterVideos)
      }
      return next
    }

    case 'reconnectEdge': {
      let connections = project.connections.filter(
        c => !(c.from === edit.oldFrom && c.to === edit.oldTo),
      )
      const fromNode = project.nodes.find(n => n.id === edit.newFrom)
      const toNode = project.nodes.find(n => n.id === edit.newTo)
      if (!fromNode || !toNode || !canConnect(fromNode, toNode)) return project
      let next = applyAttachPlacement(project, fromNode, toNode)
      connections = [...connections, { from: edit.newFrom, to: edit.newTo }]
      next = { ...next, connections }
      const fromChapter = findChapterAncestor(project, edit.newFrom)
      const toChapter = findChapterAncestor(project, edit.newTo)
      if (fromChapter && toChapter && fromChapter.id === toChapter.id) {
        return rebuildSpineConnections(next, ctx.chapters, ctx.chapterVideos)
      }
      return next
    }

    case 'removeNodes': {
      let next = project
      for (const nodeId of edit.nodeIds) {
        next = applyTimelineEdit(next, { type: 'remove', nodeId }, ctx.chapters, ctx.chapterVideos)
      }
      return next
    }

    case 'updatePositions': {
      const posMap = new Map(edit.positions.map(p => [p.nodeId, p]))
      return {
        ...project,
        nodes: project.nodes.map(n => {
          const pos = posMap.get(n.id)
          if (!pos || !isFreePositionNode(project, n.id)) return n
          return { ...n, x: pos.x, y: pos.y }
        }),
      }
    }

    case 'autoLayout':
      return autoLayoutProject(project, ctx.chapters, ctx.chapterVideos)

    case 'replaceProject':
      return edit.project

    default:
      return project
  }
}
