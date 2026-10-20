import { useState, type FormEvent } from 'react'
import { MAX_NAME_LENGTH } from '../../shared/protocol'
import { card, fieldLabel, primaryButton, textField } from '../components/ui'

export function JoinSession({ onJoin }: { onJoin: (name: string) => void }) {
  const [name, setName] = useState('')
  const isBlank = name.trim() === ''

  function submit(event: FormEvent) {
    event.preventDefault()
    onJoin(name.trim())
  }

  return (
    <form onSubmit={submit} className={`${card} space-y-4`}>
      <label htmlFor="participant-name" className={fieldLabel}>Your name</label>
      <input
        id="participant-name"
        required
        autoComplete="nickname"
        maxLength={MAX_NAME_LENGTH}
        className={textField}
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <button type="submit" className={`${primaryButton} w-full sm:w-auto`} disabled={isBlank}>Join</button>
    </form>
  )
}
