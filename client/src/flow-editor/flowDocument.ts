import type { FlowNode, FlowProject } from '../types'
import { validateFlowProject } from './validateFlow'

export const FLOW_DOCUMENT_SCHEMA_VERSION = 1 as const

export interface FlowDocumentMetadata {
  slug?: string
  description?: string
  tags?: string[]
}

export interface FlowDocument {
  schemaVersion: typeof FLOW_DOCUMENT_SCHEMA_VERSION
  exportedAt: string
  projectName: string
  project: FlowProject
  metadata?: FlowDocumentMetadata
}

export interface ParseFlowDocumentResult {
  document: FlowDocument
  warnings: string[]
}

function isFlowNode(value: unknown): value is FlowNode {
  if (!value || typeof value !== 'object') return false
  const n = value as Record<string, unknown>
  return typeof n.id === 'string' && typeof n.type === 'string' && typeof n.name === 'string'
}

function normalizeProject(raw: unknown, projectName: string): FlowProject {
  if (!raw || typeof raw !== 'object') {
    return { projectName, nodes: [], connections: [] }
  }
  const obj = raw as Record<string, unknown>
  if (Array.isArray(obj.nodes)) {
    return {
      projectName: (obj.projectName as string) || projectName,
      nodes: (obj.nodes as FlowNode[]).filter(isFlowNode),
      connections: Array.isArray(obj.connections)
        ? (obj.connections as FlowProject['connections']).filter(
            c => c && typeof c.from === 'string' && typeof c.to === 'string',
          )
        : [],
    }
  }
  return { projectName, nodes: [], connections: [] }
}

export function serializeFlowDocument(projectName: string, project: FlowProject, metadata?: FlowDocumentMetadata): string {
  const doc: FlowDocument = {
    schemaVersion: FLOW_DOCUMENT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    projectName,
    project: {
      projectName: project.projectName || projectName,
      nodes: project.nodes,
      connections: project.connections,
    },
    metadata,
  }
  return JSON.stringify(doc, null, 2)
}

export function parseFlowDocument(json: string): ParseFlowDocumentResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    throw new Error('Invalid JSON file')
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Flow document must be a JSON object')
  }

  const root = parsed as Record<string, unknown>
  const warnings: string[] = []

  let projectName: string
  let project: FlowProject

  if (root.schemaVersion === FLOW_DOCUMENT_SCHEMA_VERSION && root.project) {
    projectName = (root.projectName as string) || 'Imported Flow'
    project = normalizeProject(root.project, projectName)
  } else if (root.nodes && Array.isArray(root.nodes)) {
    projectName = (root.projectName as string) || 'Imported Flow'
    project = normalizeProject(root, projectName)
    warnings.push('Imported legacy flow format without schema version.')
  } else {
    throw new Error('Unrecognized flow document format')
  }

  const schemaVersion = root.schemaVersion
  if (schemaVersion != null && schemaVersion !== FLOW_DOCUMENT_SCHEMA_VERSION) {
    warnings.push(`Schema version ${String(schemaVersion)} may not match editor version ${FLOW_DOCUMENT_SCHEMA_VERSION}.`)
  }

  const doc: FlowDocument = {
    schemaVersion: FLOW_DOCUMENT_SCHEMA_VERSION,
    exportedAt: (root.exportedAt as string) || new Date().toISOString(),
    projectName,
    project,
    metadata: root.metadata as FlowDocumentMetadata | undefined,
  }

  return { document: doc, warnings }
}

export function remapNodeIds(project: FlowProject, prefix = 'import'): FlowProject {
  const idMap = new Map<string, string>()
  for (const node of project.nodes) {
    idMap.set(node.id, `${prefix}-${node.id}-${Math.random().toString(36).slice(2, 7)}`)
  }

  const remapId = (id: string) => idMap.get(id) ?? id

  const nodes = project.nodes.map(n => ({
    ...n,
    id: remapId(n.id),
    parameters: remapParameters(n.parameters, idMap),
  }))

  const connections = project.connections.map(c => ({
    from: remapId(c.from),
    to: remapId(c.to),
  }))

  return { ...project, nodes, connections }
}

function remapParameters(
  params: Record<string, unknown>,
  idMap: Map<string, string>,
): Record<string, unknown> {
  const next = { ...params }
  if (typeof next.targetNodeId === 'string' && idMap.has(next.targetNodeId)) {
    next.targetNodeId = idMap.get(next.targetNodeId)
  }
  if (Array.isArray(next.rules)) {
    next.rules = (next.rules as Array<Record<string, unknown>>).map(rule => {
      if (typeof rule.targetNodeId === 'string' && idMap.has(rule.targetNodeId)) {
        return { ...rule, targetNodeId: idMap.get(rule.targetNodeId) }
      }
      return rule
    })
  }
  if (typeof next.defaultTarget === 'string' && idMap.has(next.defaultTarget)) {
    next.defaultTarget = idMap.get(next.defaultTarget)
  }
  return next
}

export function mergeFlowProjects(base: FlowProject, incoming: FlowProject): FlowProject {
  const remapped = remapNodeIds(incoming, 'merge')
  const existingIds = new Set(base.nodes.map(n => n.id))
  const idFix = new Map<string, string>()

  const nodes = [...base.nodes]
  for (const n of remapped.nodes) {
    let id = n.id
    while (existingIds.has(id)) {
      id = `${id}-${Math.random().toString(36).slice(2, 4)}`
    }
    idFix.set(n.id, id)
    existingIds.add(id)
    nodes.push({ ...n, id })
  }

  const remapConnId = (id: string) => idFix.get(id) ?? id
  const connections = [
    ...base.connections,
    ...remapped.connections.map(c => ({
      from: remapConnId(c.from),
      to: remapConnId(c.to),
    })),
  ]
  return { ...base, nodes, connections }
}

export function validateFlowDocument(
  doc: FlowDocument,
  options?: Parameters<typeof validateFlowProject>[1],
): string[] {
  const structural = validateFlowProject(doc.project, options)
  return structural
}

export function downloadFlowDocument(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.flow.json') ? filename : `${filename}.flow.json`
  a.click()
  URL.revokeObjectURL(url)
}
