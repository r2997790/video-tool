import { useRef, useState } from 'react'
import { AdminMenu } from '../components/AdminMenu'
import { FLOW_STEPS } from './flowSchema'
import { FLOW_NODE_COLORS } from './flowNodeColors'
import {
  downloadFlowDocument,
  mergeFlowProjects,
  parseFlowDocument,
  serializeFlowDocument,
  validateFlowDocument,
} from './flowDocument'
import type { FlowEditorState } from './useFlowEditorState'
import { ConfirmModal } from '../components/ConfirmModal'
import type { FlowNode } from '../types'
import { FlowWorkflowNav } from './FlowWorkflowNav'

interface FlowEditorToolbarProps {
  state: FlowEditorState
  onSave: (force?: boolean) => void
  onAddNode: (type: FlowNode['type']) => void
  onAutoLayout: () => void
}

const ADD_STEP_GROUPS: { label: string; types: FlowNode['type'][] }[] = [
  { label: 'Structure', types: ['chapter', 'video'] },
  { label: 'Registration', types: ['event'] },
  { label: 'Interaction', types: ['question', 'pause', 'aichat', 'toaster'] },
  { label: 'Logic', types: ['branch'] },
]

export function FlowEditorToolbar({
  state,
  onSave,
  onAddNode,
  onAutoLayout,
}: FlowEditorToolbarProps) {
  const {
    projectName,
    setProjectName,
    view,
    setViewMode,
    dirty,
    saving,
    flowSlug,
    project,
    chapters,
    chapterVideos,
    flowEnabled,
    importDocument,
  } = state

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importModal, setImportModal] = useState<{ warnings: string[]; mode: 'replace' | 'merge' } | null>(null)
  const [pendingDoc, setPendingDoc] = useState<ReturnType<typeof parseFlowDocument> | null>(null)

  const stepByType = Object.fromEntries(FLOW_STEPS.map(s => [s.type, s])) as Record<FlowNode['type'], (typeof FLOW_STEPS)[number]>

  const addStepGroups = ADD_STEP_GROUPS.map(group => ({
    label: group.label,
    items: group.types.map(type => {
      const step = stepByType[type]
      return {
        id: type,
        label: step.label,
        description: step.desc,
        color: FLOW_NODE_COLORS[type],
        onClick: () => onAddNode(type),
      }
    }),
  }))

  const handleExport = () => {
    const json = serializeFlowDocument(projectName, project, {
      slug: flowSlug,
      description: `Exported from ${flowSlug}`,
    })
    downloadFlowDocument(`${flowSlug}.flow.json`, json)
  }

  const handleImportFile = async (file: File) => {
    const text = await file.text()
    try {
      const parsed = parseFlowDocument(text)
      const validation = validateFlowDocument(parsed.document, {
        chapterCount: chapters.length,
        isEnabled: flowEnabled,
        chapterVideos,
      })
      setPendingDoc(parsed)
      setImportModal({
        warnings: [...parsed.warnings, ...validation],
        mode: project.nodes.length > 0 ? 'merge' : 'replace',
      })
    } catch (e) {
      alert(String(e))
    }
  }

  const confirmImport = () => {
    if (!pendingDoc || !importModal) return
    const { document: doc } = pendingDoc
    if (importModal.mode === 'replace') {
      importDocument(doc.project, doc.projectName)
    } else {
      const merged = mergeFlowProjects(project, doc.project)
      importDocument(merged, projectName)
    }
    setImportModal(null)
    setPendingDoc(null)
  }

  const moreItems = [
    { id: 'export', label: 'Export JSON', description: 'Download flow as a JSON file', onClick: handleExport },
    {
      id: 'import',
      label: 'Import JSON',
      description: 'Load flow from a JSON file',
      onClick: () => fileInputRef.current?.click(),
    },
    {
      id: 'auto-layout',
      label: 'Auto-layout',
      description: 'Arrange visual nodes from timeline order',
      disabled: view === 'timeline',
      onClick: onAutoLayout,
    },
  ]

  return (
    <>
      <div className="flow-editor-toolbar">
        <div className="flow-editor-toolbar-row flow-editor-toolbar-primary">
          <div className="flow-editor-name-col">
            <input
              className="admin-input flow-editor-name-input"
              aria-label="Project name"
              value={projectName}
              onChange={e => setProjectName(e.target.value)}
            />
            <FlowWorkflowNav />
          </div>
          <div className="flow-view-toggle" role="tablist" aria-label="Editor view">
            {(['timeline', 'visual'] as const).map(v => (
              <button
                key={v}
                type="button"
                role="tab"
                aria-selected={view === v}
                className={`flow-view-toggle-btn${view === v ? ' is-active' : ''}`}
                onClick={() => setViewMode(v)}
              >
                {v === 'timeline' ? 'Timeline' : 'Visual'}
              </button>
            ))}
          </div>
          <div className="flow-editor-toolbar-actions">
            <AdminMenu
              align="left"
              groups={addStepGroups}
              trigger={<button type="button" className="admin-btn admin-btn-sm admin-btn-primary">+ Add step</button>}
            />
            <AdminMenu
              align="right"
              items={moreItems}
              trigger={<button type="button" className="admin-btn admin-btn-sm" aria-label="More actions">More</button>}
            />
            <button
              type="button"
              className="admin-btn admin-btn-primary flow-editor-save-btn"
              disabled={!dirty || saving}
              onClick={() => onSave()}
            >
              {saving ? 'Saving…' : dirty ? 'Save flow' : 'Saved'}
            </button>
          </div>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.flow.json,application/json"
        style={{ display: 'none' }}
        onChange={e => {
          const file = e.target.files?.[0]
          if (file) void handleImportFile(file)
          e.target.value = ''
        }}
      />

      <ConfirmModal
        open={!!importModal && !!pendingDoc}
        title="Import flow JSON?"
        message={
          importModal
            ? `${importModal.warnings.length ? importModal.warnings.join(' ') + ' ' : ''}${
              importModal.mode === 'merge'
                ? 'Merge imported nodes into the current flow?'
                : 'Replace the current flow with the imported file?'
            }`
            : ''
        }
        confirmLabel={importModal?.mode === 'merge' ? 'Merge' : 'Replace'}
        cancelLabel="Cancel"
        onConfirm={confirmImport}
        onCancel={() => { setImportModal(null); setPendingDoc(null) }}
      />
    </>
  )
}
