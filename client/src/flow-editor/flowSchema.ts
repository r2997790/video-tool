import type { FlowNode, FlowProject } from '../types'

export const FLOW_STEPS = [
  { type: 'event', label: 'Event registration', desc: 'Let viewers register for a follow-up event.' },
  { type: 'question', label: 'Question', desc: 'Mid-flow question with optional branching.' },
  { type: 'branch', label: 'Branch', desc: 'Split playback path based on a previous answer.' },
  { type: 'chapter', label: 'Chapter', desc: 'Chapter block header — groups one or more videos.' },
  { type: 'video', label: 'Video', desc: 'Play a video clip (library or YouTube live/VOD).' },
  { type: 'toaster', label: 'Toaster', desc: 'Timed popup, banner, download, or graphic during video playback.' },
  { type: 'pause', label: 'Pause & Ask', desc: 'Pause video and ask a question at a timestamp.' },
  { type: 'aichat', label: 'AI Chat', desc: 'Timed AI chat interactions during playback.' },
] as const

export const VIDEO_ATTACH_TYPES = ['question', 'toaster', 'pause', 'aichat'] as const
export type VideoAttachType = (typeof VIDEO_ATTACH_TYPES)[number]

export const CONNECTION_RULES: [string, string][] = [
  ['event', 'question'],
  ['event', 'chapter'],
  ['event', 'video'],
  ['event', 'aichat'],
  ['question', 'branch'],
  ['question', 'chapter'],
  ['question', 'video'],
  ['question', 'aichat'],
  ['question', 'event'],
  ['question', 'question'],
  ['question', 'toaster'],
  ['question', 'pause'],
  ['branch', 'chapter'],
  ['branch', 'video'],
  ['branch', 'question'],
  ['branch', 'aichat'],
  ['branch', 'event'],
  ['branch', 'branch'],
  ['chapter', 'video'],
  ['chapter', 'question'],
  ['chapter', 'branch'],
  ['chapter', 'chapter'],
  ['chapter', 'aichat'],
  ['chapter', 'toaster'],
  ['chapter', 'pause'],
  ['chapter', 'event'],
  ['aichat', 'aichat'],
  ['aichat', 'question'],
  ['aichat', 'chapter'],
  ['aichat', 'video'],
  ['aichat', 'branch'],
  ['aichat', 'event'],
  ['aichat', 'toaster'],
  ['aichat', 'pause'],
  ['video', 'video'],
  ['video', 'question'],
  ['video', 'branch'],
  ['video', 'event'],
  ['video', 'aichat'],
  ['video', 'chapter'],
  ['video', 'toaster'],
  ['video', 'pause'],
  ['toaster', 'pause'],
  ['toaster', 'question'],
  ['toaster', 'toaster'],
  ['toaster', 'aichat'],
  ['toaster', 'chapter'],
  ['toaster', 'video'],
  ['pause', 'question'],
  ['pause', 'chapter'],
  ['pause', 'video'],
  ['pause', 'toaster'],
  ['pause', 'aichat'],
  ['pause', 'pause'],
]

export const DOWNSTREAM: Record<string, string[]> = {}
export const UPSTREAM: Record<string, string[]> = {}
CONNECTION_RULES.forEach(([from, to]) => {
  if (!DOWNSTREAM[from]) DOWNSTREAM[from] = []
  DOWNSTREAM[from].push(to)
  if (!UPSTREAM[to]) UPSTREAM[to] = []
  UPSTREAM[to].push(from)
})

export function newNode(type: FlowNode['type'], name?: string): FlowNode {
  const id = `node-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  const defaults: Record<string, Record<string, unknown>> = {
    event: {
      eventSlug: '',
      heading: '',
      subtext: '',
    },
    question: {
      prompt: 'What would you like to explore?',
      fieldId: 'interest',
      inputType: 'radio',
      options: ['Direct', 'Venta'],
      required: true,
      triggerAtSeconds: 0,
    },
    branch: {
      sourceField: 'interest',
      rules: [
        { match: 'Direct', action: 'chapter', targetNodeId: '' },
        { match: 'Venta', action: 'question', targetNodeId: '' },
      ],
    },
    chapter: { chapterId: 1 },
    video: { chapterId: 1, videoId: 1, videoSource: 'library', videoLink: '', isLive: false },
    toaster: {
      triggerAtSeconds: 30,
      durationSeconds: 5,
      title: 'Tip',
      message: 'Your message here',
      toasterType: 'popup',
      imageUrl: '',
      linkUrl: '',
      linkNewWindow: false,
      thumbnailUrl: '',
      downloadUrl: '',
      downloadFileName: '',
      bannerPosition: 'top',
    },
    pause: {
      triggerAtSeconds: 45,
      prompt: 'What stood out to you?',
      fieldId: 'reflection',
      inputType: 'text',
      options: [],
      required: true,
      placeholder: '',
    },
    aichat: {
      heading: 'Let\'s chat',
      durationSeconds: 60,
      interactionCount: 2,
      mode: 'fixed',
      prompts: ['What stood out to you so far?', 'Any questions about sustainability reporting?'],
      randomPool: ['What stood out to you so far?', 'How does this compare to your current process?', 'Any questions about our products?'],
      useAiReply: true,
      triggerAtSeconds: 0,
    },
  }
  return { id, type, name: name || `${type} node`, parameters: defaults[type] || {}, x: 0, y: 0 }
}

export function canConnect(from: FlowNode, to: FlowNode): boolean {
  return (DOWNSTREAM[from.type] || []).includes(to.type)
}

export function emptyProject(): FlowProject {
  return { projectName: 'Demo Flow', nodes: [], connections: [] }
}

export type { FlowNode, FlowProject }
