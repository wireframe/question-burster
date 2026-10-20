import type { GroupDraft } from '../session/state'
import { normalizeGroups } from './normalize-groups'

export interface StructuredLlm {
  completeJson(request: { system: string; user: string; schema: object }): Promise<unknown>
}

export interface QuestionText {
  id: string
  text: string
}

export interface GroupingInput {
  challenge: string
  questions: QuestionText[]
}

const SYSTEM_PROMPT =
  'Group questions that ask essentially the same thing. Keep distinct questions in their own group. Label each group with one clear question that captures it.'

const GROUPS_SCHEMA = {
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
}

export async function groupQuestions(llm: StructuredLlm, input: GroupingInput): Promise<GroupDraft[]> {
  if (input.questions.length === 0) return []
  const reply = await llm.completeJson({ system: SYSTEM_PROMPT, user: buildUserMessage(input), schema: GROUPS_SCHEMA })
  return normalizeGroups(readGroups(reply), input.questions)
}

function buildUserMessage(input: GroupingInput): string {
  const questions = input.questions.map((question) => ({ id: question.id, text: question.text }))
  return [
    'Group these questions about the challenge below.',
    `Challenge: ${input.challenge}`,
    'Questions:',
    JSON.stringify(questions),
  ].join('\n')
}

function readGroups(reply: unknown): GroupDraft[] {
  const groups = (reply as { groups?: unknown } | null)?.groups
  if (!Array.isArray(groups)) throw new Error('LLM reply has no groups array')
  return groups as GroupDraft[]
}
