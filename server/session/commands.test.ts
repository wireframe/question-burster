import { describe, expect, it } from 'vitest'
import { parseCommand, parseCreateSessionRequest } from './commands'
import { CommandRejected } from './errors'

describe('parseCommand', () => {
  it.each([
    { type: 'join', name: 'Ada' },
    { type: 'join', name: 'Ada', resumeToken: 't1' },
    { type: 'advance', fromPhase: 'lobby' },
    { type: 'submitQuestion', text: 'Why?' },
    { type: 'markDone' },
    { type: 'merge', sourceGroupId: 'g1', targetGroupId: 'g2' },
    { type: 'split', groupId: 'g1', questionId: 'q1' },
    { type: 'reword', groupId: 'g1', label: 'Why?', baseVersion: 0 },
  ])('accepts %j', (message) => {
    expect(parseCommand(message)).toEqual(message)
  })

  it.each([
    null,
    'join',
    { name: 'no type' },
    { type: 7 },
    { type: 'join' },
    { type: 'join', name: 3 },
    { type: 'join', name: 'Ada', resumeToken: 5 },
    { type: 'advance' },
    { type: 'advance', fromPhase: 'intermission' },
    { type: 'submitQuestion' },
    { type: 'submitQuestion', text: 42 },
    { type: 'merge', sourceGroupId: 'g1' },
    { type: 'merge', sourceGroupId: 1, targetGroupId: 'g2' },
    { type: 'split', groupId: 'g1' },
    { type: 'split', groupId: 'g1', questionId: 2 },
    { type: 'reword', groupId: 'g1', label: 'Why?' },
    { type: 'reword', groupId: 'g1', label: 3, baseVersion: 0 },
    { type: 'reword', groupId: 'g1', label: 'Why?', baseVersion: '0' },
  ])('rejects the malformed message %j', (message) => {
    expect(() => parseCommand(message)).toThrow(new CommandRejected('Invalid message'))
  })

  it('rejects an unrecognized type as an unknown command', () => {
    expect(() => parseCommand({ type: 'dance' })).toThrow(new CommandRejected('Unknown command'))
  })

  it('rejects the server-only groupingCompleted command from a client', () => {
    expect(() => parseCommand({ type: 'groupingCompleted', groups: [] })).toThrow(new CommandRejected('Unknown command'))
  })

  it('rejects a type inherited from Object.prototype as an unknown command', () => {
    expect(() => parseCommand({ type: 'toString' })).toThrow(new CommandRejected('Unknown command'))
  })
})

describe('parseCreateSessionRequest', () => {
  it.each([
    { challenge: 'Why?' },
    { challenge: 'Why?', burstSeconds: 60 },
  ])('accepts %j', (input) => {
    expect(parseCreateSessionRequest(input)).toEqual(input)
  })

  it.each([undefined, {}, { challenge: 5 }])('rejects the input %j without a string challenge', (input) => {
    expect(() => parseCreateSessionRequest(input)).toThrow(new CommandRejected('Challenge is required'))
  })

  it('rejects a burstSeconds that is not a number', () => {
    expect(() => parseCreateSessionRequest({ challenge: 'Why?', burstSeconds: '240' })).toThrow(
      new CommandRejected('Burst length must be 30–1800 seconds'),
    )
  })
})
