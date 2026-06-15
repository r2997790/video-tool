const BASE = ''

function flowAdminPath(slug: string, path: string) {
  return `/api/admin/flows/${encodeURIComponent(slug)}${path}`
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(BASE + url, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || res.statusText)
  }
  if (res.status === 204) return undefined as T
  const text = await res.text()
  if (!text.trim()) return undefined as T
  return JSON.parse(text) as T
}

export const api = {
  getDemoConfig: (flowSlug?: string) =>
    request<import('./types').DemoConfigResponse>(
      flowSlug ? `/api/demo/config/${encodeURIComponent(flowSlug)}` : '/api/demo/config',
    ),
  getDemoFlow: (flowSlug: string) =>
    request<{ slug: string; projectName: string; projectData: import('./types').FlowProject }>(
      `/api/demo/flow/${encodeURIComponent(flowSlug)}`,
    ),
  sendChat: (sessionId: string, message: string, chapterContext?: string, flowSlug?: string) =>
    request('/api/demo/chat', {
      method: 'POST',
      body: JSON.stringify({ sessionId, message, chapterContext, flowSlug }),
    }),
  getChatHistory: (sessionId: string) => request<import('./types').ChatMsg[]>(`/api/demo/chat/${sessionId}`),

  login: (username: string, password: string) =>
    request<{ username: string; mustChangePassword?: boolean }>('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  logout: () => request('/api/auth/logout', { method: 'POST' }),
  me: () => request<{ authenticated: boolean; username?: string; mustChangePassword?: boolean }>('/api/auth/me'),
  changePassword: (currentPassword: string, newPassword: string) =>
    request('/api/auth/change-password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) }),

  getAdminConfig: () => request<Record<string, unknown>>('/api/admin/config'),
  updateAdminConfig: (data: Record<string, unknown>) =>
    request('/api/admin/config', { method: 'PUT', body: JSON.stringify(data) }),

  getAdminChapters: (flowSlug = 'default') =>
    request<import('./types').AdminChapter[]>(flowAdminPath(flowSlug, '/chapters')),
  createChapter: (flowSlug: string, data: Record<string, unknown>) =>
    request(flowAdminPath(flowSlug, '/chapters'), { method: 'POST', body: JSON.stringify(data) }),
  updateChapter: (flowSlug: string, id: number, data: Record<string, unknown>) =>
    request(flowAdminPath(flowSlug, `/chapters/${id}`), { method: 'PUT', body: JSON.stringify(data) }),
  deleteChapter: (flowSlug: string, id: number) =>
    request(flowAdminPath(flowSlug, `/chapters/${id}`), { method: 'DELETE' }),
  reorderChapters: (flowSlug: string, orderedIds: number[]) =>
    request(flowAdminPath(flowSlug, '/chapters/reorder'), { method: 'POST', body: JSON.stringify(orderedIds) }),

  getFlowChapterVideos: (flowSlug = 'default') =>
    request<import('./types').AdminChapterVideo[]>(flowAdminPath(flowSlug, '/chapter-videos')),
  getChapterVideos: (flowSlug: string, chapterId: number) =>
    request<import('./types').AdminChapterVideo[]>(flowAdminPath(flowSlug, `/chapters/${chapterId}/videos`)),
  createChapterVideo: (flowSlug: string, chapterId: number, data: Record<string, unknown>) =>
    request(flowAdminPath(flowSlug, `/chapters/${chapterId}/videos`), { method: 'POST', body: JSON.stringify(data) }),
  updateChapterVideo: (flowSlug: string, chapterId: number, videoId: number, data: Record<string, unknown>) =>
    request(flowAdminPath(flowSlug, `/chapters/${chapterId}/videos/${videoId}`), { method: 'PUT', body: JSON.stringify(data) }),
  deleteChapterVideo: (flowSlug: string, chapterId: number, videoId: number) =>
    request(flowAdminPath(flowSlug, `/chapters/${chapterId}/videos/${videoId}`), { method: 'DELETE' }),
  reorderChapterVideos: (flowSlug: string, chapterId: number, orderedIds: number[]) =>
    request(flowAdminPath(flowSlug, `/chapters/${chapterId}/videos/reorder`), { method: 'POST', body: JSON.stringify(orderedIds) }),

  getSeedMessages: (flowSlug = 'default') =>
    request<Array<{ id: number; role: string; text: string; sortOrder: number }>>(flowAdminPath(flowSlug, '/seed-messages')),
  createSeedMessage: (flowSlug: string, data: Record<string, unknown>) =>
    request(flowAdminPath(flowSlug, '/seed-messages'), { method: 'POST', body: JSON.stringify(data) }),
  updateSeedMessage: (flowSlug: string, id: number, data: Record<string, unknown>) =>
    request(flowAdminPath(flowSlug, `/seed-messages/${id}`), { method: 'PUT', body: JSON.stringify(data) }),
  deleteSeedMessage: (flowSlug: string, id: number) =>
    request(flowAdminPath(flowSlug, `/seed-messages/${id}`), { method: 'DELETE' }),

  getChatSessions: (flowSlug = 'default') =>
    request<Array<{ sessionId: string; lastMessage: string; lastAt: string; count: number }>>(flowAdminPath(flowSlug, '/chat/sessions')),
  getSessionMessages: (sessionId: string) => request<import('./types').ChatMsg[]>(`/api/admin/chat/${sessionId}`),
  adminReply: (sessionId: string, text: string) =>
    request('/api/admin/chat/reply', { method: 'POST', body: JSON.stringify({ sessionId, text }) }),

  getFlow: (slug = 'default') =>
    request<import('./types').FlowDetail>(`/api/admin/flows/${encodeURIComponent(slug)}`),
  updateFlow: (slug: string, data: { projectName?: string; projectData?: import('./types').FlowProject }) =>
    request(`/api/admin/flows/${encodeURIComponent(slug)}`, { method: 'PUT', body: JSON.stringify(data) }),
  getFlows: () => request<import('./types').FlowSummary[]>('/api/admin/flows'),
  createFlow: (data: { slug: string; projectName: string; projectData?: import('./types').FlowProject; isEnabled?: boolean }) =>
    request('/api/admin/flows', { method: 'POST', body: JSON.stringify(data) }),
  setFlowEnabled: (slug: string, isEnabled: boolean) =>
    request(`/api/admin/flows/${encodeURIComponent(slug)}/enabled`, { method: 'PATCH', body: JSON.stringify({ isEnabled }) }),
  deleteFlow: (slug: string) => request(`/api/admin/flows/${encodeURIComponent(slug)}`, { method: 'DELETE' }),
  duplicateFlow: (slug: string, data: { newSlug: string; newProjectName: string; isEnabled?: boolean }) =>
    request(`/api/admin/flows/${encodeURIComponent(slug)}/duplicate`, { method: 'POST', body: JSON.stringify(data) }),

  postHeartbeat: (sessionId: string, chapterId: number, secondsWatched: number) =>
    request('/api/demo/analytics/heartbeat', {
      method: 'POST',
      body: JSON.stringify({ sessionId, chapterId, secondsWatched }),
    }),

  logEvent: (sessionId: string, eventType: string, data?: { chapterId?: number; toasterId?: number; dataJson?: string; flowSlug?: string }) =>
    request('/api/demo/analytics/event', {
      method: 'POST',
      body: JSON.stringify({
        sessionId,
        eventType,
        chapterId: data?.chapterId,
        toasterId: data?.toasterId,
        dataJson: data?.dataJson,
        flowSlug: data?.flowSlug,
      }),
    }),

  getToasters: (flowSlug = 'default') =>
    request<Array<import('./types').VideoToaster & { id: number; isEnabled: boolean; sortOrder: number }>>(flowAdminPath(flowSlug, '/toasters')),
  createToaster: (flowSlug: string, data: Record<string, unknown>) =>
    request(flowAdminPath(flowSlug, '/toasters'), { method: 'POST', body: JSON.stringify(data) }),
  updateToaster: (flowSlug: string, id: number, data: Record<string, unknown>) =>
    request(flowAdminPath(flowSlug, `/toasters/${id}`), { method: 'PUT', body: JSON.stringify(data) }),
  deleteToaster: (flowSlug: string, id: number) =>
    request(flowAdminPath(flowSlug, `/toasters/${id}`), { method: 'DELETE' }),

  getPausePoints: (flowSlug = 'default') =>
    request<Array<{
      id: number; chapterId: number | null; triggerAtSeconds: number; prompt: string;
      fieldId: string; inputType: string; optionsJson: string | null; required: boolean;
      placeholder: string | null; isEnabled: boolean; sortOrder: number;
    }>>(flowAdminPath(flowSlug, '/pause-points')),
  createPausePoint: (flowSlug: string, data: Record<string, unknown>) =>
    request(flowAdminPath(flowSlug, '/pause-points'), { method: 'POST', body: JSON.stringify(data) }),
  updatePausePoint: (flowSlug: string, id: number, data: Record<string, unknown>) =>
    request(flowAdminPath(flowSlug, `/pause-points/${id}`), { method: 'PUT', body: JSON.stringify(data) }),
  deletePausePoint: (flowSlug: string, id: number) =>
    request(flowAdminPath(flowSlug, `/pause-points/${id}`), { method: 'DELETE' }),

  getChapterAnalytics: (flowSlug = 'default') =>
    request<Array<{ id: number; name: string; totalWatchSeconds: number; viewerCount: number; avgWatchSeconds: number }>>(
      flowAdminPath(flowSlug, '/analytics/chapters'),
    ),

  getEngagementLog: (flowSlug = 'default', limit = 100) =>
    request<import('./types').EngagementSession[]>(`${flowAdminPath(flowSlug, '/analytics/engagement')}?limit=${limit}`),

  getFlowLeads: (flowSlug = 'default', limit = 200) =>
    request<import('./types').LeadSubmissionRow[]>(`${flowAdminPath(flowSlug, '/leads')}?limit=${limit}`),

  exportFlowLeadsCsv: async (flowSlug: string) => {
    const res = await fetch(`${flowAdminPath(flowSlug, '/leads/export')}`, { credentials: 'include' })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }))
      throw new Error(err.error || res.statusText)
    }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${flowSlug}-leads.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  },

  submitLead: (data: {
    sessionId: string
    flowSlug: string
    source: string
    answers: Record<string, string>
    chapterId?: number
    nodeId?: string
  }) =>
    request('/api/demo/analytics/lead', {
      method: 'POST',
      body: JSON.stringify({
        sessionId: data.sessionId,
        flowSlug: data.flowSlug,
        source: data.source,
        answersJson: JSON.stringify(data.answers),
        chapterId: data.chapterId,
        nodeId: data.nodeId,
      }),
    }),

  getScheduledEvent: (slug: string) =>
    request<import('./types').ScheduledEventPublic>(`/api/demo/event/${encodeURIComponent(slug)}`),

  getScheduledEvents: () => request<import('./types').ScheduledEvent[]>('/api/admin/events'),
  createScheduledEvent: (data: Record<string, unknown>) =>
    request('/api/admin/events', { method: 'POST', body: JSON.stringify(data) }),
  updateScheduledEvent: (id: number, data: Record<string, unknown>) =>
    request(`/api/admin/events/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteScheduledEvent: (id: number) => request(`/api/admin/events/${id}`, { method: 'DELETE' }),

  uploadMedia: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return fetch('/api/admin/upload', { method: 'POST', credentials: 'include', body: form }).then(async res => {
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.statusText)
      return res.json() as Promise<{ url: string; fileName: string }>
    })
  },

  getIntegrationsStatus: () => request<{
    slackBotTokenConfigured: boolean
    slackSigningSecretConfigured: boolean
    teamsAppIdConfigured: boolean
    teamsAppPasswordConfigured: boolean
  }>('/api/admin/integrations/status'),
}

export function getSessionId(): string {
  const key = 'videotool_session'
  let id = localStorage.getItem(key)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(key, id)
  }
  return id
}
