import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'

type FlowNameContextValue = {
  projectName: string
  editable: boolean
  setProjectName: (name: string) => void
  registerEditor: (setter: (name: string) => void) => () => void
  syncFromEditor: (name: string) => void
}

const FlowNameContext = createContext<FlowNameContextValue | null>(null)

export function FlowNameProvider({ children, fallbackName }: { children: ReactNode; fallbackName: string }) {
  const [projectName, setProjectNameState] = useState(fallbackName)
  const [editable, setEditable] = useState(false)
  const editorSetterRef = useRef<((name: string) => void) | null>(null)

  useEffect(() => {
    setProjectNameState(fallbackName)
  }, [fallbackName])

  const setProjectName = useCallback((name: string) => {
    setProjectNameState(name)
    editorSetterRef.current?.(name)
  }, [])

  const registerEditor = useCallback((setter: (name: string) => void) => {
    editorSetterRef.current = setter
    setEditable(true)
    return () => {
      editorSetterRef.current = null
      setEditable(false)
    }
  }, [])

  const syncFromEditor = useCallback((name: string) => {
    setProjectNameState(name)
  }, [])

  const value: FlowNameContextValue = {
    projectName: projectName || fallbackName,
    editable,
    setProjectName,
    registerEditor,
    syncFromEditor,
  }

  return <FlowNameContext.Provider value={value}>{children}</FlowNameContext.Provider>
}

export function useFlowName() {
  const ctx = useContext(FlowNameContext)
  if (!ctx) throw new Error('useFlowName must be used within FlowNameProvider')
  return ctx
}

export function useFlowNameOptional() {
  return useContext(FlowNameContext)
}
