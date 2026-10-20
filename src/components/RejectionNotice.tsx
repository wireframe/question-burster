interface RejectionNoticeProps {
  message: string
  onDismiss: () => void
}

export function RejectionNotice({ message, onDismiss }: RejectionNoticeProps) {
  return (
    <div role="alert" className="rejection-notice">
      <span>{message}</span>
      <button type="button" onClick={onDismiss}>Dismiss</button>
    </div>
  )
}
