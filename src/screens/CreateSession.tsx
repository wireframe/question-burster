import { useState, type FormEvent } from 'react'
import {
  DEFAULT_BURST_SECONDS,
  MAX_BURST_SECONDS,
  MIN_BURST_SECONDS,
  type CreateSessionRequest,
} from '../../shared/protocol'
import { card, fieldLabel, primaryButton, textField } from '../components/ui'

interface CreateSessionProps {
  createSession: (request: CreateSessionRequest) => Promise<string>
  onCreated: (id: string) => void
}

function minutesToSeconds(minutes: number): number {
  return Math.round(minutes * 60)
}

function secondsToMinutes(seconds: number): number {
  return seconds / 60
}

export function CreateSession({ createSession, onCreated }: CreateSessionProps) {
  const [challenge, setChallenge] = useState('')
  const [minutes, setMinutes] = useState(secondsToMinutes(DEFAULT_BURST_SECONDS))
  const [error, setError] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const cannotSubmit = challenge.trim() === '' || isCreating

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (cannotSubmit) return
    setIsCreating(true)
    try {
      onCreated(await createSession({ challenge, burstSeconds: minutesToSeconds(minutes) }))
    } catch (failure) {
      setError((failure as Error).message)
      setIsCreating(false)
    }
  }

  return (
    <div className="space-y-8 pt-4 sm:pt-10">
      <Hero />
      <form onSubmit={submit} className={`${card} space-y-5`}>
        <div className="space-y-2">
          <label htmlFor="challenge" className={fieldLabel}>Challenge</label>
          <textarea
            id="challenge"
            required
            rows={3}
            placeholder="How might we…"
            className={`${textField} resize-y`}
            value={challenge}
            onChange={(e) => setChallenge(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="burst-minutes" className={fieldLabel}>Burst length (minutes)</label>
          <input
            id="burst-minutes"
            type="number"
            min={secondsToMinutes(MIN_BURST_SECONDS)}
            max={secondsToMinutes(MAX_BURST_SECONDS)}
            step={0.5}
            className={`${textField} max-w-32`}
            value={minutes}
            onChange={(e) => setMinutes(e.target.valueAsNumber)}
          />
        </div>
        {error && <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
        <button type="submit" className={`${primaryButton} w-full sm:w-auto`} disabled={cannotSubmit}>Create session</button>
      </form>
    </div>
  )
}

function Hero() {
  return (
    <section className="space-y-3 text-center">
      <h1 className="text-3xl font-bold tracking-tight text-balance sm:text-5xl">
        Ask better questions, <span className="font-marker text-accent">together.</span>
      </h1>
      <p className="mx-auto max-w-xl text-ink-muted text-pretty">
        Pose a challenge, burst out as many questions as you can in a few minutes, group the similar ones, and vote on the questions that matter most.
      </p>
    </section>
  )
}
