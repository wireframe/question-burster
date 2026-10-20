import { useState, type FormEvent } from 'react'
import {
  DEFAULT_BURST_SECONDS,
  MAX_BURST_SECONDS,
  MIN_BURST_SECONDS,
  type CreateSessionRequest,
} from '../../shared/protocol'

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
    <form onSubmit={submit}>
      <h1>Question Burst</h1>
      <label htmlFor="challenge">Challenge</label>
      <textarea id="challenge" required value={challenge} onChange={(e) => setChallenge(e.target.value)} />
      <label htmlFor="burst-minutes">Burst length (minutes)</label>
      <input
        id="burst-minutes"
        type="number"
        min={secondsToMinutes(MIN_BURST_SECONDS)}
        max={secondsToMinutes(MAX_BURST_SECONDS)}
        step={0.5}
        value={minutes}
        onChange={(e) => setMinutes(e.target.valueAsNumber)}
      />
      {error && <p role="alert">{error}</p>}
      <button type="submit" disabled={cannotSubmit}>Create session</button>
    </form>
  )
}
