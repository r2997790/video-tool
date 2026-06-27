interface LiveOfflineToggleProps {
  isLive: boolean
  onChange: (live: boolean) => void
  disabled?: boolean
}

export function LiveOfflineToggle({ isLive, onChange, disabled }: LiveOfflineToggleProps) {
  return (
    <div className="admin-status-toggle" role="group" aria-label="Flow status">
      <button
        type="button"
        className={`admin-status-toggle-btn${isLive ? ' is-active' : ''}`}
        data-state="live"
        disabled={disabled}
        aria-pressed={isLive}
        onClick={() => { if (!isLive) onChange(true) }}
      >
        Live
      </button>
      <button
        type="button"
        className={`admin-status-toggle-btn${!isLive ? ' is-active' : ''}`}
        data-state="offline"
        disabled={disabled}
        aria-pressed={!isLive}
        onClick={() => { if (isLive) onChange(false) }}
      >
        Offline
      </button>
    </div>
  )
}
