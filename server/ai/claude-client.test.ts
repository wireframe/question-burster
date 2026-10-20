import type Anthropic from '@anthropic-ai/sdk'
import { describe, expect, it } from 'vitest'
import { parseJsonReply } from './claude-client'

function replyWithText(text: string): Anthropic.Message {
  return { stop_reason: 'end_turn', content: [{ type: 'text', text }] } as unknown as Anthropic.Message
}

describe('parseJsonReply', () => {
  it('returns the parsed JSON of the text block', () => {
    expect(parseJsonReply(replyWithText('{"groups":[]}'))).toEqual({ groups: [] })
  })

  it('rejects invalid JSON without quoting the reply', () => {
    const parse = () => parseJsonReply(replyWithText('secret question text'))

    expect(parse).toThrowError(new Error('Claude reply was not valid JSON'))
  })

  it.each(['max_tokens', 'refusal'])('rejects a reply that stopped with %s', (stopReason) => {
    const reply = { ...replyWithText('{"groups":[]}'), stop_reason: stopReason } as Anthropic.Message

    expect(() => parseJsonReply(reply)).toThrowError(`Claude stopped before a complete reply: ${stopReason}`)
  })

  it('rejects a reply without a text block', () => {
    const reply = { stop_reason: 'end_turn', content: [] } as unknown as Anthropic.Message

    expect(() => parseJsonReply(reply)).toThrowError('Claude reply has no text block')
  })
})
