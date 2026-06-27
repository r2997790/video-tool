export function PublishBadge({ isEnabled }: { isEnabled: boolean }) {
  return (
    <span className={`admin-status-badge ${isEnabled ? 'admin-status-live' : 'admin-status-draft'}`}>
      {isEnabled ? 'Live' : 'Offline'}
    </span>
  )
}
