import type { FlowNode } from '../types'
import { getChapterIdFromNode } from './flowRuntime'
import { newNode } from './flowSchema'
import {
  pickNextUnusedChapterVideo,
  resolveInsertTarget,
  type InsertTarget,
} from './flowTimeline'
import type { FlowEditorState } from './useFlowEditorState'

export type FlowInsertContext = {
  chapters: FlowEditorState['chapters']
  chapterVideos: FlowEditorState['chapterVideos']
  project: FlowEditorState['project']
}

export function prepareInsertNode(
  type: FlowNode['type'],
  target: InsertTarget,
  ctx: FlowInsertContext,
): FlowNode {
  const node = newNode(type)

  if (type === 'video' && target.scope === 'chapter') {
    const chapterNode = ctx.project.nodes.find(n => n.id === target.chapterNodeId)
    if (chapterNode) {
      const nextVid = pickNextUnusedChapterVideo(ctx.project, chapterNode, ctx.chapterVideos)
      const chId = getChapterIdFromNode(chapterNode) ?? 0
      if (nextVid) {
        node.parameters = { chapterId: chId, videoId: nextVid.id }
        node.name = nextVid.title
      } else {
        node.parameters = { chapterId: chId, videoId: 0 }
      }
    }
  }

  if (type === 'chapter') {
    const firstCh = ctx.chapters[0]
    if (firstCh) node.parameters = { chapterId: firstCh.id }
  }

  return node
}

export function insertNodeAtTarget(
  state: FlowEditorState,
  type: FlowNode['type'],
  target: InsertTarget,
  toast?: { error: (msg: string) => void },
): FlowNode | null {
  const { project, applyEdit, chapters, chapterVideos, selectNode } = state

  if (target.scope === 'reject') {
    toast?.error(target.message)
    return null
  }

  const node = prepareInsertNode(type, target, { project, chapters, chapterVideos })
  applyEdit({ type: 'insert', node, target })
  selectNode(node)
  return node
}

export function insertNodeWithSelection(
  state: FlowEditorState,
  type: FlowNode['type'],
  toast: { error: (msg: string) => void },
): void {
  const { project, chapterVideos, selectedNode } = state
  const target = resolveInsertTarget(project, selectedNode, type, chapterVideos)
  insertNodeAtTarget(state, type, target, toast)
}
