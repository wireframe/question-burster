import Anthropic from '@anthropic-ai/sdk'
import type { StructuredLlm } from './group-questions'

const GROUPING_MODEL = 'claude-haiku-5-5'
const MAX_TOKENS = 8000
const INCOMPLETE_STOP_REASONS = new Set(['max_tokens', 'refusal'])
// Pinned so a stray ANTHROPIC_BASE_URL env var cannot redirect question text.
const ANTHROPIC_BASE_URL = 'https://api.anthropic.com'
const REQUEST_TIMEOUT_MS = 60_000

export function createClaudeLlm({ apiKey }: { apiKey: string }): StructuredLlm {
  const client = new Anthropic({ apiKey, baseURL: ANTHROPIC_BASE_URL, timeout: REQUEST_TIMEOUT_MS, maxRetries: 1 })
  return {
    async completeJson(request) {
      return parseJsonReply(await client.messages.create(buildRequest(request)))
    },
  }
}

function buildRequest({
  system,
  user,
  schema,
}: Parameters<StructuredLlm['completeJson']>[0]): Anthropic.MessageCreateParamsNonStreaming {
  return {
    model: GROUPING_MODEL,
    max_tokens: MAX_TOKENS,
    output_config: { effort: 'low', format: { type: 'json_schema', schema: { ...schema } } },
    system,
    messages: [{ role: 'user', content: user }],
  }
}

export function parseJsonReply(message: Anthropic.Message): unknown {
  if (INCOMPLETE_STOP_REASONS.has(message.stop_reason ?? '')) {
    throw new Error(`Claude stopped before a complete reply: ${message.stop_reason}`)
  }
  return parseJsonWithoutEchoingIt(textOf(message))
}

function parseJsonWithoutEchoingIt(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    throw new Error('Claude reply was not valid JSON')
  }
}

function textOf(message: Anthropic.Message): string {
  const textBlock = message.content.find((block) => block.type === 'text')
  if (!textBlock) throw new Error('Claude reply has no text block')
  return textBlock.text
}
