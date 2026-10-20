/** A command or input the session refuses; its message is the reason shown to the actor. */
import { MAX_BURST_SECONDS, MIN_BURST_SECONDS } from '../../shared/protocol'

export class CommandRejected extends Error {
  constructor(reason: string) {
    super(reason)
    this.name = 'CommandRejected'
  }
}

export function challengeRequired(): CommandRejected {
  return new CommandRejected('Challenge is required')
}

export function burstLengthRejected(): CommandRejected {
  return new CommandRejected(`Burst length must be ${MIN_BURST_SECONDS}–${MAX_BURST_SECONDS} seconds`)
}
