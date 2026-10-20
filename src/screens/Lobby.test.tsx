import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { buildView } from '../test-support'
import { Lobby } from './Lobby'

const view = buildView({
  participants: [
    { id: 'p1', name: 'Ada', questionCount: 0, done: false },
    { id: 'p2', name: 'Grace', questionCount: 0, done: false },
  ],
})

describe('Lobby', () => {
  it('shows the participant names', () => {
    render(<Lobby view={view} />)

    expect(screen.getByText('Ada')).toBeInTheDocument()
    expect(screen.getByText('Grace')).toBeInTheDocument()
  })
})
