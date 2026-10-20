import { PHASE_ORDER, VOTES_PER_PERSON, type Phase } from '../../shared/protocol'

export interface Step {
  phase: Phase
  number: number
  label: string
  hint: string
  advanceLabel: string | null
}

export const QUESTION_GOAL = 15

export type StepStatus = 'done' | 'current' | 'upcoming'

const STEP_COPY: Record<Phase, Omit<Step, 'phase' | 'number'>> = {
  lobby: {
    label: 'Join',
    hint: "Once everyone's here, have the challenge owner talk it through for two minutes, then start the burst.",
    advanceLabel: 'Start burst',
  },
  burst: {
    label: 'Burst',
    hint: `Write as many questions as you can, at least ${QUESTION_GOAL}. No answers, no explanations — just questions.`,
    advanceLabel: 'End burst',
  },
  consolidate: {
    label: 'Consolidate',
    hint: "Merge questions that ask the same thing and split ones that don't. Keep the asker's words where you can, and leave the odd ones standing.",
    advanceLabel: 'Start voting',
  },
  vote: {
    label: 'Vote',
    hint: `You have ${VOTES_PER_PERSON} votes. Put them on questions that open a new path, differ from how you've been approaching it, or make you a little uncomfortable. Stack them if you feel strongly.`,
    advanceLabel: 'Show results',
  },
  results: {
    label: 'Results',
    hint: "These are the questions the group thinks matter most. Pick one and decide what you'll do about it in the next three weeks.",
    advanceLabel: null,
  },
}

export const STEPS: Step[] = PHASE_ORDER.map((phase, index) => ({ phase, number: index + 1, ...STEP_COPY[phase] }))

export function stepFor(phase: Phase): Step {
  return STEPS[PHASE_ORDER.indexOf(phase)]
}

export function stepStatus(step: Step, current: Phase): StepStatus {
  const currentNumber = stepFor(current).number
  if (step.number < currentNumber) return 'done'
  return step.number === currentNumber ? 'current' : 'upcoming'
}
