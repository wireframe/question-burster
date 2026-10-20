import { ghostButton } from './ui'

interface RejectionNoticeProps {
  message: string
  onDismiss: () => void
}

export function RejectionNotice({ message, onDismiss }: RejectionNoticeProps) {
  return (
    <div role="alert" className="fixed inset-x-4 top-4 z-30 mx-auto flex max-w-md items-center justify-between gap-3 rounded-xl border border-danger/30 bg-danger-soft py-2 pl-4 pr-2 text-sm text-danger shadow-card">
      <span>{message}</span>
      <button type="button" className={ghostButton} onClick={onDismiss}>Dismiss</button>
    </div>
  )
}
