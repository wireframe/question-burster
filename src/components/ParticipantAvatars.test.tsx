import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { ParticipantView } from '../../shared/protocol'
import { ParticipantAvatars } from './ParticipantAvatars'

const participants: ParticipantView[] = [
  { id: 'p1', name: 'ada', done: false },
  { id: 'p2', name: 'Grace', done: true },
]

function renderAvatars(viewerId: string | null = null, people = participants) {
  render(<ParticipantAvatars participants={people} viewerId={viewerId} />)
}

function avatarFor(name: string) {
  return screen.getByText(name).closest('li')!
}

describe('ParticipantAvatars', () => {
  it('lists participants under an accessible label', () => {
    renderAvatars()

    expect(within(screen.getByRole('list', { name: 'Participants' })).getAllByRole('listitem')).toHaveLength(2)
  })

  it('shows each participant\'s first initial, capitalised', () => {
    renderAvatars()

    expect(avatarFor('ada')).toHaveTextContent(/^A/)
  })

  it('names each participant in full on hover and for screen readers', () => {
    renderAvatars()

    expect(avatarFor('ada')).toHaveAttribute('title', 'ada')
    expect(screen.getByText('Grace')).toHaveClass('sr-only')
  })

  it('marks participants who completed the current step', () => {
    renderAvatars()

    expect(avatarFor('Grace')).toHaveAttribute('title', 'Grace, done')
    expect(avatarFor('Grace')).toHaveTextContent('Grace, done')
    expect(within(avatarFor('Grace')).getByTestId('done-badge')).toBeInTheDocument()
  })

  it('shows no done badge for participants still working', () => {
    renderAvatars()

    expect(within(avatarFor('ada')).queryByTestId('done-badge')).not.toBeInTheDocument()
  })

  it('marks the viewer', () => {
    renderAvatars('p2')

    expect(avatarFor('Grace')).toHaveAttribute('title', 'Grace (you), done')
    expect(avatarFor('Grace')).toHaveTextContent('Grace (you), done')
  })

  it('summarises participants beyond the first six on small screens', () => {
    const many = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map((name) => ({ id: name, name, done: false }))
    renderAvatars(null, many)

    expect(screen.getByText('+2')).toBeInTheDocument()
  })

  it('shows no overflow summary for six or fewer participants', () => {
    renderAvatars()

    expect(screen.queryByText(/^\+\d/)).not.toBeInTheDocument()
  })
})
