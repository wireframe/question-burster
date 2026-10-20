import { PHASE_ORDER, type ClientCommand, type CreateSessionRequest } from '../../shared/protocol'
import { burstLengthRejected, challengeRequired, CommandRejected } from './errors'

type CommandType = ClientCommand['type']
type Message = Record<string, unknown>

const IS_VALID: Record<CommandType, (message: Message) => boolean> = {
  join: (message) => typeof message.name === 'string' && isOptionalString(message.resumeToken),
  advance: (message) => PHASE_ORDER.some((phase) => phase === message.fromPhase),
  submitQuestion: (message) => typeof message.text === 'string',
  markDone: () => true,
  merge: (message) => areStrings(message.sourceGroupId, message.targetGroupId),
  split: (message) => areStrings(message.groupId, message.questionId),
  reword: (message) => areStrings(message.groupId, message.label) && typeof message.baseVersion === 'number',
}

export function parseCommand(message: unknown): ClientCommand {
  if (!isTypedMessage(message)) throw invalidMessage()
  if (!IS_VALID[commandType(message.type)](message)) throw invalidMessage()
  return message as ClientCommand
}

export function parseCreateSessionRequest(input: unknown): CreateSessionRequest {
  const { challenge, burstSeconds } = (input ?? {}) as Message
  if (typeof challenge !== 'string') throw challengeRequired()
  if (burstSeconds !== undefined && typeof burstSeconds !== 'number') throw burstLengthRejected()
  return { challenge, burstSeconds }
}

function commandType(type: string): CommandType {
  if (!Object.hasOwn(IS_VALID, type)) throw new CommandRejected('Unknown command')
  return type as CommandType
}

function isTypedMessage(value: unknown): value is Message & { type: string } {
  return typeof value === 'object' && value !== null && typeof (value as Message).type === 'string'
}

function areStrings(...values: unknown[]): boolean {
  return values.every((value) => typeof value === 'string')
}

function isOptionalString(value: unknown): boolean {
  return value === undefined || typeof value === 'string'
}

function invalidMessage(): CommandRejected {
  return new CommandRejected('Invalid message')
}
