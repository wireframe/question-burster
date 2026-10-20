import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { SessionView } from '../../shared/protocol'
import { buildView } from '../test-support'
import { Consolidate } from './Consolidate'

const readyView = buildView({
  phase: 'consolidate',
  groupingStatus: 'ready',
  groups: [
    {
      id: 'g1',
      label: 'Review speed',
      version: 3,
      questions: [
        { id: 'q1', text: 'Why do reviews take days?' },
        { id: 'q2', text: 'Who reviews what?' },
      ],
    },
    { id: 'g2', label: 'Deploys', version: 0, questions: [{ id: 'q3', text: 'Why are deploys scary?' }] },
  ],
})

function renderConsolidate(view: SessionView = readyView) {
  const send = vi.fn()
  const { rerender } = render(<Consolidate view={view} send={send} />)
  return { send, user: userEvent.setup(), rerender: (next: SessionView) => rerender(<Consolidate view={next} send={send} />) }
}

function groupCard(label: string) {
  return screen.getByRole('group', { name: label })
}

describe('Consolidate', () => {
  it('shows a grouping message and disables advancing while grouping is pending', () => {
    renderConsolidate(buildView({ phase: 'consolidate', groupingStatus: 'pending' }))

    expect(screen.getByText('Grouping similar questions…')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start voting' })).toBeDisabled()
  })

  it('lists the groups with their questions when ready', () => {
    renderConsolidate()

    expect(within(groupCard('Review speed')).getByText('Why do reviews take days?')).toBeInTheDocument()
    expect(within(groupCard('Review speed')).getByText('Who reviews what?')).toBeInTheDocument()
    expect(within(groupCard('Deploys')).getByText('Why are deploys scary?')).toBeInTheDocument()
  })

  it('advances from consolidate when Start voting is clicked', async () => {
    const { send, user } = renderConsolidate()

    await user.click(screen.getByRole('button', { name: 'Start voting' }))

    expect(send).toHaveBeenCalledWith({ type: 'advance', fromPhase: 'consolidate' })
  })

  it('merges a group into the target chosen in its select', async () => {
    const { send, user } = renderConsolidate()

    await user.selectOptions(within(groupCard('Deploys')).getByLabelText('Merge into…'), 'Review speed')

    expect(send).toHaveBeenCalledWith({ type: 'merge', sourceGroupId: 'g2', targetGroupId: 'g1' })
  })

  it('splits a question out of its group', async () => {
    const { send, user } = renderConsolidate()
    const question = within(groupCard('Review speed')).getByText('Who reviews what?').closest('li')!

    await user.click(within(question).getByRole('button', { name: 'Split out' }))

    expect(send).toHaveBeenCalledWith({ type: 'split', groupId: 'g1', questionId: 'q2' })
  })

  it('offers no split for a group with a single question', () => {
    renderConsolidate()

    expect(within(groupCard('Deploys')).queryByRole('button', { name: 'Split out' })).not.toBeInTheDocument()
  })

  it('rewords a label on Enter with the group version', async () => {
    const { send, user } = renderConsolidate()

    const label = within(groupCard('Review speed')).getByLabelText('Label')
    await user.clear(label)
    await user.type(label, ' Code review {Enter}')

    expect(send).toHaveBeenCalledWith({ type: 'reword', groupId: 'g1', label: 'Code review', baseVersion: 3 })
  })

  it('does not insert a newline when Enter commits the label', async () => {
    const { user } = renderConsolidate()

    const label = within(groupCard('Deploys')).getByLabelText('Label')
    await user.click(label)
    await user.keyboard(' safety{Enter}')

    expect(label).toHaveValue('Deploys safety')
  })

  it('rewords a label on blur', async () => {
    const { send, user } = renderConsolidate()

    const label = within(groupCard('Deploys')).getByLabelText('Label')
    await user.type(label, ' safety')
    await user.tab()

    expect(send).toHaveBeenCalledWith({ type: 'reword', groupId: 'g2', label: 'Deploys safety', baseVersion: 0 })
  })

  it('does not reword when the label is unchanged or blank', async () => {
    const { send, user } = renderConsolidate()

    const label = within(groupCard('Deploys')).getByLabelText('Label')
    await user.click(label)
    await user.tab()
    await user.clear(label)
    await user.type(label, '   ')
    await user.tab()

    expect(send).not.toHaveBeenCalled()
  })

  it('restores the current label when a blank label is blurred', async () => {
    const { user } = renderConsolidate()

    const label = within(groupCard('Deploys')).getByLabelText('Label')
    await user.clear(label)
    await user.tab()

    expect(label).toHaveValue('Deploys')
  })

  it('keeps an in-progress label edit when only the group version changes', async () => {
    const { user, rerender } = renderConsolidate()

    await user.type(within(groupCard('Deploys')).getByLabelText('Label'), ' safety')
    rerender({ ...readyView, groups: readyView.groups.map((group) => ({ ...group, version: group.version + 1 })) })

    expect(within(groupCard('Deploys')).getByLabelText('Label')).toHaveValue('Deploys safety')
  })
})
