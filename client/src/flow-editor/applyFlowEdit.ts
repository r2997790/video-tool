import type { AdminChapter, AdminChapterVideo, FlowNode, FlowProject } from '../types'
import { isFreePositionNode } from './flowGraphLayout'
import { canConnect } from './flowSchema'
import { findVideoAncestor, isPlaybackTriggerNode, isVideoAttachType } from './flowRuntime'
import {
  applyTimelineEdit,
  autoLayoutProject,
  findChapterAncestor,
  insertNodeInTimeline,
  isManagedSpineConnection,
  rebuildSpineConnections,
  removeNodeFromProject,
  repairOrphanNodes,
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
  | { type: 'normalize' }
  | { type: 'replaceProject'; project: FlowProject }

function isTimelineEdit(edit: FlowEdit): edit is TimelineEdit {
  return !['connectNodes', 'disconnectEdge', 'reconnectEdge', 'removeNodes', 'updatePositions', 'autoLayout', 'normalize', 'replaceProject'].includes(edit.type)
}

function applyAttachPlacement(
  project: FlowProject,
  fromNode: FlowNode,
  toNode: FlowNode,
): FlowProject {
  if (!isVideoAttachType(toNode.type)) return project

  let placement: 'during' | 'between' | undefined
  if (fromNode.type === 'video' || (isVideoAttachType(fromNode.type) && isPlaybackTriggerNode(fromNode, project))) {
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

function resolveVideoForAttachConnect(
  project: FlowProject,
  fromNode: FlowNode,
  fromId: string,
): string | null {
  if (fromNode.type === 'video') return fromNode.id
  const video = findVideoAncestor(project, fromId)
  return video?.id ?? null
}

function shouldRewireAsVideoAttach(
  project: FlowProject,
  fromNode: FlowNode,
  toNode: FlowNode,
  fromId: string,
): string | null {
  if (!isVideoAttachType(toNode.type)) return null
  const videoId = resolveVideoForAttachConnect(project, fromNode, fromId)
  if (!videoId) return null
  if (fromNode.type === 'video') return videoId
  if (isPlaybackTriggerNode(fromNode, project)) return videoId
  return null
}

function connectAttachNodeToVideo(
  project: FlowProject,
  attachNodeId: string,
  videoNodeId: string,
  ctx: FlowEditContext,
): FlowProject {
  const node = project.nodes.find(n => n.id === attachNodeId)
  if (!node || !isVideoAttachType(node.type)) return project
  let next = removeNodeFromProject(project, attachNodeId)
  next = { ...next, nodes: [...next.nodes, node] }
  next = insertNodeInTimeline(next, ctx.chapters, ctx.chapterVideos, node, { scope: 'video', videoNodeId })
  return rebuildSpineConnections(next, ctx.chapters, ctx.chapterVideos)
}

function needsSpineRebuild(project: FlowProject, fromId: string, toId: string): boolean {
  const fromNode = project.nodes.find(n => n.id === fromId)
  const toNode = project.nodes.find(n => n.id === toId)
  if (!fromNode || !toNode) return false
  if (isVideoAttachType(fromNode.type) || isVideoAttachType(toNode.type)) return true
  const fromChapter = findChapterAncestor(project, fromId)
  const toChapter = findChapterAncestor(project, toId)
  return !!(fromChapter && toChapter && fromChapter.id === toChapter.id)
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

  const videoId = shouldRewireAsVideoAttach(project, fromNode, toNode, from)
  if (videoId) {
    return connectAttachNodeToVideo(project, to, videoId, ctx)
  }

  let next = applyAttachPlacement(project, fromNode, toNode)
  const connections = [...next.connections, { from, to }]
  next = { ...next, connections }
  if (needsSpineRebuild(project, from, to)) {
    return rebuildSpineConnections(next, ctx.chapters, ctx.chapterVideos)
  }
  return next
}

export function normalizeFlowProject(
  project: FlowProject,
  ctx: FlowEditContext,
): FlowProject {
  return repairOrphanNodes(project, ctx.chapters, ctx.chapterVideos)
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
      let next = { ...project, connections }
      if (
        isManagedSpineConnection(project, edit.from, edit.to, ctx.chapters, ctx.chapterVideos)
        || needsSpineRebuild(project, edit.from, edit.to)
      ) {
        next = rebuildSpineConnections(next, ctx.chapters, ctx.chapterVideos)
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

      const videoId = shouldRewireAsVideoAttach(project, fromNode, toNode, edit.newFrom)
      if (videoId) {
        let next = removeNodeFromProject({ ...project, connections }, edit.newTo)
        const node = project.nodes.find(n => n.id === edit.newTo)
        if (!node) return project
        next = { ...next, nodes: [...next.nodes, node] }
        next = insertNodeInTimeline(next, ctx.chapters, ctx.chapterVideos, node, { scope: 'video', videoNodeId: videoId })
        return rebuildSpineConnections(next, ctx.chapters, ctx.chapterVideos)
      }

      let next = applyAttachPlacement(project, fromNode, toNode)
      connections = [...connections, { from: edit.newFrom, to: edit.newTo }]
      next = { ...next, connections }
      if (needsSpineRebuild(project, edit.newFrom, edit.newTo)) {
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

    case 'normalize':
      return normalizeFlowProject(project, ctx)

    case 'replaceProject':
      return edit.project

    default:
      return project
  }
}
