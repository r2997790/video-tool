import { useCallback, useMemo, useRef, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  pointerWithin,
  type DragEndEvent,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { DeleteIcon } from '../components/icons/uiIcons'
import type { FlowNode } from '../types'
import { canConnect } from './flowSchema'
import {
  applyTimelineEdit,
  canNestInChapter,
  canNestInVideo,
  chapterLabel,
  nodeSummary,
  projectToTimeline,
  resolveTimelineDragId,
  rowKey,
  segmentSortableId,
  TOP_LEVEL_STEP_TYPES,
  CHAPTER_INTERSTITIAL_TYPES,
  VIDEO_NEST_TYPES,
  type TimelineRow,
  videoLabel,
} from './flowTimeline'
import { insertNodeWithSelection } from './flowInsert'
import type { FlowEditorState } from './useFlowEditorState'

interface TimelineEditorProps {
  state: FlowEditorState
}

const BETWEEN_VIDEO_TYPES = CHAPTER_INTERSTITIAL_TYPES
const TOP_LEVEL_TYPES = new Set<FlowNode['type']>([...TOP_LEVEL_STEP_TYPES, 'chapter', 'toaster', 'pause'])

function formatSeconds(s: number): string {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${String(sec).padStart(2, '0')}`
}

function DropZone({
  id,
  label,
  className = '',
  children,
}: {
  id: string
  label: string
  className?: string
  children?: React.ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div
      ref={setNodeRef}
      className={`timeline-drop-zone${isOver ? ' is-over' : ''} ${className}`.trim()}
    >
      {label}
      {children}
    </div>
  )
}

function SortableRowShell({
  id,
  children,
  className = '',
}: {
  id: string
  children: React.ReactNode
  className?: string
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      className={className}
    >
      <button type="button" className="timeline-drag-handle" {...attributes} {...listeners} aria-label="Drag to reorder">
        ⋮⋮
      </button>
      {children}
    </div>
  )
}

function SortableEventRow({
  node,
  selected,
  onSelect,
  onDelete,
}: {
  node: FlowNode
  selected: boolean
  onSelect: () => void
  onDelete: () => void
}) {
  const triggerAt = (node.parameters.triggerAtSeconds as number) || 0
  const kind = node.type === 'pause' ? 'Pause & Ask'
    : node.type === 'toaster' ? 'Pop-up'
    : node.type === 'question' ? 'Question'
    : node.type === 'aichat' ? 'AI Chat'
    : 'Event'

  return (
    <SortableRowShell id={node.id} className={`timeline-event-row${selected ? ' is-selected' : ''}`}>
      <div className="timeline-row-body" onClick={onSelect}>
        <span className="timeline-event-time">@ {formatSeconds(triggerAt)}</span>
        <span className="timeline-event-kind">{kind}</span>
        <span className="timeline-event-label">{nodeSummary(node)}</span>
        <button type="button" className="admin-btn admin-btn-sm timeline-row-action btn-with-icon" onClick={e => { e.stopPropagation(); onDelete() }}>
          <DeleteIcon />
          Delete
        </button>
      </div>
    </SortableRowShell>
  )
}

function StepRow({
  node,
  selected,
  onSelect,
  onDelete,
  sortableId,
}: {
  node: FlowNode
  selected: boolean
  onSelect: () => void
  onDelete: () => void
  sortableId?: string
}) {
  const inner = (
    <>
      <span className="timeline-step-type">{node.type}</span>
      <span className="timeline-step-label">{nodeSummary(node)}</span>
      <button type="button" className="admin-btn admin-btn-sm timeline-row-action btn-with-icon" onClick={e => { e.stopPropagation(); onDelete() }}>
        <DeleteIcon />
        Delete
      </button>
    </>
  )

  if (sortableId) {
    return (
      <SortableRowShell id={sortableId} className={`timeline-step-row${selected ? ' is-selected' : ''}`}>
        <div className="timeline-row-body" onClick={onSelect}>{inner}</div>
      </SortableRowShell>
    )
  }

  return (
    <div className={`timeline-step-row${selected ? ' is-selected' : ''}`} onClick={onSelect}>
      {inner}
    </div>
  )
}

export function TimelineEditor({ state }: TimelineEditorProps) {
  const { project, chapters, chapterVideos, selectedNodeId, selectNode } = state
  const [activeDragId, setActiveDragId] = useState<string | null>(null)
  const timelineRef = useRef<HTMLDivElement>(null)

  const selectNodeAndFocus = useCallback((node: FlowNode | null) => {
    selectNode(node)
    timelineRef.current?.focus()
  }, [selectNode])

  const timeline = useMemo(
    () => projectToTimeline(project, chapters, chapterVideos),
    [project, chapters, chapterVideos],
  )

  const topLevelKeys = useMemo(() => timeline.map(rowKey), [timeline])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const applyEdit = useCallback((edit: Parameters<typeof applyTimelineEdit>[1]) => {
    state.applyEdit(edit)
  }, [state])

  const deleteNode = useCallback((nodeId: string) => {
    applyEdit({ type: 'remove', nodeId })
    if (selectedNodeId === nodeId) selectNodeAndFocus(null)
  }, [applyEdit, selectedNodeId, selectNodeAndFocus])

  const onDragStart = (event: DragStartEvent) => {
    setActiveDragId(String(event.active.id))
  }

  const onDragEnd = (event: DragEndEvent) => {
    setActiveDragId(null)
    const { active, over } = event
    if (!over) return
    const activeId = String(active.id)
    const overId = String(over.id)
    const activeNodeId = resolveTimelineDragId(activeId)

    if (activeId === overId) return

    const draggedNode = project.nodes.find(n => n.id === activeNodeId)

    // Drop on video nest zone (includes event list)
    if (overId.startsWith('video-nest:')) {
      const videoNodeId = overId.replace('video-nest:', '')
      if (draggedNode && canNestInVideo(draggedNode) && canDropNodeType(draggedNode.type, 'video')) {
        applyEdit({ type: 'moveNodeToVideo', nodeId: activeNodeId, videoNodeId })
      }
      return
    }

    // Drop on video header — nest attach types; video reorder handled below
    if (overId.startsWith('video:') && draggedNode && canNestInVideo(draggedNode) && draggedNode.type !== 'video') {
      const videoNodeId = overId.replace('video:', '')
      applyEdit({ type: 'moveNodeToVideo', nodeId: activeNodeId, videoNodeId })
      return
    }

    // Drop into chapter body (append)
    if (overId.startsWith('chapter-body:')) {
      const chapterNodeId = overId.replace('chapter-body:', '')
      if (draggedNode && canNestInChapter(draggedNode)) {
        applyEdit({ type: 'moveIntoChapter', nodeId: activeNodeId, chapterNodeId })
      }
      return
    }

    // Drop between videos inside a chapter
    if (overId.startsWith('between-videos:')) {
      const parts = overId.split(':')
      const chapterNodeId = parts[1]
      const afterVideoNodeId = parts[2]
      if (draggedNode && canNestInChapter(draggedNode) && draggedNode.type !== 'video') {
        applyEdit({ type: 'moveIntoChapter', nodeId: activeNodeId, chapterNodeId, afterVideoNodeId })
      }
      return
    }

    // Drop on top-level zone
    if (overId === 'top-level-drop') {
      if (draggedNode && TOP_LEVEL_TYPES.has(draggedNode.type)) {
        applyEdit({ type: 'moveToTopLevel', nodeId: activeNodeId })
      }
      return
    }

    // Top-level row reorder
    if (topLevelKeys.includes(activeId) && topLevelKeys.includes(overId)) {
      applyEdit({ type: 'reorderTopLevel', activeRowKey: activeId, overRowKey: overId })
      return
    }

    // Chapter segment reorder (videos + internal steps)
    if (
      (activeId.startsWith('video:') || activeId.startsWith('step:'))
      && (overId.startsWith('video:') || overId.startsWith('step:'))
    ) {
      const activeSegId = resolveTimelineDragId(activeId)
      const overSegId = resolveTimelineDragId(overId)
      for (const row of timeline) {
        if (row.kind !== 'chapter') continue
        const segIds = row.segments.map(s => (s.kind === 'video' ? s.nodeId : s.node.id))
        if (segIds.includes(activeSegId) && segIds.includes(overSegId)) {
          applyEdit({
            type: 'reorderChapterSegment',
            chapterNodeId: row.nodeId,
            segmentNodeId: activeSegId,
            overSegmentNodeId: overSegId,
          })
          return
        }
      }
    }

    // Video reorder within chapter (legacy path when only videos in sortable context)
    if (activeId.startsWith('video:') && overId.startsWith('video:')) {
      const activeVideoId = resolveTimelineDragId(activeId)
      const overVideoId = resolveTimelineDragId(overId)
      for (const row of timeline) {
        if (row.kind !== 'chapter') continue
        const videoIds = row.segments.filter(s => s.kind === 'video').map(s => s.nodeId)
        if (videoIds.includes(activeVideoId) && videoIds.includes(overVideoId)) {
          const oldIndex = videoIds.indexOf(activeVideoId)
          const newIndex = videoIds.indexOf(overVideoId)
          const reordered = arrayMove(videoIds, oldIndex, newIndex)
          applyEdit({ type: 'reorderVideos', chapterNodeId: row.nodeId, orderedVideoIds: reordered })
          return
        }
      }
      return
    }

    // Event reorder within video
    for (const row of timeline) {
      if (row.kind !== 'chapter') continue
      for (const seg of row.segments) {
        if (seg.kind !== 'video') continue
        const ids = seg.events.map(e => e.id)
        if (ids.includes(activeNodeId) && ids.includes(String(over.id))) {
          applyEdit({
            type: 'reorderEvents',
            videoNodeId: seg.nodeId,
            orderedIds: arrayMove(ids, ids.indexOf(activeNodeId), ids.indexOf(String(over.id))),
          })
          return
        }
      }
    }
  }

  const renderChapterBlock = (row: Extract<TimelineRow, { kind: 'chapter' }>) => {
    const chName = chapterLabel(row.chapterId, chapters)
    const chapterNode = project.nodes.find(n => n.id === row.nodeId)
    const chapterSelected = chapterNode && selectedNodeId === chapterNode.id
    const segmentSortableIds = row.segments.map(segmentSortableId)

    return (
      <div key={row.nodeId} className="timeline-chapter-block">
        <SortableRowShell
          id={rowKey(row)}
          className={`timeline-chapter-header${chapterSelected ? ' is-selected' : ''}`}
        >
          <div className="timeline-row-body" onClick={() => chapterNode && selectNodeAndFocus(chapterNode)}>
            <span className="timeline-chapter-icon">▣</span>
            <span className="timeline-chapter-title">Chapter: {chName}</span>
            {chapterNode && (
              <button type="button" className="admin-btn admin-btn-sm timeline-row-action btn-with-icon" onClick={e => { e.stopPropagation(); deleteNode(chapterNode.id) }}>
                <DeleteIcon />
                Delete
              </button>
            )}
          </div>
        </SortableRowShell>
        <SortableContext items={segmentSortableIds} strategy={verticalListSortingStrategy}>
          <div className="timeline-chapter-body">
            {row.segments.length === 0 ? (
              <DropZone
                id={`chapter-body:${row.nodeId}`}
                label="Drop question / branch / video here"
                className="timeline-chapter-body-drop"
              />
            ) : (
              <>
                {row.segments.map((seg, segIdx) => {
                  if (seg.kind === 'step') {
                    return (
                      <StepRow
                        key={seg.node.id}
                        node={seg.node}
                        selected={selectedNodeId === seg.node.id}
                        onSelect={() => selectNodeAndFocus(seg.node)}
                        onDelete={() => deleteNode(seg.node.id)}
                        sortableId={segmentSortableId(seg)}
                      />
                    )
                  }

                  const videoNode = project.nodes.find(n => n.id === seg.nodeId)
                  const vLabel = videoLabel(seg.videoId, chapterVideos)
                  const eventIds = seg.events.map(e => e.id)
                  const nextSeg = row.segments[segIdx + 1]

                  return (
                    <div key={seg.nodeId} className="timeline-video-block">
                      <SortableRowShell
                        id={`video:${seg.nodeId}`}
                        className={`timeline-video-header${selectedNodeId === seg.nodeId ? ' is-selected' : ''}`}
                      >
                        <div className="timeline-row-body" onClick={() => videoNode && selectNodeAndFocus(videoNode)}>
                          <span className="timeline-video-icon">▶</span>
                          <span>Video: {vLabel}</span>
                          {videoNode && (
                            <button type="button" className="admin-btn admin-btn-sm timeline-row-action btn-with-icon" onClick={e => { e.stopPropagation(); deleteNode(videoNode.id) }}>
                              <DeleteIcon />
                              Delete
                            </button>
                          )}
                        </div>
                      </SortableRowShell>
                      <DropZone
                        id={`video-nest:${seg.nodeId}`}
                        label={seg.events.length === 0 ? 'Drop pause & ask / question / toaster / AI chat here' : 'Drop during-video event here'}
                        className="timeline-nested-events"
                      >
                        <SortableContext items={eventIds} strategy={verticalListSortingStrategy}>
                          <div className="timeline-nested-events-list">
                            {seg.events.map(ev => (
                              <SortableEventRow
                                key={ev.id}
                                node={ev}
                                selected={selectedNodeId === ev.id}
                                onSelect={() => selectNodeAndFocus(ev)}
                                onDelete={() => deleteNode(ev.id)}
                              />
                            ))}
                          </div>
                        </SortableContext>
                      </DropZone>
                      {nextSeg?.kind === 'video' && (
                        <DropZone
                          id={`between-videos:${row.nodeId}:${seg.nodeId}`}
                          label="— drop question / branch between videos —"
                          className="timeline-between-videos"
                        />
                      )}
                    </div>
                  )
                })}
                <DropZone
                  id={`chapter-body:${row.nodeId}`}
                  label="Drop into chapter"
                  className="timeline-chapter-body-drop"
                />
              </>
            )}
          </div>
        </SortableContext>
      </div>
    )
  }

  const resolveDragNode = (dragId: string | null): FlowNode | null => {
    if (!dragId) return null
    const nodeId = resolveTimelineDragId(dragId)
    return project.nodes.find(n => n.id === nodeId) ?? null
  }

  const activeDragNode = resolveDragNode(activeDragId)

  return (
    <div className="timeline-editor" ref={timelineRef} tabIndex={0}>
      <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <SortableContext items={topLevelKeys} strategy={verticalListSortingStrategy}>
          {timeline.map(row => {
            if (row.kind === 'step') {
              return (
                <StepRow
                  key={rowKey(row)}
                  sortableId={rowKey(row)}
                  node={row.node}
                  selected={selectedNodeId === row.node.id}
                  onSelect={() => selectNodeAndFocus(row.node)}
                  onDelete={() => deleteNode(row.node.id)}
                />
              )
            }
            return renderChapterBlock(row)
          })}
        </SortableContext>
        <DropZone id="top-level-drop" label="+ Drop zone for top-level steps" className="timeline-bottom-drop" />
        <DragOverlay>
          {activeDragNode ? (
            <div className="timeline-drag-overlay">{nodeSummary(activeDragNode)}</div>
          ) : null}
        </DragOverlay>
      </DndContext>
      {timeline.length === 0 && (
        <div className="timeline-empty">
          <p>Your flow is empty. Use the toolbar above to add a Chapter, Question, or Event registration step.</p>
        </div>
      )}
    </div>
  )
}

export function addNodeWithContext(
  state: FlowEditorState,
  type: FlowNode['type'],
  toast: { error: (msg: string) => void },
): void {
  insertNodeWithSelection(state, type, toast)
}

export function canDropNodeType(nodeType: FlowNode['type'], zone: 'video' | 'between' | 'top'): boolean {
  if (zone === 'video') return VIDEO_NEST_TYPES.has(nodeType)
  if (zone === 'between') return BETWEEN_VIDEO_TYPES.has(nodeType)
  return TOP_LEVEL_TYPES.has(nodeType)
}

export function validateNodeMove(from: FlowNode, to: FlowNode): boolean {
  return canConnect(from, to)
}
