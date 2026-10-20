import { describe, expect, it } from 'vitest'
import { groupQuestions, type StructuredLlm } from './group-questions'

const questions = [
  { id: 'q1', text: 'Why now?' },
  { id: 'q2', text: 'Who decides?' },
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

  it('sends the challenge and every question as {id, text} JSON', async () => {
    const { llm, requests } = fakeLlm(allInOne)

    await groupQuestions(llm, input)

    expect(requests[0].user).toContain('Challenge: Should we launch in Q3?')
    expect(requests[0].user).toContain(JSON.stringify(questions))
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
      'Group questions that ask essentially the same thing. Keep distinct questions in their own group. Label each group with one clear question that captures it.',
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

  it('normalizes the reply, dropping unknown ids and collecting missing ones as Ungrouped', async () => {
    const { llm } = fakeLlm({ groups: [{ label: 'Timing', questionIds: ['q1', 'nope'] }] })

    expect(await groupQuestions(llm, input)).toEqual([
      { label: 'Timing', questionIds: ['q1'] },
      { label: 'Ungrouped', questionIds: ['q2'] },
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
