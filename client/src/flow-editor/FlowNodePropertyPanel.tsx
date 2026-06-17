import type { FlowNode, ScheduledEvent, ToasterType, AdminChapter, AdminChapterVideo } from '../types'
import type { BranchAction, FlowBranchRule } from './flowTypes'
import { ChapterNodeEditor } from './ChapterNodeEditor'
import { AdminFieldLabel } from '../components/AdminFieldLabel'
import { FieldHelp } from '../components/FieldHelp'
import { HELP } from '../adminHelpText'
import { isVideoAttachType } from './flowRuntime'

function attachPlacementValue(selected: FlowNode): 'during' | 'between' {
  if (selected.parameters.placement === 'during') return 'during'
  if (selected.parameters.placement === 'between') return 'between'
  return selected.type === 'pause' || selected.type === 'toaster' ? 'during' : 'between'
}

interface Props {
  flowSlug: string
  selected: FlowNode
  inChapter?: boolean
  chapters: AdminChapter[]
  chapterVideos: AdminChapterVideo[]
  onChaptersReload: () => void
  events: ScheduledEvent[]
  fieldIds: string[]
  questionTargets: Array<{ id: string; label: string }>
  chapterTargets: Array<{ id: string; label: string }>
  onUpdate: (updates: Partial<FlowNode>) => void
  onDelete: () => void
}

export function FlowNodePropertyPanel({
  flowSlug,
  selected,
  inChapter = false,
  chapters,
  chapterVideos,
  onChaptersReload,
  events,
  fieldIds,
  questionTargets,
  chapterTargets,
  onUpdate,
  onDelete,
}: Props) {
  return (
    <div className="flow-panel-form">
      <AdminFieldLabel label="Name" help={HELP.flowEditor.nodeName}>
        <input className="admin-input" value={selected.name} onChange={e => onUpdate({ name: e.target.value })} />
      </AdminFieldLabel>

      {inChapter && isVideoAttachType(selected.type) && (
        <AdminFieldLabel
          label="Placement"
          help="During video: timed events while playback is in progress. Between videos: a step on the chapter spine before or after videos."
        >
          <select
            className="admin-input"
            value={attachPlacementValue(selected)}
            onChange={e => onUpdate({ parameters: { placement: e.target.value } })}
          >
            <option value="during">During video</option>
            <option value="between">Between videos</option>
          </select>
        </AdminFieldLabel>
      )}

      {selected.type === 'event' && (
        <>
          <AdminFieldLabel label="Scheduled event" help={HELP.flowEditor.eventSlug}>
            <select className="admin-input" value={(selected.parameters.eventSlug as string) || ''}
              onChange={e => onUpdate({ parameters: { eventSlug: e.target.value } })}>
              <option value="">Select event…</option>
              {events.map(ev => <option key={ev.id} value={ev.slug}>{ev.title} ({ev.slug})</option>)}
            </select>
          </AdminFieldLabel>
          <AdminFieldLabel label="Heading override" help="Optional — defaults to the event registration form heading.">
            <input className="admin-input" value={(selected.parameters.heading as string) || ''}
              onChange={e => onUpdate({ parameters: { heading: e.target.value } })} />
          </AdminFieldLabel>
          <AdminFieldLabel label="Subtext override" help="Optional supporting text below the heading.">
            <input className="admin-input" value={(selected.parameters.subtext as string) || ''}
              onChange={e => onUpdate({ parameters: { subtext: e.target.value } })} />
          </AdminFieldLabel>
          <p className="admin-help-text">Countdown and lobby video are configured under Events admin, not here.</p>
        </>
      )}

      {selected.type === 'question' && (
        <>
          <AdminFieldLabel label="Prompt" help={HELP.flowEditor.questionLabel}>
            <input className="admin-input" value={(selected.parameters.prompt as string) || ''}
              onChange={e => onUpdate({ parameters: { prompt: e.target.value } })} />
          </AdminFieldLabel>
          <AdminFieldLabel label="Field ID" help={HELP.flowEditor.questionFieldId}>
            <input className="admin-input" value={(selected.parameters.fieldId as string) || 'answer'}
              onChange={e => onUpdate({ parameters: { fieldId: e.target.value } })} />
          </AdminFieldLabel>
          <AdminFieldLabel label="Input type" help={HELP.flowEditor.questionInputType}>
            <select className="admin-input" value={(selected.parameters.inputType as string) || 'text'}
              onChange={e => onUpdate({ parameters: { inputType: e.target.value } })}>
              <option value="text">Free text</option>
              <option value="textarea">Free text (multiline)</option>
              <option value="radio">Radio buttons</option>
              <option value="multiselect">Multi choice (checkboxes)</option>
              <option value="date">Date</option>
              <option value="datetime">Date / time</option>
              <option value="email">Email</option>
            </select>
          </AdminFieldLabel>
          {['radio', 'multiselect'].includes((selected.parameters.inputType as string) || '') && (
            <AdminFieldLabel label="Options" help={HELP.flowEditor.questionOptions}>
              <input className="admin-input"
                value={((selected.parameters.options as string[]) || []).join(', ')}
                onChange={e => onUpdate({
                  parameters: { options: e.target.value.split(',').map(s => s.trim()).filter(Boolean) },
                })} />
            </AdminFieldLabel>
          )}
          <div className="admin-field">
            <div className="admin-label-row">
              <span className="admin-label-text">Required</span>
              <FieldHelp text={HELP.flowEditor.questionRequired} />
            </div>
            <label>
              <input type="checkbox" checked={selected.parameters.required !== false}
                onChange={e => onUpdate({ parameters: { required: e.target.checked } })} />
              {' '}Answer is required
            </label>
          </div>
          <AdminFieldLabel label="Placeholder" help={HELP.flowEditor.questionPlaceholder}>
            <input className="admin-input" value={(selected.parameters.placeholder as string) || ''}
              onChange={e => onUpdate({ parameters: { placeholder: e.target.value } })} />
          </AdminFieldLabel>
          <AdminFieldLabel label="Trigger at (seconds)" help="When attached to a video, show at this timestamp. Leave 0 for spine placement before/after video.">
            <input className="admin-input" type="number" min={0}
              value={(selected.parameters.triggerAtSeconds as number) || 0}
              onChange={e => onUpdate({ parameters: { triggerAtSeconds: parseInt(e.target.value, 10) || 0 } })} />
          </AdminFieldLabel>
        </>
      )}

      {selected.type === 'branch' && (
        <>
          <AdminFieldLabel label="Source field" help={HELP.flowEditor.branchSourceField}>
            <input className="admin-input" list="flow-field-ids" value={(selected.parameters.sourceField as string) || ''}
              onChange={e => onUpdate({ parameters: { sourceField: e.target.value } })} />
            <datalist id="flow-field-ids">
              {fieldIds.map(id => <option key={id} value={id} />)}
            </datalist>
            {fieldIds.length > 0 && (
              <small style={{ color: '#5f6164' }}>Available: {fieldIds.join(', ')}</small>
            )}
          </AdminFieldLabel>          {((selected.parameters.rules as FlowBranchRule[]) || []).map((rule, ri) => {
            const action = (rule.action || 'question') as BranchAction
            return (
              <div key={ri} className="admin-field flow-branch-rule">
                <div className="admin-label-row">
                  <span className="admin-label-text">Rule {ri + 1}</span>
                  <FieldHelp text="When the source field answer matches, perform the selected action." />
                </div>
                <div className="admin-label-row"><span className="admin-label-text">Match value</span><FieldHelp text={HELP.flowEditor.branchMatch} /></div>
                <input className="admin-input" placeholder="When answer equals..." value={rule.match}                  onChange={e => {
                    const rules = [...((selected.parameters.rules as FlowBranchRule[]) || [])]
                    rules[ri] = { ...rules[ri], match: e.target.value }
                    onUpdate({ parameters: { rules } })
                  }} />
                <div className="admin-label-row"><span className="admin-label-text">Action</span><FieldHelp text={HELP.flowEditor.branchAction} /></div>
                <select className="admin-input" value={action}                  onChange={e => {
                    const rules = [...((selected.parameters.rules as FlowBranchRule[]) || [])]
                    rules[ri] = { ...rules[ri], action: e.target.value as BranchAction, targetNodeId: '', url: '' }
                    onUpdate({ parameters: { rules } })
                  }}>
                  <option value="question">Show another question</option>
                  <option value="chapter">Load another video</option>
                  <option value="webpage">Send to webpage</option>
                </select>
                {action === 'webpage' ? (
                  <input className="admin-input" placeholder="https://example.com/page" value={rule.url || ''}
                    onChange={e => {
                      const rules = [...((selected.parameters.rules as FlowBranchRule[]) || [])]
                      rules[ri] = { ...rules[ri], url: e.target.value }
                      onUpdate({ parameters: { rules } })
                    }} />
                ) : (
                  <select className="admin-input" value={rule.targetNodeId || ''}
                    onChange={e => {
                      const rules = [...((selected.parameters.rules as FlowBranchRule[]) || [])]
                      rules[ri] = { ...rules[ri], targetNodeId: e.target.value }
                      onUpdate({ parameters: { rules } })
                    }}>
                    <option value="">Select target node...</option>
                    {(action === 'chapter' ? chapterTargets : questionTargets).map(n => (
                      <option key={n.id} value={n.id}>{n.label}</option>
                    ))}
                  </select>
                )}
              </div>
            )
          })}
          <button type="button" className="admin-btn admin-btn-sm" onClick={() => {
            const rules = [...((selected.parameters.rules as FlowBranchRule[]) || []), { match: '', action: 'question' as BranchAction, targetNodeId: '' }]
            onUpdate({ parameters: { rules } })
          }}>Add Rule</button>
          <AdminFieldLabel label="Default webpage URL" help={HELP.flowEditor.branchDefaultUrl}>
            <input className="admin-input" value={(selected.parameters.defaultUrl as string) || ''}
              onChange={e => onUpdate({ parameters: { defaultUrl: e.target.value } })} />
          </AdminFieldLabel>        </>
      )}

      {selected.type === 'aichat' && (
        <>
          <AdminFieldLabel label="Heading" help={HELP.flowEditor.aichatHeading}>
            <input className="admin-input" value={(selected.parameters.heading as string) || ''}
              onChange={e => onUpdate({ parameters: { heading: e.target.value } })} />
          </AdminFieldLabel>
          <AdminFieldLabel label="Trigger at (seconds)" help="When attached to a video, start at this timestamp. Leave 0 for spine segments.">
            <input className="admin-input" type="number" min={0}
              value={(selected.parameters.triggerAtSeconds as number) || 0}
              onChange={e => onUpdate({ parameters: { triggerAtSeconds: parseInt(e.target.value, 10) || 0 } })} />
          </AdminFieldLabel>
          <AdminFieldLabel label="Duration (seconds)" help={HELP.flowEditor.aichatDuration}>
            <input className="admin-input" type="number" min={10}
              value={(selected.parameters.durationSeconds as number) || 60}
              onChange={e => onUpdate({ parameters: { durationSeconds: parseInt(e.target.value, 10) || 60 } })} />
          </AdminFieldLabel>
          <AdminFieldLabel label="Interaction count" help={HELP.flowEditor.aichatInteractionCount}>
            <input className="admin-input" type="number" min={1}
              value={(selected.parameters.interactionCount as number) || 1}
              onChange={e => onUpdate({ parameters: { interactionCount: parseInt(e.target.value, 10) || 1 } })} />
          </AdminFieldLabel>
          <AdminFieldLabel label="Prompt mode" help={HELP.flowEditor.aichatPromptMode}>
            <select className="admin-input" value={(selected.parameters.mode as string) || 'fixed'}
              onChange={e => onUpdate({ parameters: { mode: e.target.value } })}>
              <option value="fixed">Fixed prompts (in order)</option>
              <option value="random">Random from pool</option>
            </select>
          </AdminFieldLabel>
          <AdminFieldLabel label="Fixed prompts" help={HELP.flowEditor.aichatPrompts}>
            <textarea className="admin-textarea"
              value={((selected.parameters.prompts as string[]) || []).join('\n')}
              onChange={e => onUpdate({
                parameters: { prompts: e.target.value.split('\n').map(s => s.trim()).filter(Boolean) },
              })} />
          </AdminFieldLabel>
          <AdminFieldLabel label="Random pool" help={HELP.flowEditor.aichatRandomPool}>
            <textarea className="admin-textarea"
              value={((selected.parameters.randomPool as string[]) || []).join('\n')}
              onChange={e => onUpdate({
                parameters: { randomPool: e.target.value.split('\n').map(s => s.trim()).filter(Boolean) },
              })} />
          </AdminFieldLabel>
          <div className="admin-field">
            <div className="admin-label-row">
              <span className="admin-label-text">Allow user AI replies</span>
              <FieldHelp text={HELP.flowEditor.aichatUseAiReply} />
            </div>
            <label>
              <input type="checkbox" checked={selected.parameters.useAiReply !== false}
                onChange={e => onUpdate({ parameters: { useAiReply: e.target.checked } })} />
              {' '}Enable chat panel during this segment
            </label>
          </div>        </>
      )}

      {selected.type === 'chapter' && (
        <ChapterNodeEditor
          flowSlug={flowSlug}
          chapterId={(selected.parameters.chapterId as number) || undefined}
          chapters={chapters}
          onChapterIdChange={id => onUpdate({ parameters: { chapterId: id } })}
          onChaptersReload={onChaptersReload}
        />
      )}

      {selected.type === 'video' && (
        <>
          <AdminFieldLabel label="Chapter" help={HELP.flowEditor.chapterSelect}>
            <select
              className="admin-input"
              value={(selected.parameters.chapterId as number) || ''}
              onChange={e => onUpdate({ parameters: { ...selected.parameters, chapterId: parseInt(e.target.value, 10), videoId: 0 } })}
            >
              <option value="">Select chapter…</option>
              {chapters.map(ch => <option key={ch.id} value={ch.id}>{ch.name}</option>)}
            </select>
          </AdminFieldLabel>
          <AdminFieldLabel label="Video source" help="Library clip, YouTube URL/ID, or direct MP4/HLS. YouTube live URLs are supported.">
            <select
              className="admin-input"
              value={(selected.parameters.videoSource as string) || 'library'}
              onChange={e => onUpdate({ parameters: { ...selected.parameters, videoSource: e.target.value } })}
            >
              <option value="library">Chapter library clip</option>
              <option value="youtube">YouTube (VOD or live)</option>
              <option value="direct">Direct URL</option>
            </select>
          </AdminFieldLabel>
          {((selected.parameters.videoSource as string) || 'library') === 'library' ? (
            <AdminFieldLabel label="Video clip" help="Which video in this chapter block to play.">
              <select
                className="admin-input"
                value={(selected.parameters.videoId as number) || ''}
                onChange={e => {
                  const videoId = parseInt(e.target.value, 10)
                  const v = chapterVideos.find(x => x.id === videoId)
                  onUpdate({
                    name: v?.title || selected.name,
                    parameters: { ...selected.parameters, videoId, chapterId: selected.parameters.chapterId },
                  })
                }}
              >
                <option value="">Select video…</option>
                {chapterVideos
                  .filter(v => v.chapterId === (selected.parameters.chapterId as number))
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map(v => (
                    <option key={v.id} value={v.id}>{v.title}{v.duration ? ` (${v.duration})` : ''}</option>
                  ))}
              </select>
            </AdminFieldLabel>
          ) : (
            <>
              <AdminFieldLabel label="Video URL or YouTube ID" help={HELP.chapters.videoLink}>
                <input
                  className="admin-input"
                  placeholder="YouTube ID, youtube.com/live/…, or MP4 URL"
                  value={(selected.parameters.videoLink as string) || ''}
                  onChange={e => onUpdate({ parameters: { ...selected.parameters, videoLink: e.target.value } })}
                />
              </AdminFieldLabel>
              <div className="admin-field">
                <label>
                  <input
                    type="checkbox"
                    checked={!!selected.parameters.isLive}
                    onChange={e => onUpdate({ parameters: { ...selected.parameters, isLive: e.target.checked } })}
                  />
                  {' '}YouTube live stream (do not auto-advance on end)
                </label>
              </div>
            </>
          )}
        </>
      )}

      {selected.type === 'toaster' && (
        <>
          <AdminFieldLabel label="Trigger at (seconds)" help={HELP.flowEditor.toasterTriggerAt}>
            <input className="admin-input" type="number" min={0}
              value={(selected.parameters.triggerAtSeconds as number) || 0}
              onChange={e => onUpdate({ parameters: { triggerAtSeconds: parseInt(e.target.value, 10) || 0 } })} />
          </AdminFieldLabel>
          <AdminFieldLabel label="Duration (seconds)" help={HELP.flowEditor.toasterDuration}>
            <input className="admin-input" type="number" min={0}
              value={(selected.parameters.durationSeconds as number) ?? 5}
              onChange={e => onUpdate({ parameters: { durationSeconds: parseInt(e.target.value, 10) || 0 } })} />
          </AdminFieldLabel>
          <AdminFieldLabel label="Type" help={HELP.flowEditor.toasterType}>
            <select className="admin-input" value={(selected.parameters.toasterType as string) || 'popup'}
              onChange={e => onUpdate({ parameters: { toasterType: e.target.value as ToasterType } })}>
              <option value="popup">Popup</option>
              <option value="banner">Banner</option>
              <option value="download">Download</option>
              <option value="graphic">Graphic</option>
            </select>
          </AdminFieldLabel>
          <AdminFieldLabel label="Title" help={HELP.flowEditor.toasterTitle}>
            <input className="admin-input" value={(selected.parameters.title as string) || ''}
              onChange={e => onUpdate({ parameters: { title: e.target.value } })} />
          </AdminFieldLabel>
          <AdminFieldLabel label="Message" help={HELP.flowEditor.toasterMessage}>
            <textarea className="admin-textarea" value={(selected.parameters.message as string) || ''}
              onChange={e => onUpdate({ parameters: { message: e.target.value } })} />
          </AdminFieldLabel>
          {['popup', 'graphic', 'banner'].includes((selected.parameters.toasterType as string) || 'popup') && (
            <AdminFieldLabel label="Image URL" help={HELP.flowEditor.toasterImageUrl}>
              <input className="admin-input" value={(selected.parameters.imageUrl as string) || ''}
                onChange={e => onUpdate({ parameters: { imageUrl: e.target.value } })} />
            </AdminFieldLabel>
          )}
          {(selected.parameters.toasterType as string) === 'graphic' && (
            <>
              <AdminFieldLabel label="Link URL" help={HELP.flowEditor.toasterLinkUrl}>
                <input className="admin-input" value={(selected.parameters.linkUrl as string) || ''}
                  onChange={e => onUpdate({ parameters: { linkUrl: e.target.value } })} />
              </AdminFieldLabel>
              <div className="admin-field">
                <div className="admin-label-row">
                  <span className="admin-label-text">Open in new window</span>
                  <FieldHelp text={HELP.flowEditor.toasterLinkNewWindow} />
                </div>
                <label>
                  <input type="checkbox" checked={!!selected.parameters.linkNewWindow}
                    onChange={e => onUpdate({ parameters: { linkNewWindow: e.target.checked } })} />
                  {' '}Open link in new tab
                </label>
              </div>
            </>
          )}
          {(selected.parameters.toasterType as string) === 'banner' && (
            <AdminFieldLabel label="Banner position" help={HELP.flowEditor.toasterBannerPosition}>
              <select className="admin-input" value={(selected.parameters.bannerPosition as string) || 'top'}
                onChange={e => onUpdate({ parameters: { bannerPosition: e.target.value } })}>
                <option value="top">Top</option>
                <option value="bottom">Bottom</option>
              </select>
            </AdminFieldLabel>
          )}
          {(selected.parameters.toasterType as string) === 'download' && (
            <>
              <AdminFieldLabel label="Thumbnail URL" help={HELP.flowEditor.toasterThumbnailUrl}>
                <input className="admin-input" value={(selected.parameters.thumbnailUrl as string) || ''}
                  onChange={e => onUpdate({ parameters: { thumbnailUrl: e.target.value } })} />
              </AdminFieldLabel>
              <AdminFieldLabel label="Download URL" help={HELP.flowEditor.toasterDownloadUrl}>
                <input className="admin-input" value={(selected.parameters.downloadUrl as string) || ''}
                  onChange={e => onUpdate({ parameters: { downloadUrl: e.target.value } })} />
              </AdminFieldLabel>
              <AdminFieldLabel label="Download file name" help={HELP.flowEditor.toasterDownloadFileName}>
                <input className="admin-input" value={(selected.parameters.downloadFileName as string) || ''}
                  onChange={e => onUpdate({ parameters: { downloadFileName: e.target.value } })} />
              </AdminFieldLabel>
            </>
          )}        </>
      )}

      {selected.type === 'pause' && (
        <>
          <AdminFieldLabel label="Trigger at (seconds)" help={HELP.flowEditor.pauseTriggerAt}>
            <input className="admin-input" type="number" min={0}
              value={(selected.parameters.triggerAtSeconds as number) || 0}
              onChange={e => onUpdate({ parameters: { triggerAtSeconds: parseInt(e.target.value, 10) || 0 } })} />
          </AdminFieldLabel>
          <AdminFieldLabel label="Prompt" help={HELP.flowEditor.pausePrompt}>
            <input className="admin-input" value={(selected.parameters.prompt as string) || ''}
              onChange={e => onUpdate({ parameters: { prompt: e.target.value } })} />
          </AdminFieldLabel>
          <AdminFieldLabel label="Field ID" help={HELP.flowEditor.pauseFieldId}>
            <input className="admin-input" value={(selected.parameters.fieldId as string) || 'answer'}
              onChange={e => onUpdate({ parameters: { fieldId: e.target.value } })} />
          </AdminFieldLabel>
          <AdminFieldLabel label="Input type" help={HELP.flowEditor.pauseInputType}>
            <select className="admin-input" value={(selected.parameters.inputType as string) || 'text'}
              onChange={e => onUpdate({ parameters: { inputType: e.target.value } })}>
              <option value="text">Free text</option>
              <option value="textarea">Multiline</option>
              <option value="radio">Radio</option>
              <option value="multiselect">Multi choice</option>
              <option value="date">Date</option>
              <option value="datetime">Date / time</option>
              <option value="email">Email</option>
            </select>
          </AdminFieldLabel>
          {['radio', 'multiselect'].includes((selected.parameters.inputType as string) || '') && (
            <AdminFieldLabel label="Options" help={HELP.flowEditor.pauseOptions}>
              <input className="admin-input"
                value={((selected.parameters.options as string[]) || []).join(', ')}
                onChange={e => onUpdate({
                  parameters: { options: e.target.value.split(',').map(s => s.trim()).filter(Boolean) },
                })} />
            </AdminFieldLabel>
          )}
          <div className="admin-field">
            <div className="admin-label-row">
              <span className="admin-label-text">Required</span>
              <FieldHelp text={HELP.flowEditor.pauseRequired} />
            </div>
            <label>
              <input type="checkbox" checked={selected.parameters.required !== false}
                onChange={e => onUpdate({ parameters: { required: e.target.checked } })} />
              {' '}Answer is required
            </label>
          </div>
          <AdminFieldLabel label="Placeholder" help={HELP.flowEditor.pausePlaceholder}>
            <input className="admin-input" value={(selected.parameters.placeholder as string) || ''}
              onChange={e => onUpdate({ parameters: { placeholder: e.target.value } })} />
          </AdminFieldLabel>        </>
      )}

      <button type="button" className="admin-btn admin-btn-danger admin-btn-sm" onClick={onDelete}>Delete Node</button>
    </div>
  )
}
