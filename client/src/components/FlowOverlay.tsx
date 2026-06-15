import { useState } from 'react'
import { Button } from '../components/Button'
import type { FlowNode } from '../types'
import { getNodeHeading, getNodeQuestions, getNodeSubtext, validateFormAnswers } from '../flow-editor/flowRuntime'
import type { QuestionInputType } from '../flow-editor/flowTypes'

interface FlowOverlayProps {
  node: FlowNode
  onSubmit: (answers: Record<string, string>) => void
  onCancel?: () => void
}

function inputHtmlType(inputType: QuestionInputType): string {
  if (inputType === 'datetime') return 'datetime-local'
  if (inputType === 'email') return 'email'
  if (inputType === 'date') return 'date'
  return 'text'
}

export function FlowOverlay({ node, onSubmit, onCancel }: FlowOverlayProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [multiSelected, setMultiSelected] = useState<Record<string, Set<string>>>({})
  const [error, setError] = useState('')
  const questions = getNodeQuestions(node)
  const hasRequiredQuestions = questions.some(q => q.required)
  const showSkip = onCancel && !hasRequiredQuestions

  const getMultiValues = (fieldId: string) => multiSelected[fieldId] || new Set<string>()

  const toggleMulti = (fieldId: string, option: string) => {
    setMultiSelected(prev => {
      const next = new Set(prev[fieldId] || [])
      if (next.has(option)) next.delete(option)
      else next.add(option)
      return { ...prev, [fieldId]: next }
    })
    setError('')
  }

  const submit = () => {
    const merged: Record<string, string> = { ...answers }
    for (const q of questions) {
      if (q.inputType === 'multiselect') {
        merged[q.id] = [...getMultiValues(q.id)].join(', ')
      }
    }
    const validationError = validateFormAnswers(questions, merged)
    if (validationError) {
      setError(validationError)
      return
    }
    setError('')
    onSubmit(merged)
  }

  return (
    <div className="vd-gate-overlay" onClick={e => { if (e.target === e.currentTarget && onCancel) onCancel() }}>
      <div className="vd-gate-card vd-gate-card-wide">
        <div className="vd-gate-icon-wrap">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" />
          </svg>
        </div>
        <h3 className="vd-gate-heading">{getNodeHeading(node)}</h3>
        {getNodeSubtext(node) && <p className="vd-gate-sub">{getNodeSubtext(node)}</p>}
        <div className="vd-gate-form">
          {questions.map(q => (
            <div key={q.id} className="vd-gate-field">
              <label className="vd-gate-label">
                {q.label}{q.required && <span className="vd-req-star"> *</span>}
              </label>

              {q.inputType === 'textarea' && (
                <textarea
                  className="vd-gate-input vd-gate-textarea"
                  placeholder={q.placeholder}
                  value={answers[q.id] || ''}
                  onChange={e => { setAnswers(a => ({ ...a, [q.id]: e.target.value })); setError('') }}
                />
              )}

              {q.inputType === 'radio' && q.options && (
                <div className="vd-gate-option-group">
                  {q.options.map(opt => (
                    <label key={opt} className="vd-gate-option">
                      <input
                        type="radio"
                        name={q.id}
                        value={opt}
                        checked={answers[q.id] === opt}
                        onChange={e => { setAnswers(a => ({ ...a, [q.id]: e.target.value })); setError('') }}
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              )}

              {q.inputType === 'multiselect' && q.options && (
                <div className="vd-gate-option-group">
                  {q.options.map(opt => (
                    <label key={opt} className="vd-gate-option">
                      <input
                        type="checkbox"
                        checked={getMultiValues(q.id).has(opt)}
                        onChange={() => toggleMulti(q.id, opt)}
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              )}

              {!['textarea', 'radio', 'multiselect'].includes(q.inputType) && (
                <input
                  className="vd-gate-input"
                  type={inputHtmlType(q.inputType)}
                  placeholder={q.placeholder}
                  value={answers[q.id] || ''}
                  onChange={e => { setAnswers(a => ({ ...a, [q.id]: e.target.value })); setError('') }}
                  onKeyDown={e => e.key === 'Enter' && q.inputType !== 'textarea' && submit()}
                />
              )}
            </div>
          ))}
          {error && <p className="vd-gate-error">{error}</p>}
        </div>
        <div className="vd-gate-actions">
          <Button variant="green" onClick={submit}>Continue</Button>
          {showSkip && <Button variant="ghost-dark" onClick={onCancel}>Skip</Button>}
        </div>
      </div>
    </div>
  )
}
