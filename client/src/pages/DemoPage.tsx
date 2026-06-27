import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import * as signalR from '@microsoft/signalr'
import { api, getSessionId } from '../api'
import { Button } from '../components/Button'
import { CancelIcon, CheckIcon, MessageIcon, RefreshIcon } from '../components/icons/uiIcons'
import { FlowEventRegistrationOverlay } from '../components/FlowEventRegistrationOverlay'
import { FlowOverlay } from '../components/FlowOverlay'
import { VideoPlayer } from '../components/VideoPlayer'
import { advanceFromNode, initializeFlow, isFlowBlockingNode, onVideoEnded, shouldShowFlowOverlay } from '../flow-editor/flowRuntime'
import { collectChapterPlaybackTriggers, mergePauseTriggers, mergeToasterTriggers, resolveVideoNodePlayback, type FlowQuestionTrigger } from '../flow-editor/flowPlayback'
import { pickAiChatPrompts } from '../flow-editor/flowTypes'
import { VideoToasterPopup } from '../components/VideoToasterPopup'
import { parseUtcMs } from '../utils/eventCountdown'
import type { Chapter, ChatMsg, DemoConfigResponse, FlowNode, Gate, ScheduledEventPublic, VideoPausePoint, VideoToaster } from '../types'

const UNLOCK_KEY = 'videotool_demo_unlocked'

function applyTheme(theme: NonNullable<DemoConfigResponse['config']['theme']>) {
  const root = document.documentElement
  root.style.setProperty('--accent-site', theme.primaryColor)
  root.style.setProperty('--accent-deep', theme.accentColor)
  root.style.setProperty('--vd-bg', theme.backgroundColor)
  root.style.setProperty('--vd-surface', theme.surfaceColor)
  root.style.setProperty('--vd-text', theme.textColor)
  const font = `'${theme.fontFamily}', system-ui, sans-serif`
  root.style.setProperty('--font-display', font)
  root.style.setProperty('--font-body', font)
}

export function DemoPage() {
  const { flowSlug = '' } = useParams<{ flowSlug: string }>()
  const [loadError, setLoadError] = useState('')
  const [data, setData] = useState<DemoConfigResponse | null>(null)
  const [activeId, setActiveId] = useState<number | null>(null)
  const [activeVideoId, setActiveVideoId] = useState<number | null>(null)
  const [activeVideoNodeId, setActiveVideoNodeId] = useState<string | null>(null)
  const [pendingChapter, setPendingChapter] = useState<Chapter | null>(null)
  const [gateAnswers, setGateAnswers] = useState<Record<string, string>>({})
  const [gateError, setGateError] = useState('')
  const [unlockedIds, setUnlockedIds] = useState<Set<number>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem(UNLOCK_KEY) || '[]')) }
    catch { return new Set() }
  })
  const [videoKey, setVideoKey] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [flowNode, setFlowNode] = useState<FlowNode | null>(null)
  const [flowAnswers, setFlowAnswers] = useState<Record<string, string>>({})
  const [aiChatActive, setAiChatActive] = useState(false)
  const [playbackSeconds, setPlaybackSeconds] = useState(0)
  const [activeToaster, setActiveToaster] = useState<(VideoToaster & { triggerKey?: string }) | null>(null)
  const [shownTriggerKeys, setShownTriggerKeys] = useState<Set<string>>(new Set())
  const [activePausePoint, setActivePausePoint] = useState<(VideoPausePoint & { triggerKey?: string }) | null>(null)
  const [activeQuestionTrigger, setActiveQuestionTrigger] = useState<FlowQuestionTrigger | null>(null)
  const [flowEventData, setFlowEventData] = useState<ScheduledEventPublic | null>(null)
  const [chatOpen, setChatOpen] = useState(false)
  const [chaptersOpen, setChaptersOpen] = useState(false)
  const [retryKey, setRetryKey] = useState(0)
  const maxWatchedRef = useRef(0)
  const chatScrollRef = useRef<HTMLDivElement>(null)
  const hubRef = useRef<signalR.HubConnection | null>(null)
  const aiChatRunRef = useRef(0)
  const sessionId = getSessionId()
  const [searchParams] = useSearchParams()
  const eventSlug = searchParams.get('event')
  const viewerEmail = typeof localStorage !== 'undefined' ? localStorage.getItem(`videotool_event_email_${eventSlug ?? ''}`) ?? undefined : undefined
  const eventOccurrenceRef = useRef<string | undefined>(undefined)

  const eventCtx = useMemo(() => ({
    eventSlug: eventSlug ?? undefined,
    eventOccurrenceStartUtc: eventOccurrenceRef.current,
    viewerEmail,
  }), [eventSlug, viewerEmail])

  const logEvent = useCallback((eventType: string, extra?: { chapterId?: number; toasterId?: number; data?: Record<string, unknown> }) => {
    api.logEvent(sessionId, eventType, {
      chapterId: extra?.chapterId,
      toasterId: extra?.toasterId,
      dataJson: extra?.data ? JSON.stringify(extra.data) : undefined,
      flowSlug,
      ...eventCtx,
    }).catch(() => {})
  }, [sessionId, flowSlug, eventCtx])

  const persistLead = useCallback((
    source: string,
    answers: Record<string, string>,
    extra?: { chapterId?: number; nodeId?: string },
  ) => {
    if (!flowSlug) return
    api.submitLead({ sessionId, flowSlug, source, answers, chapterId: extra?.chapterId, nodeId: extra?.nodeId }).catch(() => {})
  }, [sessionId, flowSlug])

  const pickChapter = useCallback((chapters: Chapter[], config: DemoConfigResponse['config'], unlocked: Set<number>) => {
    const available = chapters.filter(c => !(c.isLocked && c.gate && !unlocked.has(c.id)))
    if (available.length === 0) return chapters[0]?.id ?? null
    if (config.chapterPickEnabled) return available[0].id
    return available[Math.floor(Math.random() * available.length)].id
  }, [])

  useEffect(() => {
    if (!flowSlug) return
    setLoadError('')
    api.getDemoConfig(flowSlug).then(async res => {
      setData(res)
      if (res.config.theme) applyTheme(res.config.theme)
      if (res.chapters.length > 0) {
        let unlocked: Set<number>
        try { unlocked = new Set(JSON.parse(localStorage.getItem(UNLOCK_KEY) || '[]')) }
        catch { unlocked = new Set() }

        const chapterParam = searchParams.get('chapter')
        const eventParam = searchParams.get('event')
        let picked: number | null = null
        let shouldAutoplay = res.config.autoplay

        if (chapterParam) {
          const id = parseInt(chapterParam, 10)
          if (res.chapters.some(c => c.id === id)) picked = id
        }

        if (eventParam) {
          try {
            const ev = await api.getScheduledEvent(eventParam, sessionId, viewerEmail)
            eventOccurrenceRef.current = ev.nextStartsAtUtc ?? ev.startsAtUtc
            if (ev.accessDenied) {
              window.location.replace(`/event/${eventParam}`)
              return
            }
            if (ev.flowSlug && ev.flowSlug !== flowSlug) {
              const q = new URLSearchParams(searchParams)
              q.delete('flow')
              window.location.replace(`/flow/${encodeURIComponent(ev.flowSlug)}?${q.toString()}`)
              return
            }
            if (!ev.isLive) {
              const target = parseUtcMs(ev.nextStartsAtUtc ?? ev.startsAtUtc)
              const server = parseUtcMs(ev.serverNowUtc)
              if (target != null && server != null) {
                const remaining = target - (Date.now() + (server - Date.now()))
                if (remaining > 0) {
                  window.location.replace(`/event/${eventParam}`)
                  return
                }
              }
            }
            if (!picked && ev.defaultChapterId && res.chapters.some(c => c.id === ev.defaultChapterId)) {
              picked = ev.defaultChapterId
            }
            shouldAutoplay = true
          } catch { /* event missing — fall through */ }
        }

        if (!picked) picked = pickChapter(res.chapters, res.config, unlocked)
        if (picked) {
          setActiveId(picked)
          if (shouldAutoplay || chapterParam) {
            setPlaying(true)
            setVideoKey(k => k + 1)
          }
        }
      }
      const initial: ChatMsg[] = []
      if (res.config.seedChatEnabled && res.seedMessages.length > 0) {
        initial.push(...res.seedMessages)
      } else {
        initial.push({ role: 'assistant', text: "Hi there. I can answer questions about this demo. What would you like to know?" })
      }
      setChatMessages(initial)

      const flow = res.flow?.projectData
      if (flow?.nodes?.length) {
        initializeFlow(flow, {
          setFlowNode,
          setActiveChapter: (id) => setActiveId(id),
          setActiveVideo: (chId, vid, nodeId) => {
            setActiveId(chId)
            setActiveVideoId(vid)
            setActiveVideoNodeId(nodeId)
          },
          setPlaying,
          bumpVideoKey: () => setVideoKey(k => k + 1),
          redirect: (url) => { window.location.href = url },
        })
      }
    }).catch(() => setLoadError('This flow is not available. It may be disabled or does not exist.'))
  }, [pickChapter, searchParams, flowSlug, retryKey])

  useEffect(() => {
    setPlaybackSeconds(0)
    setShownTriggerKeys(new Set())
    setActiveToaster(null)
    setActivePausePoint(null)
    setActiveQuestionTrigger(null)
    maxWatchedRef.current = 0
  }, [activeId, activeVideoId, videoKey])

  const playbackTriggers = useMemo(() => {
    const flow = data?.flow?.projectData
    const { toasters: flowToasters, pauses: flowPauses, questions: flowQuestions, aichats: flowAichats } =
      collectChapterPlaybackTriggers(flow, activeId, activeVideoNodeId)
    return {
      toasters: mergeToasterTriggers(data?.toasters ?? [], flowToasters),
      pauses: mergePauseTriggers(data?.pausePoints ?? [], flowPauses),
      questions: flowQuestions,
      aichats: flowAichats,
    }
  }, [data?.toasters, data?.pausePoints, data?.flow?.projectData, activeId, activeVideoNodeId])

  useEffect(() => {
    if (!activeId) return
    const match = playbackTriggers.toasters.find(t =>
      !shownTriggerKeys.has(t.triggerKey) &&
      playbackSeconds >= t.triggerAtSeconds &&
      (t.chapterId == null || t.chapterId === activeId)
    )
    if (match) {
      setActiveToaster(match)
      setShownTriggerKeys(prev => new Set([...prev, match.triggerKey]))
      logEvent('toaster_shown', { toasterId: match.id > 0 ? match.id : undefined, chapterId: activeId, data: { triggerKey: match.triggerKey } })
    }
  }, [playbackSeconds, playbackTriggers.toasters, activeId, shownTriggerKeys, logEvent])

  useEffect(() => {
    if (!activeId || activePausePoint || activeQuestionTrigger) return
    const match = playbackTriggers.pauses.find(p =>
      !shownTriggerKeys.has(p.triggerKey) &&
      playbackSeconds >= p.triggerAtSeconds &&
      (p.chapterId == null || p.chapterId === activeId)
    )
    if (match) {
      setActivePausePoint(match)
      setShownTriggerKeys(prev => new Set([...prev, match.triggerKey]))
      logEvent('pause_question_shown', { chapterId: activeId, data: { pausePointId: match.id, triggerKey: match.triggerKey } })
    }
  }, [playbackSeconds, playbackTriggers.pauses, activeId, shownTriggerKeys, activePausePoint, logEvent])

  useEffect(() => {
    if (!activeId || activePausePoint || activeQuestionTrigger) return
    const match = playbackTriggers.questions.find(q =>
      !shownTriggerKeys.has(q.triggerKey) &&
      playbackSeconds >= q.triggerAtSeconds &&
      (q.chapterId == null || q.chapterId === activeId)
    )
    if (match) {
      setActiveQuestionTrigger(match)
      setShownTriggerKeys(prev => new Set([...prev, match.triggerKey]))
      logEvent('flow_step', { chapterId: activeId, data: { triggerKey: match.triggerKey, nodeType: 'question' } })
    }
  }, [playbackSeconds, playbackTriggers.questions, activeId, shownTriggerKeys, activePausePoint, activeQuestionTrigger, logEvent])

  useEffect(() => {
    if (!activeId || flowNode || activePausePoint || activeQuestionTrigger) return
    const match = playbackTriggers.aichats.find(a =>
      !shownTriggerKeys.has(a.triggerKey) &&
      playbackSeconds >= a.triggerAtSeconds &&
      (a.chapterId == null || a.chapterId === activeId)
    )
    if (match) {
      setShownTriggerKeys(prev => new Set([...prev, match.triggerKey]))
      setFlowNode(match.node)
      setPlaying(false)
      logEvent('flow_step', { chapterId: activeId, data: { triggerKey: match.triggerKey, nodeType: 'aichat' } })
    }
  }, [playbackSeconds, playbackTriggers.aichats, activeId, shownTriggerKeys, flowNode, activePausePoint, activeQuestionTrigger, logEvent])

  useEffect(() => {
    if (flowNode?.type !== 'event') {
      setFlowEventData(null)
      return
    }
    const slug = flowNode.parameters.eventSlug as string
    if (slug) {
      const viewerEmail = typeof localStorage !== 'undefined'
        ? localStorage.getItem(`videotool_event_email_${slug}`) ?? undefined
        : undefined
      api.getScheduledEvent(slug, sessionId, viewerEmail).then(setFlowEventData).catch(() => setFlowEventData(null))
    } else {
      setFlowEventData(null)
    }
  }, [flowNode?.id, flowNode?.type, flowNode?.parameters, sessionId])
  useEffect(() => {
    if (!activeToaster || activeToaster.durationSeconds <= 0) return
    const timer = setTimeout(() => {
      logEvent('toaster_dismissed', { toasterId: activeToaster.id > 0 ? activeToaster.id : undefined, data: { auto: true, triggerKey: activeToaster.triggerKey } })
      setActiveToaster(null)
    }, activeToaster.durationSeconds * 1000)
    return () => clearTimeout(timer)
  }, [activeToaster?.triggerKey, activeToaster?.durationSeconds, logEvent])

  useEffect(() => {
    if (!activePausePoint) return
    const timeout = activePausePoint.timeoutSeconds ?? 0
    if (timeout <= 0) return
    const timer = setTimeout(() => {
      logEvent('pause_question_dismissed', {
        chapterId: activeId ?? undefined,
        data: { pausePointId: activePausePoint.id, auto: true, triggerKey: activePausePoint.triggerKey },
      })
      setActivePausePoint(null)
      setPlaying(true)
    }, timeout * 1000)
    return () => clearTimeout(timer)
  }, [activePausePoint, activeId, logEvent])

  const pauseQuestionNode: FlowNode | null = activePausePoint ? {
    id: `pause-${activePausePoint.triggerKey || activePausePoint.id}`,
    type: 'question',
    name: 'Video pause',
    parameters: {
      prompt: activePausePoint.prompt,
      fieldId: activePausePoint.fieldId,
      inputType: activePausePoint.inputType,
      options: activePausePoint.options,
      required: activePausePoint.required,
      placeholder: activePausePoint.placeholder,
    },
  } : activeQuestionTrigger ? {
    id: activeQuestionTrigger.flowNodeId,
    type: 'question',
    name: 'Video question',
    parameters: {
      prompt: activeQuestionTrigger.prompt,
      fieldId: activeQuestionTrigger.fieldId,
      inputType: activeQuestionTrigger.inputType,
      options: activeQuestionTrigger.options,
      required: activeQuestionTrigger.required,
      placeholder: activeQuestionTrigger.placeholder,
    },
  } : null

  const videoHeld = !!activePausePoint || !!activeQuestionTrigger
    || (!!flowNode && flowNode.type !== 'aichat' && isFlowBlockingNode(flowNode, data?.flow?.projectData))
    || !!pendingChapter?.gate

  const handleTimeUpdate = useCallback((seconds: number) => {
    setPlaybackSeconds(seconds)
    if (seconds > maxWatchedRef.current) {
      maxWatchedRef.current = seconds
      if (activeId) {
        api.postHeartbeat(sessionId, activeId, seconds, eventCtx).catch(() => {})
      }
    }
  }, [activeId, sessionId, eventCtx])

  const advanceFlow = useCallback((currentNode: FlowNode, answers: Record<string, string>) => {
    if (!data?.flow?.projectData) { setFlowNode(null); return }
    const merged = { ...flowAnswers, ...answers }
    setFlowAnswers(merged)
    if (Object.keys(answers).length > 0 && currentNode.type === 'question') {
      persistLead(`flow_${currentNode.type}`, answers, { nodeId: currentNode.id })
    }
    logEvent('flow_step', { data: { nodeId: currentNode.id, nodeType: currentNode.type } })

    advanceFromNode(currentNode, merged, data.flow.projectData, {
      setFlowNode,
      setActiveChapter: (id) => setActiveId(id),
      setActiveVideo: (chId, vid, nodeId) => {
        setActiveId(chId)
        setActiveVideoId(vid)
        setActiveVideoNodeId(nodeId)
      },
      setPlaying,
      bumpVideoKey: () => setVideoKey(k => k + 1),
      redirect: (url) => { window.location.href = url },
    })
  }, [data, flowAnswers, logEvent, persistLead])

  const handleVideoEnded = useCallback(() => {
    if (!data?.flow?.projectData || !activeVideoNodeId) return
    const videoNode = data.flow.projectData.nodes.find(n => n.id === activeVideoNodeId)
    if (!videoNode || videoNode.type !== 'video') return
    onVideoEnded(videoNode, flowAnswers, data.flow.projectData, {
      setFlowNode,
      setActiveChapter: (id) => setActiveId(id),
      setActiveVideo: (chId, vid, nodeId) => {
        setActiveId(chId)
        setActiveVideoId(vid)
        setActiveVideoNodeId(nodeId)
      },
      setPlaying,
      bumpVideoKey: () => setVideoKey(k => k + 1),
      redirect: (url) => { window.location.href = url },
    })
  }, [data, activeVideoNodeId, flowAnswers])

  const completeFlowEvent = useCallback(() => {
    if (!flowNode || flowNode.type !== 'event') return
    advanceFlow(flowNode, flowAnswers)
  }, [flowNode, flowAnswers, advanceFlow])

  useEffect(() => {
    if (!flowNode || flowNode.type !== 'aichat' || !data?.config) return
    const runId = ++aiChatRunRef.current
    const prompts = pickAiChatPrompts(flowNode)
    const duration = Math.max(10, (flowNode.parameters.durationSeconds as number) || 60)
    const heading = (flowNode.parameters.heading as string) || 'AI Chat'
    const gap = prompts.length > 0 ? duration / prompts.length : duration

    setAiChatActive(true)
    if (heading) {
      setChatMessages(prev => [...prev, { role: 'assistant', text: `${heading} — share your thoughts over the next ${duration} seconds.` }])
    }

    const timers: number[] = []

    prompts.forEach((prompt, i) => {
      const t = window.setTimeout(() => {
        if (aiChatRunRef.current !== runId) return
        setChatMessages(prev => [...prev, { role: 'assistant', text: prompt }])
        logEvent('flow_step', { data: { step: 'aichat_prompt', prompt } })
      }, (i + 1) * gap * 1000)
      timers.push(t)
    })

    const endTimer = window.setTimeout(() => {
      if (aiChatRunRef.current !== runId) return
      setAiChatActive(false)
      advanceFlow(flowNode, flowAnswers)
    }, duration * 1000)
    timers.push(endTimer)

    return () => {
      timers.forEach(clearTimeout)
      setAiChatActive(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flowNode?.id])

  useEffect(() => {
    if (flowNode !== null || !activeId || activePausePoint || pendingChapter?.gate) return
    setPlaying(true)
  }, [flowNode, activeId, activePausePoint, pendingChapter?.gate])

  useEffect(() => {
    if (!data?.config.chatEnabled) return

    const hub = new signalR.HubConnectionBuilder()
      .withUrl('/hubs/chat')
      .withAutomaticReconnect()
      .build()

    hub.on('ReceiveMessage', (msg: ChatMsg & { sessionId?: string }) => {
      if (msg.sessionId && msg.sessionId !== sessionId) return
      setChatMessages(prev => {
        if (msg.role === 'user' && prev.some(m => m.role === 'user' && m.text === msg.text)) return prev
        return [...prev, { role: msg.role as ChatMsg['role'], text: msg.text, id: msg.id, source: msg.source }]
      })
      if (data.config.notificationsEnabled && msg.role !== 'user' && Notification.permission === 'granted') {
        new Notification('New message', { body: msg.text })
      }
    })

    hub.start().then(() => hub.invoke('JoinSession', sessionId)).catch(console.error)
    hubRef.current = hub
    return () => { hub.stop() }
  }, [data?.config.chatEnabled, data?.config.notificationsEnabled, sessionId])

  useEffect(() => {
    if (data?.config.notificationsEnabled && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [data?.config.notificationsEnabled])

  useEffect(() => {
    if (chatScrollRef.current)
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight
  }, [chatMessages, chatLoading])

  const chapters = data?.chapters ?? []
  const config = data?.config
  const activeChapter = chapters.find(c => c.id === activeId) ?? null
  const activeVideoNode = data?.flow?.projectData?.nodes.find(n => n.id === activeVideoNodeId) ?? null
  const activeVideo = resolveVideoNodePlayback(activeChapter, activeVideoId, activeVideoNode)
  const playerChapter = activeChapter && activeVideo
    ? { id: activeChapter.id, name: activeVideo.name, videoType: activeVideo.videoType, videoValue: activeVideo.videoValue, isLive: activeVideo.isLive }
    : activeChapter
  const theme = config?.theme
  const chatTitle = theme?.chatTitle || 'Chat'
  const brandName = theme?.brandName || 'Demo'
  const chatSubtitle = config?.demoChatSubtitle || 'Ask questions about this demo'
  const logoUrl = theme?.logoUrl

  const showChapterDuration = (ch: Chapter) => (ch.showDuration ?? config?.showDuration) && ch.duration

  const isLocked = (ch: Chapter) => !!(ch.isLocked && ch.gate && !unlockedIds.has(ch.id))

  const persistUnlocked = (ids: Set<number>) => {
    try { localStorage.setItem(UNLOCK_KEY, JSON.stringify([...ids])) } catch { /* ignore */ }
  }

  const selectChapter = (ch: Chapter) => {
    if (!config?.chapterPickEnabled) return
    if (isLocked(ch)) {
      setPendingChapter(ch)
      setGateAnswers({})
      setGateError('')
    } else {
      setActiveId(ch.id)
      setVideoKey(k => k + 1)
      setPlaying(true)
      logEvent('chapter_switch', { chapterId: ch.id })
    }
  }

  const submitGate = () => {
    if (!pendingChapter?.gate) return
    const gate = pendingChapter.gate as Gate
    for (const q of gate.questions) {
      if (q.required && !gateAnswers[q.id]?.trim()) {
        setGateError('Please fill in all required fields.')
        return
      }
    }
    const emailQ = gate.questions.find(q => q.type === 'email')
    if (emailQ && gateAnswers[emailQ.id] && !/\S+@\S+\.\S+/.test(gateAnswers[emailQ.id])) {
      setGateError('Please enter a valid email address.')
      return
    }
    const newIds = new Set([...unlockedIds, pendingChapter.id])
    setUnlockedIds(newIds)
    persistUnlocked(newIds)
    persistLead('gate', gateAnswers, { chapterId: pendingChapter.id })
    setActiveId(pendingChapter.id)
    setVideoKey(k => k + 1)
    setPlaying(true)
    setPendingChapter(null)
  }

  const dismissToaster = (auto = false) => {
    if (!activeToaster) return
    logEvent('toaster_dismissed', { toasterId: activeToaster.id, data: { auto } })
    setActiveToaster(null)
  }

  const submitPauseAnswer = (answers: Record<string, string>) => {
    if (activePausePoint) {
      persistLead('pause_question', answers, { chapterId: activeId ?? undefined, nodeId: String(activePausePoint.id) })
      logEvent('pause_question_answered', {
        chapterId: activeId ?? undefined,
        data: { pausePointId: activePausePoint.id, fieldId: activePausePoint.fieldId, answer: answers[activePausePoint.fieldId] },
      })
      setActivePausePoint(null)
      return
    }
    if (activeQuestionTrigger) {
      persistLead('flow_question', answers, { chapterId: activeId ?? undefined, nodeId: activeQuestionTrigger.flowNodeId })
      setActiveQuestionTrigger(null)
    }
  }

  const sendChat = async () => {
    const msg = chatInput.trim()
    if (!msg || chatLoading || !config?.chatEnabled) return
    setChatInput('')
    setChatMessages(prev => [...prev, { role: 'user', text: msg }])
    setChatLoading(true)
    logEvent('chat_message', { chapterId: activeId ?? undefined, data: { role: 'user' } })
    try {
      const chapterContext = activeChapter ? `${activeChapter.name} — ${activeChapter.description}` : undefined
      if (hubRef.current?.state === signalR.HubConnectionState.Connected) {
        await hubRef.current.invoke('SendMessage', sessionId, msg, chapterContext, flowSlug)
      } else {
        await api.sendChat(sessionId, msg, chapterContext, flowSlug)
      }
    } catch {
      setChatMessages(prev => [...prev, { role: 'assistant', text: "Sorry, I'm unable to respond right now." }])
    }
    setChatLoading(false)
  }

  if (loadError) {
    return (
      <div className="vd-event-lobby">
        <div className="vd-event-card">
          <h1 className="vd-event-title">Demo unavailable</h1>
          <p className="vd-event-message">{loadError}</p>
          {flowSlug && <p style={{ fontSize: 13, color: '#9b9d9f' }}>Flow: <code>{flowSlug}</code></p>}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 20, flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-green btn-sm btn-with-icon" onClick={() => { setLoadError(''); setRetryKey(k => k + 1) }}>
              <RefreshIcon />
              Retry
            </button>
            <a className="btn btn-ghost-dark btn-sm btn-with-icon" href="mailto:support@example.com" style={{ textDecoration: 'none' }}>
              <MessageIcon />
              Contact support
            </a>
          </div>
        </div>
      </div>
    )
  }

  if (!data || !config) {
    return (
      <div className="vd-loading-shell">
        <div className="vd-loading-spinner" aria-hidden="true" />
        <p>Loading demo…</p>
      </div>
    )
  }

  const chatPanel = (
    <>
      <div className="vd-sidebar-head">
        <p className="vd-sidebar-title">{chatTitle}</p>
        <p className="vd-sidebar-sub">{chatSubtitle}</p>
        <button type="button" className="vd-mobile-close" onClick={() => setChatOpen(false)} aria-label="Close chat">×</button>
      </div>
      <div className="vd-chat-messages" ref={chatScrollRef}>
        {chatMessages.map((m, i) => (
          <div key={i} className={`vd-msg vd-msg-${m.role === 'user' ? 'user' : 'assistant'}`}>
            {m.role !== 'user' && <span className="vd-msg-dot" aria-hidden="true" />}
            {m.source && m.source !== 'demo' && m.role !== 'user' && (
              <span className="vd-msg-source">{m.source}</span>
            )}
            <p className="vd-msg-text">{m.text}</p>
          </div>
        ))}
        {chatLoading && (
          <div className="vd-msg vd-msg-assistant">
            <span className="vd-msg-dot" aria-hidden="true" />
            <div className="vd-typing"><span /><span /><span /></div>
          </div>
        )}
      </div>
      <div className="vd-chat-input-row">
        <input
          className="vd-chat-input"
          type="text"
          placeholder="Ask a question..."
          value={chatInput}
          onChange={e => setChatInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendChat()}
        />
        <button className="vd-send-btn" onClick={sendChat} disabled={!chatInput.trim() || chatLoading} aria-label="Send">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M22 2L11 13" /><path d="M22 2L15 22 11 13 2 9l20-7z" />
          </svg>
        </button>
      </div>
    </>
  )

  return (
    <div className="vd-shell">
      <aside className={`vd-sidebar vd-chapters-panel${chaptersOpen ? ' is-open' : ''}`}>
        <div className="vd-sidebar-head">
          {logoUrl ? (
            <img className="vd-brand-logo" src={logoUrl} alt={brandName} />
          ) : (
            <p className="vd-sidebar-title">{brandName}</p>
          )}
          <p className="vd-sidebar-sub">Chapters</p>
          {!config.chapterPickEnabled && (
            <p className="vd-sidebar-sub">Random chapter mode — selection disabled</p>
          )}
          <button type="button" className="vd-mobile-close" onClick={() => setChaptersOpen(false)} aria-label="Close chapters">×</button>
        </div>
        <div className="vd-chapter-list">
          {chapters.map(ch => {
            const active = ch.id === activeId
            const locked = isLocked(ch)
            const pickDisabled = !config.chapterPickEnabled
            return (
              <button
                key={ch.id}
                className={`vd-chapter-item${active ? ' is-active' : ''}${locked ? ' is-locked' : ''}${pickDisabled ? ' is-pick-disabled' : ''}`}
                onClick={() => selectChapter(ch)}
                disabled={pickDisabled && !active}
              >
                <span className="vd-ch-num">{ch.num}</span>
                <div className="vd-ch-info">
                  <p className="vd-ch-title">{ch.name}</p>
                  <p className="vd-ch-desc">{ch.description}</p>
                  <div className="vd-ch-foot">
                    {showChapterDuration(ch) && <span className="vd-ch-dur">{ch.duration}</span>}
                    {locked && <span className="vd-ch-badge vd-badge-locked">Details required</span>}
                    {!locked && ch.isLocked && ch.gate && <span className="vd-ch-badge vd-badge-unlocked">Unlocked</span>}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </aside>

      <main className="vd-main">
        <div className="vd-video-outer">
          <div className="vd-video-wrap">
            <VideoPlayer
              chapter={playerChapter}
              playing={playing}
              held={videoHeld}
              videoKey={videoKey}
              pauseEnabled={config.pauseEnabled}
              onPlay={() => { setPlaying(true); setVideoKey(k => k + 1) }}
              onTimeUpdate={handleTimeUpdate}
              onEnded={handleVideoEnded}
            />

            {activeToaster && (
              <VideoToasterPopup
                toaster={activeToaster}
                onDismiss={() => dismissToaster(false)}
                onDownload={() => logEvent('toaster_download', {
                  toasterId: activeToaster.id,
                  chapterId: activeId ?? undefined,
                  data: { fileName: activeToaster.downloadFileName, url: activeToaster.downloadUrl },
                })}
                onLinkClick={() => logEvent('toaster_link_click', {
                  toasterId: activeToaster.id,
                  chapterId: activeId ?? undefined,
                  data: { url: activeToaster.linkUrl },
                })}
              />
            )}

            {pauseQuestionNode && (
              <FlowOverlay
                node={pauseQuestionNode}
                onSubmit={submitPauseAnswer}
              />
            )}

            {aiChatActive && (
              <div className="vd-aichat-badge">AI chat active</div>
            )}

            {flowNode?.type === 'event' && (
              <FlowEventRegistrationOverlay
                node={flowNode}
                eventData={flowEventData}
                onComplete={completeFlowEvent}
              />
            )}

            {flowNode && shouldShowFlowOverlay(flowNode, data?.flow?.projectData) && (
              <FlowOverlay
                node={flowNode}
                onSubmit={answers => advanceFlow(flowNode, answers)}
                onCancel={() => setFlowNode(null)}
              />
            )}

            {pendingChapter?.gate && (
              <div className="vd-gate-overlay" onClick={e => { if (e.target === e.currentTarget) setPendingChapter(null) }}>
                <div className="vd-gate-card">
                  <div className="vd-gate-icon-wrap">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </div>
                  <h3 className="vd-gate-heading">{pendingChapter.gate.heading}</h3>
                  <p className="vd-gate-sub">{pendingChapter.gate.subtext}</p>
                  <div className="vd-gate-form">
                    {pendingChapter.gate.questions.map(q => (
                      <div key={q.id} className="vd-gate-field">
                        <label className="vd-gate-label">
                          {q.label}{q.required && <span className="vd-req-star"> *</span>}
                        </label>
                        <input
                          className="vd-gate-input"
                          type={q.type}
                          placeholder={q.placeholder}
                          value={gateAnswers[q.id] || ''}
                          onChange={e => { setGateAnswers(a => ({ ...a, [q.id]: e.target.value })); setGateError('') }}
                          onKeyDown={e => e.key === 'Enter' && submitGate()}
                        />
                      </div>
                    ))}
                    {gateError && <p className="vd-gate-error">{gateError}</p>}
                  </div>
                  <div className="vd-gate-actions">
                    <Button variant="green" icon={<CheckIcon />} onClick={submitGate}>Continue to video</Button>
                    <Button variant="ghost-dark" icon={<CancelIcon />} onClick={() => setPendingChapter(null)}>Cancel</Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="vd-now-playing-bar">
          <div className="vd-now-playing-meta">
            <span className="vd-np-eyebrow">Now playing</span>
            <span className="vd-np-title">{activeVideo?.name || activeChapter?.name}</span>
          </div>
          {(activeVideo?.duration || (activeChapter && showChapterDuration(activeChapter))) && (
            <span className="vd-np-dur">{activeVideo?.duration || activeChapter?.duration}</span>
          )}
        </div>
      </main>

      {config.chatEnabled && (
        <aside className={`vd-sidebar vd-chat-panel${chatOpen ? ' is-open' : ''}`}>
          {chatPanel}
        </aside>
      )}

      <nav className="vd-mobile-bottom-nav" aria-label="Demo navigation">
        <button
          type="button"
          className={`vd-bottom-nav-btn${chaptersOpen ? ' is-active' : ''}`}
          onClick={() => { setChaptersOpen(v => !v); if (!chaptersOpen) setChatOpen(false) }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M4 6h16M4 12h16M4 18h10" />
          </svg>
          <span>Chapters</span>
        </button>
        {config.chatEnabled && (
          <button
            type="button"
            className={`vd-bottom-nav-btn${chatOpen ? ' is-active' : ''}`}
            onClick={() => { setChatOpen(v => !v); if (!chatOpen) setChaptersOpen(false) }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span>Chat</span>
          </button>
        )}
      </nav>

      {(chatOpen || chaptersOpen) && (
        <div
          className="vd-drawer-backdrop"
          onClick={() => { setChatOpen(false); setChaptersOpen(false) }}
          aria-hidden="true"
        />
      )}
    </div>
  )
}
