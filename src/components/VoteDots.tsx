interface VoteDotsProps {
  filled: number
  total: number
}

export function VoteDots({ filled, total }: VoteDotsProps) {
  return (
    <span aria-hidden="true" className="inline-flex gap-1">
      {Array.from({ length: total }, (_, index) => (
        <span key={index} className={`size-3 rounded-full border-2 border-accent ${index < filled ? 'bg-accent' : 'bg-surface'}`} />
      ))}
    </span>
  )
}
