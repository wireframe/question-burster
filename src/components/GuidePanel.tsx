export function GuidePanel({ title, tips }: { title: string; tips: string[] }) {
  return (
    <details className="text-sm">
      <summary className="w-fit cursor-pointer font-semibold text-accent hover:text-accent-strong">{title}</summary>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-ink-muted">
        {tips.map((tip) => <li key={tip}>{tip}</li>)}
      </ul>
    </details>
  )
}
