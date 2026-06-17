import { describe, expect, it } from 'vitest'
import { parseFlowDocument, serializeFlowDocument, remapNodeIds, mergeFlowProjects } from './flowDocument'
import { newNode, emptyProject } from './flowSchema'

describe('flowDocument', () => {
  it('round-trips serialize and parse', () => {
    const start = newNode('question', 'Welcome')
    const project = { ...emptyProject(), nodes: [start], connections: [] }
    const json = serializeFlowDocument('My Flow', project, { description: 'test' })
    const { document, warnings } = parseFlowDocument(json)
    expect(document.schemaVersion).toBe(1)
    expect(document.projectName).toBe('My Flow')
    expect(document.project.nodes).toHaveLength(1)
    expect(document.metadata?.description).toBe('test')
    expect(warnings).toHaveLength(0)
  })

  it('remaps node ids on import', () => {
    const a = newNode('question', 'A')
    const b = newNode('question', 'B')
    const project = {
      projectName: 'X',
      nodes: [a, b],
      connections: [{ from: a.id, to: b.id }],
    }
    const remapped = remapNodeIds(project, 'test')
    expect(remapped.nodes[0].id).not.toBe(a.id)
    expect(remapped.connections[0].from).toBe(remapped.nodes[0].id)
    expect(remapped.connections[0].to).toBe(remapped.nodes[1].id)
  })

  it('merges projects without id collisions', () => {
    const a = newNode('question', 'A')
    const base = { projectName: 'Base', nodes: [a], connections: [] }
    const b = newNode('question', 'B')
    const incoming = { projectName: 'Incoming', nodes: [b], connections: [] }
    const merged = mergeFlowProjects(base, incoming)
    expect(merged.nodes).toHaveLength(2)
    expect(new Set(merged.nodes.map(n => n.id)).size).toBe(2)
  })
})
