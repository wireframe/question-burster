import { useId, type CSSProperties, type ReactNode } from 'react'
import type { Phase } from '../../shared/protocol'
import { STEPS, stepFor, stepStatus, type Step, type StepStatus } from '../session/steps'

interface WorkflowStepperProps {
  phase: Phase
  children?: ReactNode
}

export function WorkflowStepper({ phase, children }: WorkflowStepperProps) {
  const current = stepFor(phase)
  const hintId = useId()
  return (
    <div>
      <p className="text-sm font-semibold text-accent sm:hidden">
        {`Step ${current.number} of ${STEPS.length} · ${current.label}`}
      </p>
      <ol aria-label="Session progress" className="hidden sm:flex">
        {STEPS.map((step) => <StepItem key={step.phase} step={step} status={stepStatus(step, phase)} hintId={hintId} />)}
      </ol>
      <StepCallout step={current} hintId={hintId}>{children}</StepCallout>
    </div>
  )
}

const MARKER_STYLES: Record<StepStatus, string> = {
  done: 'bg-accent-soft text-accent/60 border-accent/35',
  current: 'bg-accent text-white border-accent shadow-card ring-4 ring-accent/15',
  upcoming: 'bg-surface text-ink-muted border-line',
}

const LABEL_STYLES: Record<StepStatus, string> = {
  done: 'text-ink-muted',
  current: 'font-bold text-accent',
  upcoming: 'text-ink-muted',
}

interface StepItemProps {
  step: Step
  status: StepStatus
  hintId: string
}

function StepItem({ step, status, hintId }: StepItemProps) {
  const isCurrent = status === 'current'
  return (
    <li aria-current={isCurrent ? 'step' : undefined} aria-describedby={isCurrent ? hintId : undefined}
      className="relative flex flex-1 basis-0 flex-col items-center gap-1.5 text-center">
      {step.number < STEPS.length && <StepConnector done={status === 'done'} />}
      <span className={`relative flex size-7 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold ${MARKER_STYLES[status]}`}>
        {status === 'done' ? <CheckIcon /> : step.number}
      </span>
      <span className={`text-sm ${LABEL_STYLES[status]}`}>{step.label}</span>
    </li>
  )
}

function StepConnector({ done }: { done: boolean }) {
  return <span aria-hidden="true" className={`absolute top-3.5 left-[calc(50%+1.25rem)] right-[calc(-50%+1.25rem)] h-0.5 -translate-y-1/2 rounded-full ${done ? 'bg-accent/35' : 'bg-line'}`} />
}

function CheckIcon() {
  return (
    <svg role="img" aria-label="done" viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 8.5l3 3 6-7" />
    </svg>
  )
}

interface StepCalloutProps {
  step: Step
  hintId: string
  children?: ReactNode
}

function StepCallout({ step, hintId, children }: StepCalloutProps) {
  return (
    <div role="group" aria-label="Current step" style={pointerPosition(step)}
      className="relative mt-3 rounded-xl border border-accent/25 bg-accent-soft px-3 py-2.5 sm:px-4 sm:py-3">
      <span aria-hidden="true" className="absolute -top-1.5 left-6 size-3 -translate-x-1/2 rotate-45 border-t border-l border-accent/25 bg-accent-soft sm:left-(--pointer-x)" />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <p id={hintId} className="min-w-0 basis-full text-sm leading-snug text-ink sm:flex-1 sm:basis-0">{step.hint}</p>
        <div className="flex flex-1 items-center justify-between gap-3 empty:hidden sm:flex-none">{children}</div>
      </div>
    </div>
  )
}

function pointerPosition(step: Step): CSSProperties {
  const centerOfStep = ((step.number - 0.5) / STEPS.length) * 100
  return { '--pointer-x': `${centerOfStep}%` } as CSSProperties
}
