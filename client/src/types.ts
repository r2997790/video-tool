export interface DemoTheme {
  primaryColor: string
  accentColor: string
  backgroundColor: string
  surfaceColor: string
  textColor: string
  fontFamily: string
  brandName: string
  chatTitle: string
  logoUrl?: string | null
}

export interface DemoConfig {
  autoplay: boolean
  showDuration: boolean
  chatEnabled: boolean
  aiEnabled: boolean
  notificationsEnabled: boolean
  liveChatEnabled: boolean
  seedChatEnabled: boolean
  chapterPickEnabled: boolean
  pauseEnabled: boolean
  theme?: DemoTheme
  demoChatSubtitle?: string | null
}

export type ToasterType = 'popup' | 'banner' | 'download' | 'graphic'

export interface VideoToaster {
  id: number
  chapterId: number | null
  triggerAtSeconds: number
  durationSeconds: number
  title: string
  message: string
  toasterType: ToasterType
  imageUrl?: string | null
  linkUrl?: string | null
  linkNewWindow?: boolean
  thumbnailUrl?: string | null
  downloadUrl?: string | null
  downloadFileName?: string | null
  bannerPosition?: 'top' | 'bottom'
}

export interface VideoPausePoint {
  id: number
  chapterId: number | null
  triggerAtSeconds: number
  prompt: string
  fieldId: string
  inputType: string
  options?: string[]
  required: boolean
  placeholder?: string | null
}

export interface EngagementSession {
  sessionId: string
  totalWatchSeconds: number
  chatMessages: number
  toasterViews: number
  toasterDismissals: number
  downloads: number
  flowSteps: number
  lastActivity?: string
  events: Array<{
    eventType: string
    chapterId?: number | null
    toasterId?: number | null
    dataJson?: string | null
    createdAt: string
  }>
}

export interface GateQuestion {
  id: string
  label: string
  type: string
  placeholder?: string
  required?: boolean
}

export interface Gate {
  heading: string
  subtext: string
  questions: GateQuestion[]
}

export interface ChapterVideo {
  id: number
  chapterId: number
  title: string
  videoLink: string
  duration: string
  sortOrder: number
  videoType?: 'youtube' | 'direct' | 'none'
  videoValue?: string
}

export interface Chapter {
  id: number
  slug: string
  num: string
  name: string
  description: string
  duration: string
  videoLink: string
  videoType: 'youtube' | 'direct' | 'none'
  videoValue: string
  videos?: ChapterVideo[]
  isLocked: boolean
  gate: Gate | null
  showDuration?: boolean | null
  totalWatchSeconds?: number
  viewerCount?: number
}

export interface AdminChapter {
  id: number
  slug: string
  name: string
  description: string
  videoLink: string
  duration: string
  sortOrder: number
  isLocked: boolean
  showDuration?: boolean | null
  gateJson?: string | null
  totalWatchSeconds?: number
  viewerCount?: number
}

export interface AdminChapterVideo {
  id: number
  chapterId: number
  title: string
  videoLink: string
  duration: string
  sortOrder: number
}

export interface ChatMsg {
  id?: number
  role: 'user' | 'assistant' | 'admin'
  text: string
  source?: string
  createdAt?: string
}

export interface FlowNode {
  id: string
  type: 'intro' | 'question' | 'branch' | 'chapter' | 'video' | 'outro' | 'aichat' | 'toaster' | 'pause' | 'event'
  name: string
  parameters: Record<string, unknown>
  x?: number
  y?: number
}

export interface FlowConnection {
  from: string
  to: string
}

export interface FlowProject {
  projectName: string
  nodes: FlowNode[]
  connections: FlowConnection[]
}

export interface FlowSummary {
  id: number
  slug: string
  projectName: string
  isEnabled: boolean
  createdAt: string
  updatedAt: string
  publicUrl: string
}

export interface FlowDetail extends FlowSummary {
  projectData: FlowProject
}

export interface WeeklySchedule {
  days: string[]
  times: string[]
}

export interface DemoConfigResponse {
  flowSlug?: string
  config: DemoConfig
  chapters: Chapter[]
  seedMessages: ChatMsg[]
  flow: { projectName: string; projectData: FlowProject }
  toasters: VideoToaster[]
  pausePoints: VideoPausePoint[]
}

export interface ScheduledEvent {
  id: number
  slug: string
  title: string
  startsAtUtc: string
  holdingHeading?: string | null
  holdingMessage?: string | null
  holdingImageUrl?: string | null
  holdingVideoUrl?: string | null
  holdingVideoType: string
  defaultChapterId?: number | null
  flowSlug?: string | null
  recurrenceType?: string
  intervalMinutes?: number | null
  recurrenceStartUtc?: string | null
  recurrenceEndUtc?: string | null
  timezone?: string
  weeklyScheduleJson?: string | null
  liveDurationMinutes?: number | null
  isEnabled: boolean
  updatedAt?: string
  occurrence?: {
    nextStartsAtUtc?: string | null
    isLive: boolean
    serverNowUtc: string
  }
}

export interface ScheduledEventPublic {
  slug: string
  title: string
  flowSlug?: string | null
  startsAtUtc: string
  nextStartsAtUtc?: string | null
  isLive?: boolean
  serverNowUtc: string
  timezone?: string | null
  holdingHeading?: string | null
  holdingMessage?: string | null
  holdingImageUrl?: string | null
  holdingVideoType: string
  holdingVideoValue: string
  defaultChapterId?: number | null
  recurrenceType?: string
}

export interface LeadSubmissionRow {
  id: number
  sessionId: string
  flowSlug: string
  source: string
  chapterId: number | null
  nodeId: string | null
  answersJson: string
  createdAt: string
}
