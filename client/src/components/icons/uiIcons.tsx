import { IconSvg } from './IconSvg'

// Nav
export function FlowDesignIcon() {
  return (
    <IconSvg>
      <circle cx="4" cy="4" r="2" />
      <circle cx="12" cy="4" r="2" />
      <circle cx="8" cy="12" r="2" />
      <path d="M5.5 5.5L6.8 10.2M10.2 10.2L11.5 5.5" />
    </IconSvg>
  )
}

export function EventsIcon() {
  return (
    <IconSvg>
      <rect x="2" y="3" width="12" height="11" rx="1" />
      <path d="M2 6h12M5 1v3M11 1v3" />
      <circle cx="8" cy="10" r="1.5" fill="currentColor" stroke="none" />
    </IconSvg>
  )
}

export function SettingsIcon() {
  return (
    <IconSvg>
      <circle cx="8" cy="8" r="2.5" />
      <path d="M8 1.5v1.5M8 13v1.5M1.5 8h1.5M13 8h1.5M3.5 3.5l1 1M11.5 11.5l1 1M3.5 12.5l1-1M11.5 4.5l1-1" />
    </IconSvg>
  )
}

export function LogoutIcon() {
  return (
    <IconSvg>
      <path d="M6 2H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3M10 5l3 3-3 3M13 8H6" />
    </IconSvg>
  )
}

// CRUD / actions
export function PlusIcon() {
  return (
    <IconSvg>
      <path d="M8 3v10M3 8h10" />
    </IconSvg>
  )
}

export function EditIcon() {
  return (
    <IconSvg>
      <path d="M11 2l3 3-8 8H3v-3l8-8z" />
    </IconSvg>
  )
}

export function DeleteIcon() {
  return (
    <IconSvg>
      <path d="M3 4h10M5 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1M6 7v5M10 7v5M4 4l1 9a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1l1-9" />
    </IconSvg>
  )
}

export function CopyIcon() {
  return (
    <IconSvg>
      <rect x="5" y="5" width="8" height="9" rx="1" />
      <path d="M3 11V3a1 1 0 0 1 1-1h6" />
    </IconSvg>
  )
}

export function DuplicateIcon() {
  return (
    <IconSvg>
      <rect x="2" y="4" width="8" height="9" rx="1" />
      <rect x="6" y="2" width="8" height="9" rx="1" />
    </IconSvg>
  )
}

export function SaveIcon() {
  return (
    <IconSvg>
      <path d="M3 2h8l2 2v9a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" />
      <path d="M5 2v4h6V2M5 11h6" />
    </IconSvg>
  )
}

export function CancelIcon() {
  return (
    <IconSvg>
      <path d="M4 4l8 8M12 4l-8 8" />
    </IconSvg>
  )
}

export function ShareIcon() {
  return (
    <IconSvg>
      <circle cx="12" cy="4" r="2" />
      <circle cx="4" cy="8" r="2" />
      <circle cx="12" cy="12" r="2" />
      <path d="M6 7l4-2M6 9l4 2" />
    </IconSvg>
  )
}

export function ImportIcon() {
  return (
    <IconSvg>
      <path d="M8 2v8M5 7l3 3 3-3" />
      <path d="M2 12v1a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-1" />
    </IconSvg>
  )
}

export function ExportIcon() {
  return (
    <IconSvg>
      <path d="M8 10V2M5 5l3-3 3 3" />
      <path d="M2 12v1a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-1" />
    </IconSvg>
  )
}

export function UploadIcon() {
  return (
    <IconSvg>
      <path d="M8 10V2M5 5l3-3 3 3" />
      <path d="M2 13h12" />
    </IconSvg>
  )
}

export function DownloadIcon() {
  return (
    <IconSvg>
      <path d="M8 2v8M5 9l3 3 3-3" />
      <path d="M2 13h12" />
    </IconSvg>
  )
}

export function SendIcon() {
  return (
    <IconSvg>
      <path d="M2 8l12-5-5 12-2-5-5z" />
    </IconSvg>
  )
}

export function RefreshIcon() {
  return (
    <IconSvg>
      <path d="M13 3a5 5 0 0 0-8 4M3 13a5 5 0 0 0 8-4" />
      <path d="M13 1v2h-2M3 15v-2h2" />
    </IconSvg>
  )
}

// Navigation / misc
export function ArrowUpIcon() {
  return (
    <IconSvg>
      <path d="M8 3l-4 4M8 3l4 4M8 3v10" />
    </IconSvg>
  )
}

export function ArrowDownIcon() {
  return (
    <IconSvg>
      <path d="M8 13l-4-4M8 13l4-4M8 13V3" />
    </IconSvg>
  )
}

export function ChevronLeftIcon() {
  return (
    <IconSvg>
      <path d="M10 3L5 8l5 5" />
    </IconSvg>
  )
}

export function ChevronRightIcon() {
  return (
    <IconSvg>
      <path d="M6 3l5 5-5 5" />
    </IconSvg>
  )
}

export function ExternalLinkIcon() {
  return (
    <IconSvg>
      <path d="M10 2h4v4M14 2L7 9M6 2H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-3" />
    </IconSvg>
  )
}

export function MenuIcon() {
  return (
    <IconSvg>
      <path d="M2 4h12M2 8h12M2 12h12" />
    </IconSvg>
  )
}

export function HelpIcon() {
  return (
    <IconSvg>
      <circle cx="8" cy="8" r="6.5" />
      <path d="M6.2 6.2a2.2 2.2 0 0 1 3.8 1.5c0 1.5-2 1.8-2 3.3" />
      <circle cx="8" cy="12.8" r="0.6" fill="currentColor" stroke="none" />
    </IconSvg>
  )
}

export function PlayIcon() {
  return (
    <IconSvg>
      <path d="M5 3l8 5-8 5V3z" fill="currentColor" stroke="none" />
    </IconSvg>
  )
}

export function LoginIcon() {
  return (
    <IconSvg>
      <path d="M10 2H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h7M6 8h7M11 5l3 3-3 3" />
    </IconSvg>
  )
}

// Status
export function LiveIcon() {
  return (
    <IconSvg>
      <circle cx="8" cy="8" r="3" fill="currentColor" stroke="none" />
      <path d="M8 2a6 6 0 0 1 0 12M8 4a4 4 0 0 0 0 8" />
    </IconSvg>
  )
}

export function OfflineIcon() {
  return (
    <IconSvg>
      <circle cx="8" cy="8" r="3" />
      <path d="M3 3l10 10" />
    </IconSvg>
  )
}

export function CalendarIcon() {
  return (
    <IconSvg>
      <rect x="2" y="3" width="12" height="11" rx="1" />
      <path d="M2 6h12M5 1v3M11 1v3" />
    </IconSvg>
  )
}

export function CheckIcon() {
  return (
    <IconSvg>
      <path d="M3 8.5l3 3 7-7" />
    </IconSvg>
  )
}

export function XCircleIcon() {
  return (
    <IconSvg>
      <circle cx="8" cy="8" r="6" />
      <path d="M5.5 5.5l5 5M10.5 5.5l-5 5" />
    </IconSvg>
  )
}

export function ClockIcon() {
  return (
    <IconSvg>
      <circle cx="8" cy="8" r="6" />
      <path d="M8 5v3l2 2" />
    </IconSvg>
  )
}

export function ActivateIcon() {
  return (
    <IconSvg>
      <path d="M8 2v4M8 10v4M2 8h4M10 8h4" />
      <circle cx="8" cy="8" r="2" />
    </IconSvg>
  )
}

export function DeactivateIcon() {
  return (
    <IconSvg>
      <circle cx="8" cy="8" r="6" />
      <path d="M5 8h6" />
    </IconSvg>
  )
}

export function RenameIcon() {
  return (
    <IconSvg>
      <path d="M11 2l3 3-8 8H3v-3l8-8z" />
      <path d="M10 3l3 3" />
    </IconSvg>
  )
}

export function LibraryIcon() {
  return (
    <IconSvg>
      <path d="M3 2h4v12H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zM7 2h6v12H7M11 5h2M11 8h2" />
    </IconSvg>
  )
}

export function MessageIcon() {
  return (
    <IconSvg>
      <path d="M2 3h12v8H5l-3 3V3z" />
    </IconSvg>
  )
}

export function BackIcon() {
  return (
    <IconSvg>
      <path d="M10 3L5 8l5 5" />
    </IconSvg>
  )
}

export function PreviewIcon() {
  return (
    <IconSvg>
      <path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" />
      <circle cx="8" cy="8" r="2" />
    </IconSvg>
  )
}

export function AddIcon() {
  return <PlusIcon />
}

export function RemoveIcon() {
  return (
    <IconSvg>
      <path d="M4 8h8" />
    </IconSvg>
  )
}

export function ApproveIcon() {
  return <CheckIcon />
}

export function RejectIcon() {
  return <XCircleIcon />
}

export function PendingIcon() {
  return <ClockIcon />
}

export function InstantIcon() {
  return (
    <IconSvg>
      <path d="M9 2L4 9h4l-1 5 6-8H9l1-4z" fill="currentColor" stroke="none" />
    </IconSvg>
  )
}

export function ChaptersIcon() {
  return (
    <IconSvg>
      <path d="M2 3h12M2 8h12M2 13h8" />
    </IconSvg>
  )
}

export function ChatIcon() {
  return (
    <IconSvg>
      <path d="M2 3h12v7H6l-2 2v-2H2V3z" />
    </IconSvg>
  )
}

export function VideoIcon() {
  return (
    <IconSvg>
      <rect x="1" y="4" width="10" height="8" rx="1" />
      <path d="M11 6l4-2v8l-4-2" />
    </IconSvg>
  )
}

export function ExpandIcon() {
  return (
    <IconSvg>
      <path d="M8 3v10M3 8h10" />
    </IconSvg>
  )
}

export function CollapseIcon() {
  return (
    <IconSvg>
      <path d="M3 8h10" />
    </IconSvg>
  )
}
