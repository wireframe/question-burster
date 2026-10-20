import { describe, expect, it } from 'vitest'
import { MAX_LABEL_LENGTH, type GroupView } from '../../shared/protocol'
import { charactersLeftHint, isSaveable, remoteLabel, saveOutcome, startDraft } from './labelDraft'

const group: GroupView = { id: 'g1', label: 'Review speed', version: 3, questions: [] }

describe('startDraft', () => {
  it('starts from the current label', () => {
    expect(startDraft(group)).toEqual({ text: 'Review speed', startedFrom: 'Review speed' })
  })
})

describe('isSaveable', () => {
  it('rejects a blank draft', () => {
    expect(isSaveable({ text: '   ', startedFrom: 'Review speed' })).toBe(false)
  })

  it('rejects a draft that only differs by surrounding whitespace', () => {
    expect(isSaveable({ text: ' Review speed ', startedFrom: 'Review speed' })).toBe(false)
  })

  it('accepts a changed draft', () => {
    expect(isSaveable({ text: 'Code review', startedFrom: 'Review speed' })).toBe(true)
  })
})

describe('remoteLabel', () => {
  it('is null while the label is unchanged, even when the version moved', () => {
    expect(remoteLabel(startDraft(group), { ...group, version: 9 })).toBeNull()
  })

  it('is the new label once someone else rewords the group', () => {
    expect(remoteLabel(startDraft(group), { ...group, label: 'Slow reviews' })).toBe('Slow reviews')
  })
})

describe('saveOutcome', () => {
  const draft = { text: ' Code review ', startedFrom: 'Review speed' }

  it('sends the trimmed draft with the group version', () => {
    expect(saveOutcome(draft, group)).toEqual({
      kind: 'send',
      command: { type: 'reword', groupId: 'g1', label: 'Code review', baseVersion: 3 },
    })
  })

  it('sends the latest version after a version-only bump', () => {
    expect(saveOutcome(draft, { ...group, version: 4 })).toEqual({
      kind: 'send',
      command: { type: 'reword', groupId: 'g1', label: 'Code review', baseVersion: 4 },
    })
  })

  it('reports a conflict when the label changed remotely', () => {
    expect(saveOutcome(draft, { ...group, label: 'Slow reviews', version: 4 })).toEqual({ kind: 'conflict' })
  })
})

describe('charactersLeftHint', () => {
  it('stays quiet well below the limit', () => {
    expect(charactersLeftHint('Short')).toBeNull()
  })

  it('counts down near the limit', () => {
    expect(charactersLeftHint('x'.repeat(MAX_LABEL_LENGTH - 5))).toBe('5 characters left')
  })
})
