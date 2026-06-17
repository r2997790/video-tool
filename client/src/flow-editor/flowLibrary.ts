import type { FlowDocument } from './flowDocument'

export type FlowLibraryEntry = {
  id: string
  title: string
  description: string
  document: FlowDocument
}

const modules = import.meta.glob('../../../flow-library/*.flow.json', { eager: true, import: 'default' })

export function loadFlowLibrary(): FlowLibraryEntry[] {
  return Object.entries(modules).map(([path, doc]) => {
    const filename = path.split('/').pop()?.replace('.flow.json', '') ?? 'template'
    const document = doc as FlowDocument
    return {
      id: filename,
      title: document.projectName,
      description: document.metadata?.description ?? document.metadata?.tags?.join(', ') ?? filename,
      document,
    }
  })
}
