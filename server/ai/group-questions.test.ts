import { describe, expect, it } from 'vitest'
import { groupQuestions, type StructuredLlm } from './group-questions'

const WHY_NOW_ID = '7f3c9a2e-1b4d-4e8f-9a6c-2d5e8f1b3c7a'
const WHO_DECIDES_ID = 'c41e8b7d-9f2a-4c3e-b8d1-6a7f2e9c4b1d'

const questions = [
  { id: WHY_NOW_ID, text: 'Why now?' },
  { id: WHO_DECIDES_ID, text: 'Who decides?' },
]

const input = { challenge: 'Should we launch in Q3?', questions }

type JsonRequest = Parameters<StructuredLlm['completeJson']>[0]

function fakeLlm(reply: unknown) {
  const requests: JsonRequest[] = []
  const llm: StructuredLlm = {
    async completeJson(request) {
      requests.push(request)
      return reply
    },
  }
  return { llm, requests }
}

function rejectingLlm(error: Error): StructuredLlm {
  return { completeJson: () => Promise.reject(error) }
}

const allInOne = { groups: [{ label: 'All', questionIds: ['q1', 'q2'] }] }

describe('groupQuestions', () => {
  it('skips the LLM when there are no questions', async () => {
    const { llm, requests } = fakeLlm(allInOne)

    expect(await groupQuestions(llm, { challenge: input.challenge, questions: [] })).toEqual([])
    expect(requests).toHaveLength(0)
  })

  it('sends the challenge and every question as {id, text} JSON with short aliases in input order', async () => {
    const { llm, requests } = fakeLlm(allInOne)

    await groupQuestions(llm, input)

    expect(requests[0].user).toContain('Challenge: Should we launch in Q3?')
    expect(requests[0].user).toContain(
      JSON.stringify([
        { id: 'q1', text: 'Why now?' },
        { id: 'q2', text: 'Who decides?' },
      ]),
    )
  })

  it('never sends the real question ids', async () => {
    const { llm, requests } = fakeLlm(allInOne)

    await groupQuestions(llm, input)

    expect(requests[0].user).not.toContain(WHY_NOW_ID)
    expect(requests[0].user).not.toContain(WHO_DECIDES_ID)
  })

  it('maps the returned aliases back to the real question ids', async () => {
    const { llm } = fakeLlm({ groups: [{ label: 'All', questionIds: ['q2', 'q1'] }] })

    expect(await groupQuestions(llm, input)).toEqual([{ label: 'All', questionIds: [WHO_DECIDES_ID, WHY_NOW_ID] }])
  })

  it('never sends extra question fields such as authorId', async () => {
    const { llm, requests } = fakeLlm(allInOne)
    const withAuthors = questions.map((question) => ({ ...question, authorId: 'secret-author' }))

    await groupQuestions(llm, { challenge: input.challenge, questions: withAuthors })

    expect(requests[0].user).not.toContain('authorId')
    expect(requests[0].user).not.toContain('secret-author')
  })

  it('asks for the grouping instructions as the system prompt', async () => {
    const { llm, requests } = fakeLlm(allInOne)

    await groupQuestions(llm, input)

    expect(requests[0].system).toBe(
      'Group questions that ask essentially the same thing. Keep distinct questions in their own group. Label each group with one clear question that captures it. Each question id must appear in exactly one group. Copy ids exactly.',
    )
  })

  it('requests the strict groups schema', async () => {
    const { llm, requests } = fakeLlm(allInOne)

    await groupQuestions(llm, input)

    expect(requests[0].schema).toEqual({
      type: 'object',
      properties: {
        groups: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              label: { type: 'string' },
              questionIds: { type: 'array', items: { type: 'string' } },
            },
            required: ['label', 'questionIds'],
            additionalProperties: false,
          },
        },
      },
      required: ['groups'],
      additionalProperties: false,
    })
  })

  it('normalizes the reply, dropping unknown aliases and collecting missing ones as Ungrouped', async () => {
    const { llm } = fakeLlm({ groups: [{ label: 'Timing', questionIds: ['q1', 'q9', WHO_DECIDES_ID] }] })

    expect(await groupQuestions(llm, input)).toEqual([
      { label: 'Why now?', questionIds: [WHY_NOW_ID] },
      { label: 'Ungrouped', questionIds: [WHO_DECIDES_ID] },
    ])
  })

  it('rejects when the LLM rejects', async () => {
    await expect(groupQuestions(rejectingLlm(new Error('boom')), input)).rejects.toThrow('boom')
  })

  it('rejects when the reply has no groups array', async () => {
    const { llm } = fakeLlm({ groups: 'nope' })

    await expect(groupQuestions(llm, input)).rejects.toThrow()
  })
})
