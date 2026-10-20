import { useState, type FormEvent } from 'react'
import { MAX_NAME_LENGTH } from '../../shared/protocol'

interface JoinSessionProps {
  challenge: string
  onJoin: (name: string) => void
}

export function JoinSession({ challenge, onJoin }: JoinSessionProps) {
  const [name, setName] = useState('')
  const isBlank = name.trim() === ''

  function submit(event: FormEvent) {
    event.preventDefault()
    onJoin(name.trim())
  }

  return (
    <form onSubmit={submit}>
      <h1>{challenge}</h1>
      <label htmlFor="participant-name">Your name</label>
      <input
        id="participant-name"
        required
        maxLength={MAX_NAME_LENGTH}
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <button type="submit" disabled={isBlank}>Join</button>
    </form>
  )
}
