import { card } from './ui'

export function ChallengeBanner({ challenge }: { challenge: string }) {
  return (
    <section className={`${card} relative overflow-hidden border-l-4 border-l-accent`}>
      <p className="font-marker text-2xl leading-none text-accent">The challenge</p>
      <h1 className="mt-2 text-xl font-semibold leading-snug text-balance break-words sm:text-2xl">{challenge}</h1>
    </section>
  )
}
