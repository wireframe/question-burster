import type { Phase } from '../../shared/protocol'
import { STEPS, stepFor, stepStatus, type Step, type StepStatus } from '../session/steps'

export function WorkflowStepper({ phase }: { phase: Phase }) {
  const current = stepFor(phase)
  return (
    <section className="space-y-3">
      <p className="text-sm font-semibold text-accent sm:hidden">
        {`Step ${current.number} of ${STEPS.length} · ${current.label}`}
      </p>
      <ol aria-label="Session progress" className="hidden sm:flex">
        {STEPS.map((step) => <StepItem key={step.phase} step={step} status={stepStatus(step, phase)} />)}
      </ol>
      <StepHint hint={current.hint} />
    </section>
  )
}

const MARKER_STYLES: Record<StepStatus, string> = {
  done: 'bg-accent-soft text-accent border-accent',
  current: 'bg-accent text-white border-accent shadow-card',
  upcoming: 'bg-surface text-ink-muted border-line',
}

const LABEL_STYLES: Record<StepStatus, string> = {
  done: 'text-ink',
  current: 'font-bold text-accent',
  upcoming: 'text-ink-muted',
}

function StepItem({ step, status }: { step: Step; status: StepStatus }) {
  return (
    <li aria-current={status === 'current' ? 'step' : undefined} className="relative flex flex-1 basis-0 flex-col items-center gap-2 text-center">
      {step.number < STEPS.length && <StepConnector done={status === 'done'} />}
      <span className={`relative flex size-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold ${MARKER_STYLES[status]}`}>
        {status === 'done' ? <CheckIcon /> : step.number}
      </span>
      <span className={`text-sm ${LABEL_STYLES[status]}`}>{step.label}</span>
    </li>
  )
}

function StepConnector({ done }: { done: boolean }) {
  return <span aria-hidden="true" className={`absolute top-4 left-[calc(50%+1.5rem)] right-[calc(-50%+1.5rem)] h-0.5 -translate-y-1/2 rounded-full ${done ? 'bg-accent' : 'bg-line'}`} />
}

function CheckIcon() {
  return (
    <svg role="img" aria-label="done" viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 8.5l3 3 6-7" />
    </svg>
  )
}

function StepHint({ hint }: { hint: string }) {
  return (
    <p className="flex items-start gap-3 rounded-xl bg-accent-soft px-4 py-3 text-sm text-ink">
      <span className="shrink-0 font-semibold text-accent-strong">Now</span>
      <span>{hint}</span>
    </p>
  )
}
