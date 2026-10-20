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
  'Group questions that ask essentially the same thing. Keep distinct questions in their own group. Label each group with one clear question that captures it. Each question id must appear in exactly one group. Copy ids exactly.'

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
  return normalizeGroups(toRealIds(readGroups(reply), input.questions), input.questions)
}

function aliasFor(index: number): string {
  return `q${index + 1}`
}

function toRealIds(groups: GroupDraft[], questions: QuestionText[]): GroupDraft[] {
  const realIdByAlias = new Map(questions.map((question, index) => [aliasFor(index), question.id]))
  return groups.map((group) => ({
    label: group.label,
    questionIds: group.questionIds.flatMap((alias) => realIdByAlias.get(alias) ?? []),
  }))
}

function buildUserMessage(input: GroupingInput): string {
  const questions = input.questions.map((question, index) => ({ id: aliasFor(index), text: question.text }))
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
