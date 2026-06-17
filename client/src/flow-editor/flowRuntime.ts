import type { FlowNode, FlowProject } from '../types'
import type { BranchAction, BranchResult, FlowBranchRule, FlowFormField, QuestionInputType } from './flowTypes'
import { VIDEO_ATTACH_TYPES } from './flowSchema'

export function getStartNodes(flow: FlowProject): FlowNode[] {
  const targets = new Set(flow.connections.map(c => c.to))
  return flow.nodes.filter(n => !targets.has(n.id) && (n.type === 'question' || n.type === 'aichat' || n.type === 'event'))
}

export function isVideoAttachType(type: FlowNode['type']): boolean {
  return (VIDEO_ATTACH_TYPES as readonly string[]).includes(type)
}

export function isPlaybackTriggerNode(node: FlowNode, flow?: FlowProject): boolean {
  if (!isVideoAttachType(node.type)) return false
  if (!flow) return node.type === 'pause' || node.type === 'toaster'
  return isVideoEventChainNode(flow, node.id)
}

function isDuringVideoPlacement(node: FlowNode): boolean {
  if (node.parameters.placement === 'between') return false
  if (node.parameters.placement === 'during') return true
  return node.type === 'pause' || node.type === 'toaster'
}

export function isVideoEventChainNode(flow: FlowProject, nodeId: string): boolean {
  const node = flow.nodes.find(n => n.id === nodeId)
  if (!node) return false

  if (!isDuringVideoPlacement(node)) {
    const incoming = flow.connections.filter(c => c.to === nodeId)
    return incoming.some(inc => {
      const parent = flow.nodes.find(n => n.id === inc.from)
      return parent != null && isDuringVideoPlacement(parent) && isVideoEventChainNode(flow, parent.id) && isVideoAttachType(node.type)
    })
  }

  const seen = new Set<string>()
  let currentId: string | null = nodeId
  while (currentId && !seen.has(currentId)) {
    seen.add(currentId)
    const current = flow.nodes.find(n => n.id === currentId)
    if (!current) return false
    if (current.type === 'video') return true
    if (!isVideoAttachType(current.type)) return false
    const incoming = flow.connections.find(c => c.to === currentId)
    currentId = incoming?.from ?? null
  }
  return false
}

export function getNextTraversalNode(flow: FlowProject, fromId: string): FlowNode | null {
  const direct = getNextNodes(flow, fromId)
  const primary = direct.find(n => !isPlaybackTriggerNode(n, flow))
  if (primary) return primary
  for (const n of direct) {
    if (isPlaybackTriggerNode(n, flow)) {
      const deeper = getNextTraversalNode(flow, n.id)
      if (deeper) return deeper
    }
  }
  return null
}

export function isInteractiveFlowNode(node: FlowNode): boolean {
  return node.type === 'question' || node.type === 'aichat'
}

export function isFlowBlockingNode(node: FlowNode, flow?: FlowProject): boolean {
  if (isInteractiveFlowNode(node) || node.type === 'event') return true
  if (node.type === 'pause' && (!flow || !isVideoEventChainNode(flow, node.id))) return true
  return false
}

export function getNextNodes(flow: FlowProject, nodeId: string): FlowNode[] {
  const nextIds = flow.connections.filter(c => c.from === nodeId).map(c => c.to)
  return flow.nodes.filter(n => nextIds.includes(n.id))
}

function normalizeInputType(raw: string | undefined, options?: string[]): QuestionInputType {
  if (raw === 'select') return options?.length ? 'radio' : 'text'
  const allowed: QuestionInputType[] = ['text', 'textarea', 'radio', 'multiselect', 'date', 'datetime', 'email']
  if (raw && allowed.includes(raw as QuestionInputType)) return raw as QuestionInputType
  return options?.length ? 'radio' : 'text'
}

function matchesRule(answer: string, match: string): boolean {
  const m = match.trim().toLowerCase()
  if (!m) return false
  const a = answer.trim().toLowerCase()
  if (a === m) return true
  return a.split(',').map(s => s.trim()).includes(m)
}

function inferAction(rule: FlowBranchRule, flow: FlowProject): BranchAction {
  if (rule.action) return rule.action
  if (rule.url) return 'webpage'
  const target = flow.nodes.find(n => n.id === rule.targetNodeId)
  if (target?.type === 'chapter') return 'chapter'
  return 'question'
}

export function evaluateBranch(node: FlowNode, answers: Record<string, string>, flow: FlowProject): BranchResult | null {
  const rules = (node.parameters.rules as FlowBranchRule[]) || []
  const sourceField = (node.parameters.sourceField as string) || ''
  const answer = answers[sourceField] || ''

  for (const rule of rules) {
    if (matchesRule(answer, rule.match)) {
      const action = inferAction(rule, flow)
      return {
        action,
        targetNodeId: rule.targetNodeId,
        url: rule.url,
      }
    }
  }

  const defaultTarget = node.parameters.defaultTarget as string | undefined
  const defaultUrl = node.parameters.defaultUrl as string | undefined
  if (defaultUrl) return { action: 'webpage', url: defaultUrl }
  if (defaultTarget) {
    const target = flow.nodes.find(n => n.id === defaultTarget)
    return {
      action: target?.type === 'chapter' ? 'chapter' : 'question',
      targetNodeId: defaultTarget,
    }
  }
  return null
}

export function getChapterIdFromNode(node: FlowNode): number | null {
  const id = node.parameters.chapterId
  return typeof id === 'number' ? id : typeof id === 'string' ? parseInt(id, 10) : null
}

export function nodeHasForm(node: FlowNode): boolean {
  return node.type === 'question'
}

export function getNodeQuestions(node: FlowNode): FlowFormField[] {
  if (node.type === 'question') {
    const fieldId = (node.parameters.fieldId as string) || 'answer'
    const options = (node.parameters.options as string[]) || []
    const inputType = normalizeInputType(node.parameters.inputType as string, options)
    return [{
      id: fieldId,
      label: (node.parameters.prompt as string) || 'Your answer',
      inputType,
      options: options.length ? options : undefined,
      placeholder: node.parameters.placeholder as string | undefined,
      required: node.parameters.required !== false,
    }]
  }

  if (node.type === 'pause') {
    const options = (node.parameters.options as string[]) || []
    return [{
      id: (node.parameters.fieldId as string) || 'answer',
      label: (node.parameters.prompt as string) || 'Your answer',
      inputType: normalizeInputType(node.parameters.inputType as string, options),
      options: options.length ? options : undefined,
      placeholder: node.parameters.placeholder as string | undefined,
      required: node.parameters.required !== false,
    }]
  }

  return []
}

export function getNodeHeading(node: FlowNode): string {
  if (node.type === 'question') return (node.parameters.prompt as string) || node.name || 'Please answer'
  if (node.type === 'event') return (node.parameters.heading as string) || node.name || 'Event registration'
  return (node.parameters.heading as string) || node.name || 'Please answer'
}

export function getNodeSubtext(node: FlowNode): string {
  return (node.parameters.subtext as string) || ''
}

export function collectFlowFieldIds(flow: FlowProject): string[] {
  const ids: string[] = []
  for (const n of flow.nodes) {
    if (n.type === 'question') ids.push((n.parameters.fieldId as string) || 'answer')
    if (n.type === 'pause') ids.push((n.parameters.fieldId as string) || 'answer')
  }
  return [...new Set(ids)]
}

export function validateFormAnswers(fields: FlowFormField[], answers: Record<string, string>): string | null {
  for (const q of fields) {
    const val = answers[q.id]?.trim() || ''
    if (q.required && !val) return 'Please fill in all required fields.'
    if (q.inputType === 'email' && val && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
      return 'Please enter a valid email address.'
    }
    if (q.inputType === 'multiselect' && q.required && !val) {
      return 'Please select at least one option.'
    }
  }
  return null
}

export type FlowAdvanceHandlers = {
  setFlowNode: (node: FlowNode | null) => void
  setActiveChapter: (chapterId: number) => void
  setActiveVideo?: (chapterId: number, videoId: number, videoNodeId: string) => void
  setPlaying: (playing: boolean) => void
  bumpVideoKey: () => void
  redirect: (url: string) => void
}

export function applyBranchResult(
  result: BranchResult,
  answers: Record<string, string>,
  flow: FlowProject,
  handlers: FlowAdvanceHandlers,
) {
  if (result.action === 'webpage') {
    const url = result.url?.trim()
    if (url) {
      handlers.redirect(url.startsWith('http') ? url : `https://${url}`)
      handlers.setFlowNode(null)
    }
    return
  }

  if (!result.targetNodeId) {
    handlers.setFlowNode(null)
    return
  }

  const target = flow.nodes.find(n => n.id === result.targetNodeId)
  if (!target) {
    handlers.setFlowNode(null)
    return
  }

  if (result.action === 'chapter' || target.type === 'chapter' || target.type === 'video') {
    continueAfterChapter(flow, target, answers, handlers)
    return
  }

  handlers.setFlowNode(target)
}

function getVideoIdFromNode(node: FlowNode): number | null {
  const id = node.parameters.videoId
  return typeof id === 'number' ? id : typeof id === 'string' ? parseInt(id, 10) : null
}

function findFirstVideoNode(flow: FlowProject, fromNodeId: string): FlowNode | null {
  const direct = getNextNodes(flow, fromNodeId)
  const video = direct.find(n => n.type === 'video')
  if (video) return video
  for (const n of direct) {
    if (n.type === 'chapter') continue
    const nested = findFirstVideoNode(flow, n.id)
    if (nested) return nested
  }
  return null
}

function activateVideoNode(node: FlowNode, handlers: FlowAdvanceHandlers): void {
  const chId = getChapterIdFromNode(node)
  const vid = getVideoIdFromNode(node)
  if (chId) handlers.setActiveChapter(chId)
  if (chId && vid && handlers.setActiveVideo) {
    handlers.setActiveVideo(chId, vid, node.id)
  }
  handlers.setPlaying(true)
  handlers.bumpVideoKey()
}

function activateChapterNode(node: FlowNode, flow: FlowProject, handlers: FlowAdvanceHandlers): void {
  const chId = getChapterIdFromNode(node)
  if (chId) handlers.setActiveChapter(chId)
  const videoNode = findFirstVideoNode(flow, node.id)
  if (videoNode) {
    activateVideoNode(videoNode, handlers)
    return
  }
  if (chId) {
    handlers.setPlaying(true)
    handlers.bumpVideoKey()
  }
}

function continueAfterChapter(
  flow: FlowProject,
  chapterNode: FlowNode,
  answers: Record<string, string>,
  handlers: FlowAdvanceHandlers,
): FlowNode | null {
  if (chapterNode.type === 'video') {
    activateVideoNode(chapterNode, handlers)
  } else {
    activateChapterNode(chapterNode, flow, handlers)
  }
  const after = getNextTraversalNode(flow, chapterNode.id)
  if (after?.type === 'branch') {
    const nested = evaluateBranch(after, answers, flow)
    if (nested) {
      applyBranchResult(nested, answers, flow, handlers)
      return null
    }
    handlers.setFlowNode(null)
    return null
  }
  const next = after && isFlowBlockingNode(after, flow) ? after : null
  handlers.setFlowNode(next)
  return next
}

export function shouldShowFlowOverlay(node: FlowNode, flow?: FlowProject): boolean {
  if (node.type === 'question') return true
  if (node.type === 'pause' && flow && !isVideoEventChainNode(flow, node.id)) return true
  return false
}

export function onVideoEnded(
  currentVideoNode: FlowNode,
  answers: Record<string, string>,
  flow: FlowProject,
  handlers: FlowAdvanceHandlers,
): FlowNode | null {
  const nextNode = getNextTraversalNode(flow, currentVideoNode.id)
  if (!nextNode) {
    handlers.setFlowNode(null)
    return null
  }

  if (nextNode.type === 'video') {
    activateVideoNode(nextNode, handlers)
    const after = getNextTraversalNode(flow, nextNode.id)
    const blocking = after && isFlowBlockingNode(after, flow) ? after : null
    handlers.setFlowNode(blocking)
    return blocking
  }

  if (nextNode.type === 'chapter') {
    return continueAfterChapter(flow, nextNode, answers, handlers)
  }

  if (nextNode.type === 'branch') {
    const result = evaluateBranch(nextNode, answers, flow)
    if (result) {
      applyBranchResult(result, answers, flow, handlers)
      return null
    }
    handlers.setFlowNode(null)
    return null
  }

  if (isFlowBlockingNode(nextNode, flow)) {
    handlers.setFlowNode(nextNode)
    handlers.setPlaying(false)
    return nextNode
  }

  handlers.setFlowNode(nextNode)
  return nextNode
}

export function shouldAutoAdvanceNode(node: FlowNode): boolean {
  if (node.type === 'aichat' || node.type === 'event') return false
  if (!nodeHasForm(node)) return node.type !== 'chapter'
  return getNodeQuestions(node).length === 0
}

export function advanceFromNode(
  currentNode: FlowNode,
  answers: Record<string, string>,
  flow: FlowProject,
  handlers: FlowAdvanceHandlers,
): FlowNode | null {
  if (currentNode.type === 'chapter') {
    activateChapterNode(currentNode, flow, handlers)
  } else if (currentNode.type === 'video') {
    activateVideoNode(currentNode, handlers)
  }

  const nextNode = getNextTraversalNode(flow, currentNode.id)
  if (!nextNode) {
    handlers.setFlowNode(null)
    return null
  }

  if (nextNode.type === 'branch') {
    const result = evaluateBranch(nextNode, answers, flow)
    if (result) {
      applyBranchResult(result, answers, flow, handlers)
      return null
    }
    handlers.setFlowNode(null)
    return null
  }

  if (nextNode.type === 'chapter' || nextNode.type === 'video') {
    return continueAfterChapter(flow, nextNode, answers, handlers)
  }

  if (isFlowBlockingNode(nextNode, flow)) {
    handlers.setFlowNode(nextNode)
    return nextNode
  }

  handlers.setFlowNode(nextNode)
  return nextNode
}

export function initializeFlow(
  flow: FlowProject,
  handlers: FlowAdvanceHandlers,
): FlowNode | null {
  const starts = getStartNodes(flow)
  if (!starts.length) return null

  let current: FlowNode | null = starts[0]
  let guard = 0
  const answers: Record<string, string> = {}

  while (current && guard++ < 50) {
    if (current.type === 'aichat' || current.type === 'event') {
      handlers.setFlowNode(current)
      if (isFlowBlockingNode(current, flow)) handlers.setPlaying(false)
      return current
    }
    if (shouldShowFlowOverlay(current, flow) && !shouldAutoAdvanceNode(current)) {
      handlers.setFlowNode(current)
      if (isFlowBlockingNode(current, flow)) handlers.setPlaying(false)
      return current
    }
    current = advanceFromNode(current, answers, flow, handlers)
  }

  return current
}
