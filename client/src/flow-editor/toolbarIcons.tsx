import { IconSvg } from '../components/icons/IconSvg'
import { ExportIcon, ImportIcon, SaveIcon } from '../components/icons/uiIcons'

export { ExportIcon, ImportIcon, SaveIcon }

export function TimelineIcon() {
  return (
    <IconSvg className="toolbar-icon">
      <path d="M2 4h12M2 8h12M2 12h8" />
    </IconSvg>
  )
}

export function VisualIcon() {
  return (
    <IconSvg className="toolbar-icon">
      <circle cx="4" cy="4" r="2" />
      <circle cx="12" cy="4" r="2" />
      <circle cx="8" cy="12" r="2" />
      <path d="M5.5 5.5L6.8 10.2M10.2 10.2L11.5 5.5" />
    </IconSvg>
  )
}

export function AddStepIcon() {
  return (
    <IconSvg className="toolbar-icon">
      <path d="M8 3v10M3 8h10" />
    </IconSvg>
  )
}

export function SavedIcon() {
  return (
    <IconSvg className="toolbar-icon">
      <path d="M3 8.5l3 3 7-7" />
    </IconSvg>
  )
}

export function AutoArrangeIcon() {
  return (
    <IconSvg className="toolbar-icon">
      <rect x="2" y="2" width="5" height="5" rx="1" />
      <rect x="9" y="2" width="5" height="5" rx="1" />
      <rect x="2" y="9" width="5" height="5" rx="1" />
      <rect x="9" y="9" width="5" height="5" rx="1" />
    </IconSvg>
  )
}
