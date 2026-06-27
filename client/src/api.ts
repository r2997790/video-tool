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
  getHome: () => request<import('./types').HomePageData>('/api/demo/home'),
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

  postHeartbeat: (sessionId: string, chapterId: number, secondsWatched: number, eventCtx?: { eventSlug?: string; eventOccurrenceStartUtc?: string; viewerEmail?: string }) =>
    request('/api/demo/analytics/heartbeat', {
      method: 'POST',
      body: JSON.stringify({
        sessionId,
        chapterId,
        secondsWatched,
        eventSlug: eventCtx?.eventSlug,
        eventOccurrenceStartUtc: eventCtx?.eventOccurrenceStartUtc,
        viewerEmail: eventCtx?.viewerEmail,
      }),
    }),

  logEvent: (sessionId: string, eventType: string, data?: {
    chapterId?: number
    toasterId?: number
    dataJson?: string
    flowSlug?: string
    eventSlug?: string
    eventOccurrenceStartUtc?: string
    viewerEmail?: string
  }) =>
    request('/api/demo/analytics/event', {
      method: 'POST',
      body: JSON.stringify({
        sessionId,
        eventType,
        chapterId: data?.chapterId,
        toasterId: data?.toasterId,
        dataJson: data?.dataJson,
        flowSlug: data?.flowSlug,
        eventSlug: data?.eventSlug,
        eventOccurrenceStartUtc: data?.eventOccurrenceStartUtc,
        viewerEmail: data?.viewerEmail,
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

  getScheduledEvent: (slug: string, sessionId?: string, email?: string) => {
    const q = new URLSearchParams()
    if (sessionId) q.set('sessionId', sessionId)
    if (email) q.set('email', email)
    const qs = q.toString()
    return request<import('./types').ScheduledEventPublic>(
      `/api/demo/event/${encodeURIComponent(slug)}${qs ? `?${qs}` : ''}`,
    )
  },

  getEventPrivacy: (slug: string, locale?: string, timezone?: string) => {
    const q = new URLSearchParams()
    if (locale) q.set('locale', locale)
    if (timezone) q.set('timezone', timezone)
    return request<import('./types').EventPrivacyNotice>(
      `/api/demo/event/${encodeURIComponent(slug)}/privacy?${q.toString()}`,
    )
  },

  registerForEvent: (slug: string, data: {
    sessionId: string
    email: string
    name?: string
    answersJson?: string
    consentGiven: boolean
    locale?: string
    timezone?: string
  }) =>
    request<{ id: number; status: string; email: string }>(
      `/api/demo/event/${encodeURIComponent(slug)}/register`,
      { method: 'POST', body: JSON.stringify(data) },
    ),

  getScheduledEvents: () => request<import('./types').ScheduledEvent[]>('/api/admin/events'),
  getScheduledEventAdmin: (id: number) => request<import('./types').ScheduledEvent>(`/api/admin/events/${id}`),
  getEventsSummary: () => request<import('./types').EventsSummary>('/api/admin/events/summary'),
  previewEventOccurrence: (id: number) => request<import('./types').EventOccurrencePreview>(`/api/admin/events/${id}/preview`),
  createScheduledEvent: (data: Record<string, unknown>) =>
    request('/api/admin/events', { method: 'POST', body: JSON.stringify(data) }),
  createInstantEvent: (data: Record<string, unknown>) =>
    request<import('./types').ScheduledEvent>('/api/admin/events/instant', { method: 'POST', body: JSON.stringify(data) }),
  goLiveEvent: (id: number) =>
    request<import('./types').ScheduledEvent>(`/api/admin/events/${id}/go-live`, { method: 'POST' }),
  duplicateEvent: (id: number, data?: { newSlug?: string; newTitle?: string }) =>
    request<import('./types').ScheduledEvent>(`/api/admin/events/${id}/duplicate`, { method: 'POST', body: JSON.stringify(data ?? {}) }),
  updateScheduledEvent: (id: number, data: Record<string, unknown>) =>
    request(`/api/admin/events/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteScheduledEvent: (id: number) => request(`/api/admin/events/${id}`, { method: 'DELETE' }),

  getEventAttendees: (eventId: number, status?: string) =>
    request<import('./types').EventAttendee[]>(
      `/api/admin/events/${eventId}/attendees${status ? `?status=${encodeURIComponent(status)}` : ''}`,
    ),
  addEventAttendee: (eventId: number, data: { email: string; name?: string; status?: string }) =>
    request(`/api/admin/events/${eventId}/attendees`, { method: 'POST', body: JSON.stringify(data) }),
  updateEventAttendee: (eventId: number, attendeeId: number, data: { status?: string; rejectedReason?: string; name?: string }) =>
    request(`/api/admin/events/${eventId}/attendees/${attendeeId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  importEventAttendeesCsv: (eventId: number, csvContent: string, defaultStatus?: string) =>
    request<{ imported: number }>(`/api/admin/events/${eventId}/attendees/import-csv`, {
      method: 'POST',
      body: JSON.stringify({ csvContent, defaultStatus }),
    }),
  exportEventAttendeesCsv: async (eventId: number) => {
    const res = await fetch(`/api/admin/events/${eventId}/attendees/export-csv`, { credentials: 'include' })
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.statusText)
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `event-${eventId}-attendees.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  },
  syncEventCrm: (eventId: number) =>
    request<{ imported: number }>(`/api/admin/events/${eventId}/sync-crm`, { method: 'POST' }),
  getEventAnalytics: (eventId: number) =>
    request<import('./types').EventAnalyticsResponse>(`/api/admin/events/${eventId}/analytics`),

  getEventEngagementLog: (eventId: number, limit = 100) =>
    request<import('./types').EngagementSession[]>(`/api/admin/events/${eventId}/engagement?limit=${limit}`),

  getEventLeads: (eventId: number, limit = 200) =>
    request<import('./types').LeadSubmissionRow[]>(`/api/admin/events/${eventId}/leads?limit=${limit}`),

  exportEventLeadsCsv: async (eventId: number) => {
    const res = await fetch(`/api/admin/events/${eventId}/leads/export`, { credentials: 'include' })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }))
      throw new Error(err.error || res.statusText)
    }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `event-${eventId}-leads.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  },

  getEventChatSessions: (eventId: number) =>
    request<Array<{ sessionId: string; lastMessage: string; lastAt: string; count: number }>>(
      `/api/admin/events/${eventId}/chat/sessions`,
    ),

  getAccessLists: () => request<import('./types').AccessListEntry[]>('/api/admin/access-lists'),
  addAccessListEntry: (data: { listType: string; matchType: string; value: string; note?: string }) =>
    request('/api/admin/access-lists', { method: 'POST', body: JSON.stringify(data) }),
  deleteAccessListEntry: (id: number) => request(`/api/admin/access-lists/${id}`, { method: 'DELETE' }),

  getPrivacyRegions: () => request<import('./types').PrivacyPolicyRegion[]>('/api/admin/privacy-regions'),
  updatePrivacyRegion: (regionCode: string, data: { noticeHtml?: string; consentRequired?: boolean; policyUrl?: string }) =>
    request(`/api/admin/privacy-regions/${encodeURIComponent(regionCode)}`, { method: 'PUT', body: JSON.stringify(data) }),

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
