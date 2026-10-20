import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { MAX_LABEL_LENGTH, type GroupView, type SessionView } from '../../shared/protocol'
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
        { id: 'q1', text: 'Why do reviews take days?', color: 0 },
        { id: 'q2', text: 'Who reviews what?', color: 1 },
      ],
    },
    { id: 'g2', label: 'Deploys', version: 0, questions: [{ id: 'q3', text: 'Why are deploys scary?', color: 0 }] },
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

async function startEditing(user: ReturnType<typeof userEvent.setup>, label: string) {
  await user.click(within(groupCard(label)).getByRole('button', { name: `Edit question: ${label}` }))
  return within(groupCard(label)).getByLabelText<HTMLTextAreaElement>('Question wording')
}

function withGroup(groupId: string, changes: Partial<GroupView>): SessionView {
  return { ...readyView, groups: readyView.groups.map((group) => (group.id === groupId ? { ...group, ...changes } : group)) }
}

function noteBackground(text: string) {
  return [...screen.getByText(text).closest('li')!.classList].find((name) => name.startsWith('bg-'))
}

describe('Consolidate', () => {
  it('shows a grouping message while grouping is pending', () => {
    renderConsolidate(buildView({ phase: 'consolidate', groupingStatus: 'pending' }))

    expect(screen.getByText('Grouping similar questions…')).toBeInTheDocument()
  })

  it('lists the groups with their questions when ready', () => {
    renderConsolidate()

    expect(within(groupCard('Review speed')).getByText('Why do reviews take days?')).toBeInTheDocument()
    expect(within(groupCard('Review speed')).getByText('Who reviews what?')).toBeInTheDocument()
    expect(within(groupCard('Deploys')).getByText('Why are deploys scary?')).toBeInTheDocument()
  })

  it('colors notes from the same author alike and explains the colors', () => {
    renderConsolidate()

    expect(noteBackground('Why do reviews take days?')).toBe(noteBackground('Why are deploys scary?'))
    expect(noteBackground('Who reviews what?')).not.toBe(noteBackground('Why do reviews take days?'))
    expect(screen.getByText('Colors show which questions came from the same person.')).toBeInTheDocument()
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

  it('shows each group question as a heading with an edit button', () => {
    renderConsolidate()

    expect(within(groupCard('Review speed')).getByRole('heading', { name: 'Review speed' })).toBeInTheDocument()
    expect(within(groupCard('Review speed')).getByRole('button', { name: 'Edit question: Review speed' })).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('opens an editor focused on the current wording', async () => {
    const { user } = renderConsolidate()

    const editor = await startEditing(user, 'Review speed')

    expect(editor).toHaveValue('Review speed')
    expect(editor).toHaveFocus()
    expect(editor.selectionStart).toBe('Review speed'.length)
  })

  it('saves on Enter with the group version without inserting a newline', async () => {
    const { send, user } = renderConsolidate()

    const editor = await startEditing(user, 'Review speed')
    await user.clear(editor)
    await user.type(editor, ' Code review {Enter}')

    expect(send).toHaveBeenCalledWith({ type: 'reword', groupId: 'g1', label: 'Code review', baseVersion: 3 })
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('saves with the Save button', async () => {
    const { send, user } = renderConsolidate()

    await user.type(await startEditing(user, 'Deploys'), ' safety')
    await user.click(within(groupCard('Deploys')).getByRole('button', { name: 'Save' }))

    expect(send).toHaveBeenCalledWith({ type: 'reword', groupId: 'g2', label: 'Deploys safety', baseVersion: 0 })
    expect(within(groupCard('Deploys')).getByRole('button', { name: 'Edit question: Deploys' })).toBeInTheDocument()
  })

  it('cancels on Escape and on Cancel without sending', async () => {
    const { send, user } = renderConsolidate()

    await user.type(await startEditing(user, 'Deploys'), ' safety{Escape}')
    await user.type(await startEditing(user, 'Deploys'), ' risk')
    await user.click(within(groupCard('Deploys')).getByRole('button', { name: 'Cancel' }))

    expect(send).not.toHaveBeenCalled()
    expect(within(groupCard('Deploys')).getByRole('heading', { name: 'Deploys' })).toBeInTheDocument()
  })

  it('disables Save while the draft is unchanged or blank', async () => {
    const { send, user } = renderConsolidate()
    const editor = await startEditing(user, 'Deploys')
    const save = within(groupCard('Deploys')).getByRole('button', { name: 'Save' })

    expect(save).toBeDisabled()
    await user.clear(editor)
    await user.type(editor, '   {Enter}')

    expect(save).toBeDisabled()
    expect(send).not.toHaveBeenCalled()
  })

  it('hints at the remaining characters near the limit', async () => {
    const { user } = renderConsolidate()

    const editor = await startEditing(user, 'Deploys')
    await user.clear(editor)
    await user.click(editor)
    await user.paste('x'.repeat(MAX_LABEL_LENGTH - 3))

    expect(within(groupCard('Deploys')).getByText('3 characters left')).toBeInTheDocument()
  })

  it('notices when someone else rewords the question while editing', async () => {
    const { user, rerender } = renderConsolidate()

    await user.type(await startEditing(user, 'Deploys'), ' safety')
    rerender(withGroup('g2', { label: 'Scary deploys', version: 1 }))

    const card = groupCard('Scary deploys')
    expect(within(card).getByText('Someone else updated this question to "Scary deploys".')).toBeInTheDocument()
    expect(within(card).getByLabelText('Question wording')).toHaveValue('Deploys safety')
  })

  it('asks before replacing a remote rewording, and can keep theirs', async () => {
    const { send, user, rerender } = renderConsolidate()

    await user.type(await startEditing(user, 'Deploys'), ' safety')
    rerender(withGroup('g2', { label: 'Scary deploys', version: 1 }))
    const card = groupCard('Scary deploys')
    await user.click(within(card).getByRole('button', { name: 'Save' }))
    await user.click(within(card).getByRole('button', { name: 'Use theirs' }))

    expect(send).not.toHaveBeenCalled()
    expect(within(card).getByRole('heading', { name: 'Scary deploys' })).toBeInTheDocument()
  })

  it('replaces a remote rewording with mine using the current version', async () => {
    const { send, user, rerender } = renderConsolidate()

    await user.type(await startEditing(user, 'Deploys'), ' safety')
    rerender(withGroup('g2', { label: 'Scary deploys', version: 1 }))
    const card = groupCard('Scary deploys')
    await user.click(within(card).getByRole('button', { name: 'Save' }))
    await user.click(within(card).getByRole('button', { name: 'Replace with mine' }))

    expect(send).toHaveBeenCalledWith({ type: 'reword', groupId: 'g2', label: 'Deploys safety', baseVersion: 1 })
    expect(within(card).queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('treats a version-only change as no conflict and saves with the latest version', async () => {
    const { send, user, rerender } = renderConsolidate()

    await user.type(await startEditing(user, 'Review speed'), ' and depth')
    rerender(withGroup('g1', { version: 4 }))
    const card = groupCard('Review speed')

    expect(within(card).queryByText(/Someone else updated/)).not.toBeInTheDocument()
    expect(within(card).getByLabelText('Question wording')).toHaveValue('Review speed and depth')
    await user.click(within(card).getByRole('button', { name: 'Save' }))

    expect(send).toHaveBeenCalledWith({ type: 'reword', groupId: 'g1', label: 'Review speed and depth', baseVersion: 4 })
  })
})
