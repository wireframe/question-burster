import {
  SESSIONS_PATH,
  type CreateSessionRequest,
  type CreateSessionResponse,
  type ErrorResponse,
} from '../shared/protocol'

export async function createSessionRequest(request: CreateSessionRequest): Promise<string> {
  const response = await fetch(SESSIONS_PATH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })
  if (!response.ok) throw new Error(await errorMessage(response))
  return ((await response.json()) as CreateSessionResponse).id
}

async function errorMessage(response: Response): Promise<string> {
  const body = (await response.json().catch(() => null)) as ErrorResponse | null
  return body?.error ?? `Request failed (${response.status})`
}
