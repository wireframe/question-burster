import { PHASE_ORDER, VOTES_PER_PERSON, type Phase } from '../../shared/protocol'

export interface Step {
  phase: Phase
  number: number
  label: string
  hint: string
}

export type StepStatus = 'done' | 'current' | 'upcoming'

const STEP_COPY: Record<Phase, Pick<Step, 'label' | 'hint'>> = {
  lobby: { label: 'Join', hint: 'Wait for everyone to join, then start the burst.' },
  burst: {
    label: 'Burst',
    hint: 'Write as many questions as you can. No answers, no explanations — just questions.',
  },
  consolidate: {
    label: 'Consolidate',
    hint: "Merge questions that ask the same thing, split ones that don't, and sharpen the wording.",
  },
  vote: {
    label: 'Vote',
    hint: `You have ${VOTES_PER_PERSON} votes. Put them on the questions that matter most — stack them if you feel strongly.`,
  },
  results: { label: 'Results', hint: 'These are the questions the group thinks matter most.' },
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
