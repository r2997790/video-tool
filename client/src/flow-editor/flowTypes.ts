export type QuestionInputType = 'text' | 'textarea' | 'radio' | 'multiselect' | 'date' | 'datetime' | 'email'
export type BranchAction = 'question' | 'chapter' | 'webpage'

export interface FlowQuestionField {
  id: string
  label: string
  inputType?: QuestionInputType
  type?: string
  placeholder?: string
  required?: boolean
  options?: string[]
}

export interface FlowBranchRule {
  match: string
  action?: BranchAction
  targetNodeId?: string
  url?: string
}

export interface BranchResult {
  action: BranchAction
  targetNodeId?: string
  url?: string
}

export interface FlowFormField {
  id: string
  label: string
  inputType: QuestionInputType
  placeholder?: string
  required?: boolean
  options?: string[]
}

export interface FlowAiChatConfig {
  heading?: string
  durationSeconds: number
  interactionCount: number
  mode: 'fixed' | 'random'
  prompts: string[]
  randomPool: string[]
  useAiReply: boolean
}

export function pickAiChatPrompts(node: { parameters: Record<string, unknown> }): string[] {
  const count = Math.max(1, (node.parameters.interactionCount as number) || 1)
  const mode = (node.parameters.mode as string) || 'fixed'
  const fixed = ((node.parameters.prompts as string[]) || []).filter(Boolean)
  const pool = ((node.parameters.randomPool as string[]) || fixed).filter(Boolean)

  if (mode === 'random' && pool.length > 0) {
    const shuffled = [...pool].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, Math.min(count, shuffled.length))
  }
  return fixed.slice(0, count)
}
