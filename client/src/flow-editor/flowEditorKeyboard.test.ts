import { describe, expect, it, vi } from 'vitest'
import {
  buildClipboardFromProject,
  getSelectedNodeIds,
  handleFlowEditorKeyDown,
  setFlowEditorClipboard,
} from './flowEditorKeyboard'
import { newNode } from './flowSchema'
import type { FlowProject } from '../types'

function buildProject(): FlowProject {
  const start = newNode('question', 'Start')
  const pause = newNode('pause', 'Pause')
  return {
    projectName: 'Test',
    nodes: [start, pause],
    connections: [{ from: start.id, to: pause.id }],
  }
}

function mockKeyEvent(key: string, mod = true): KeyboardEvent {
  return {
    key,
    ctrlKey: mod,
    metaKey: false,
    preventDefault: vi.fn(),
    target: { tagName: 'DIV' },
  } as unknown as KeyboardEvent
}

describe('flowEditorKeyboard', () => {
  it('getSelectedNodeIds filters synthetic canvas ids', () => {
    const project = buildProject()
    const start = project.nodes[0]
    const ids = getSelectedNodeIds(project, ['video-group:abc', start.id], null)
    expect(ids).toEqual([start.id])
  })

  it('buildClipboardFromProject copies nodes and internal connections', () => {
    const project = buildProject()
    const clip = buildClipboardFromProject(project, project.nodes.map(n => n.id))
    expect(clip?.nodes).toHaveLength(2)
    expect(clip?.connections).toEqual([{ from: project.nodes[0].id, to: project.nodes[1].id }])
  })

  it('handleFlowEditorKeyDown cut copies then removes nodes', () => {
    const project = buildProject()
    const pause = project.nodes[1]
    const applyEdit = vi.fn()
    const selectNode = vi.fn()
    const setSelectedNodeIds = vi.fn()

    const handled = handleFlowEditorKeyDown(
      mockKeyEvent('x'),
      {
        project,
        selectedNodeIds: [pause.id],
        selectedNodeId: null,
        selectedEdge: null,
        applyEdit,
        onDeleteSelection: vi.fn(),
        selectNode,
        setSelectedNodeIds,
      },
    )

    expect(handled).toBe(true)
    expect(applyEdit).toHaveBeenCalledWith({ type: 'removeNodes', nodeIds: [pause.id] })
    expect(selectNode).toHaveBeenCalledWith(null)
  })

  it('handleFlowEditorKeyDown paste inserts cloned nodes', () => {
    const project = buildProject()
    setFlowEditorClipboard(buildClipboardFromProject(project, [project.nodes[1].id]))
    const applyEdit = vi.fn()
    const selectNode = vi.fn()
    const setSelectedNodeIds = vi.fn()

    const handled = handleFlowEditorKeyDown(
      mockKeyEvent('v'),
      {
        project,
        selectedNodeIds: [],
        selectedNodeId: null,
        selectedEdge: null,
        applyEdit,
        onDeleteSelection: vi.fn(),
        selectNode,
        setSelectedNodeIds,
      },
    )

    expect(handled).toBe(true)
    expect(applyEdit).toHaveBeenCalledWith(expect.objectContaining({ type: 'insert', target: { scope: 'top' } }))
  })
})
