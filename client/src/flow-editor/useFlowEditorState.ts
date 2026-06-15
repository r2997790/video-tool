import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../api'
import type { AdminChapter, AdminChapterVideo, FlowNode, FlowProject, ScheduledEvent } from '../types'
import { emptyProject } from './flowSchema'
import { migrateLegacyPlaybackToFlow } from './flowMigration'
import { ensureLegacyChapterVideos } from './flowTimeline'
import { validateFlowProject } from './validateFlow'

const VIEW_KEY = 'videotool_flow_editor_view'

export type FlowEditorView = 'timeline' | 'visual'

export function useFlowEditorState(flowSlug: string) {
  const [loading, setLoading] = useState(true)
  const [projectName, setProjectName] = useState('Demo Flow')
  const [project, setProject] = useState<FlowProject>(emptyProject())
  const [savedSnapshot, setSavedSnapshot] = useState('')
  const [chapters, setChapters] = useState<AdminChapter[]>([])
  const [chapterVideos, setChapterVideos] = useState<AdminChapterVideo[]>([])
  const [events, setEvents] = useState<ScheduledEvent[]>([])
  const [flowEnabled, setFlowEnabled] = useState(false)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [view, setView] = useState<FlowEditorView>(() =>
    (localStorage.getItem(VIEW_KEY) as FlowEditorView) || 'timeline')
  const [saving, setSaving] = useState(false)

  const selectedNode = useMemo(
    () => project.nodes.find(n => n.id === selectedNodeId) ?? null,
    [project.nodes, selectedNodeId],
  )

  const dirty = useMemo(
    () => JSON.stringify({ projectName, project }) !== savedSnapshot,
    [projectName, project, savedSnapshot],
  )

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const [flowRes, chRes, vidRes, toasterRes, pauseRes] = await Promise.all([
        api.getFlow(flowSlug),
        api.getAdminChapters(flowSlug),
        api.getFlowChapterVideos(flowSlug),
        api.getToasters(flowSlug).catch(() => []),
        api.getPausePoints(flowSlug).catch(() => []),
      ])
      setChapters(chRes)
      setChapterVideos(vidRes)
      setFlowEnabled(!!flowRes.isEnabled)
      setProjectName(flowRes.projectName || flowRes.projectData.projectName || 'Demo Flow')
      let pd = flowRes.projectData as FlowProject
      pd = migrateLegacyPlaybackToFlow(pd, vidRes, toasterRes, pauseRes)
      pd = ensureLegacyChapterVideos(pd, vidRes)
      setProject({ ...pd, projectName: flowRes.projectName || pd.projectName })
      setSavedSnapshot(JSON.stringify({
        projectName: flowRes.projectName || pd.projectName,
        project: { ...pd, projectName: flowRes.projectName || pd.projectName },
      }))
    } finally {
      setLoading(false)
    }
  }, [flowSlug])

  useEffect(() => {
    reload()
    api.getScheduledEvents().then(setEvents).catch(() => setEvents([]))
  }, [reload])

  const setViewMode = useCallback((v: FlowEditorView) => {
    setView(v)
    localStorage.setItem(VIEW_KEY, v)
  }, [])

  const updateProject = useCallback((next: FlowProject) => {
    setProject({ ...next, projectName })
  }, [projectName])

  const save = useCallback(async (force = false) => {
    const warnings = validateFlowProject(project, {
      chapterCount: chapters.length,
      isEnabled: flowEnabled,
      chapterVideos,
    })
    if (warnings.length && !force) return { ok: false as const, warnings }

    setSaving(true)
    try {
      await api.updateFlow(flowSlug, { projectName, projectData: project })
      setSavedSnapshot(JSON.stringify({ projectName, project }))
      return { ok: true as const, warnings: [] as string[] }
    } finally {
      setSaving(false)
    }
  }, [flowSlug, projectName, project, chapters.length, flowEnabled, chapterVideos])

  const refreshVideos = useCallback(() => {
    api.getFlowChapterVideos(flowSlug).then(setChapterVideos).catch(() => setChapterVideos([]))
    api.getAdminChapters(flowSlug).then(setChapters).catch(() => setChapters([]))
  }, [flowSlug])

  const selectNode = useCallback((node: FlowNode | null) => {
    setSelectedNodeId(node?.id ?? null)
  }, [])

  return {
    loading,
    flowSlug,
    projectName,
    setProjectName,
    project,
    updateProject,
    chapters,
    chapterVideos,
    events,
    flowEnabled,
    selectedNode,
    selectedNodeId,
    selectNode,
    view,
    setViewMode,
    dirty,
    saving,
    save,
    reload,
    refreshVideos,
  }
}

export type FlowEditorState = ReturnType<typeof useFlowEditorState>
