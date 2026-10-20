import type { GroupingStatus, Phase } from '../../shared/protocol'

export interface Participant {
  id: string
  resumeToken: string
  name: string
  done: boolean
}

export interface Question {
  id: string
  authorId: string
  text: string
}

export interface GroupDraft {
  label: string
  questionIds: string[]
}

export interface Group extends GroupDraft {
  id: string
  version: number
}

export type SystemCommand = { type: 'groupingCompleted'; groups: GroupDraft[] }

export interface SessionState {
  id: string
  challenge: string
  burstSeconds: number
  phase: Phase
  endsAt: number | null
  participants: Record<string, Participant>
  questions: Record<string, Question>
  groupingStatus: GroupingStatus
  groups: Record<string, Group>
  votes: Record<string, Record<string, number>>
}

export interface CommandContext {
  now: number
  newId: () => string
}
