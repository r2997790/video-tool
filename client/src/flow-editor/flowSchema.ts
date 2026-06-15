import type { FlowNode, FlowProject } from '../types'

export const FLOW_STEPS = [
  { type: 'intro', label: 'Intro', desc: 'Pre-playback questions shown when the demo loads.' },
  { type: 'event', label: 'Event', desc: 'Countdown holding screen before playback starts.' },
  { type: 'question', label: 'Question', desc: 'Mid-flow question with optional branching.' },
  { type: 'branch', label: 'Branch', desc: 'Split playback path based on a previous answer.' },
  { type: 'chapter', label: 'Chapter', desc: 'Chapter block header — groups one or more videos.' },
  { type: 'video', label: 'Video', desc: 'Play a specific video clip within a chapter block.' },
  { type: 'toaster', label: 'Toaster', desc: 'Timed popup, banner, download, or graphic during video playback.' },
  { type: 'pause', label: 'Pause & Ask', desc: 'Pause video and ask a question at a timestamp.' },
  { type: 'aichat', label: 'AI Chat', desc: 'Timed AI chat interactions during playback.' },
  { type: 'outro', label: 'Outro', desc: 'Post-playback questions or summary.' },
] as const

export const CONNECTION_RULES: [string, string][] = [
  ['intro', 'question'],
  ['intro', 'chapter'],
  ['intro', 'video'],
  ['intro', 'aichat'],
  ['intro', 'event'],
  ['event', 'question'],
  ['event', 'chapter'],
  ['event', 'video'],
  ['event', 'intro'],
  ['event', 'aichat'],
  ['question', 'branch'],
  ['question', 'chapter'],
  ['question', 'video'],
  ['question', 'outro'],
  ['question', 'aichat'],
  ['question', 'event'],
  ['branch', 'chapter'],
  ['branch', 'video'],
  ['branch', 'question'],
  ['branch', 'outro'],
  ['branch', 'aichat'],
  ['branch', 'event'],
  ['chapter', 'video'],
  ['chapter', 'question'],
  ['chapter', 'branch'],
  ['chapter', 'outro'],
  ['chapter', 'chapter'],
  ['chapter', 'aichat'],
  ['chapter', 'toaster'],
  ['chapter', 'pause'],
  ['chapter', 'event'],
  ['question', 'question'],
  ['branch', 'branch'],
  ['aichat', 'aichat'],
  ['video', 'video'],
  ['video', 'question'],
  ['video', 'branch'],
  ['video', 'event'],
  ['video', 'aichat'],
  ['video', 'chapter'],
  ['video', 'outro'],
  ['video', 'toaster'],
  ['video', 'pause'],
  ['toaster', 'pause'],
  ['toaster', 'question'],
  ['toaster', 'outro'],
  ['toaster', 'toaster'],
  ['pause', 'question'],
  ['pause', 'outro'],
  ['pause', 'chapter'],
  ['pause', 'video'],
  ['pause', 'toaster'],
  ['aichat', 'question'],
  ['aichat', 'chapter'],
  ['aichat', 'video'],
  ['aichat', 'outro'],
  ['aichat', 'branch'],
  ['aichat', 'event'],
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
    intro: { heading: 'Welcome', subtext: 'Please answer a few questions.', questions: [{ id: 'name', label: 'Your name', type: 'text', required: true }] },
    event: {
      mode: 'inline',
      title: 'Live event',
      startsAtUtc: new Date(Date.now() + 3600000).toISOString(),
      holdingHeading: 'Starting soon',
      holdingMessage: 'The broadcast will begin shortly.',
      holdingImageUrl: '',
      holdingVideoUrl: '',
      holdingVideoType: 'none',
      defaultChapterId: 1,
    },
    question: {
      prompt: 'What would you like to explore?',
      fieldId: 'interest',
      inputType: 'radio',
      options: ['Direct', 'Venta'],
      required: true,
    },
    branch: {
      sourceField: 'interest',
      rules: [
        { match: 'Direct', action: 'chapter', targetNodeId: '' },
        { match: 'Venta', action: 'question', targetNodeId: '' },
      ],
    },
    chapter: { chapterId: 1 },
    video: { chapterId: 1, videoId: 1 },
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
    },
    outro: { heading: 'Thank you', subtext: 'Any final feedback?', questions: [{ id: 'feedback', label: 'Feedback', type: 'text' }] },
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
