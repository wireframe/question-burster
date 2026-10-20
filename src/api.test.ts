import { afterEach, describe, expect, it, vi } from 'vitest'
import { createSessionRequest } from './api'

function stubFetch(status: number, body: unknown) {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify(body), { status }))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('createSessionRequest', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('posts the input as JSON and resolves the new session id', async () => {
    const fetchMock = stubFetch(201, { id: 'abc' })
    const input = { challenge: 'Onboarding is slow', burstSeconds: 240 }

    await expect(createSessionRequest(input)).resolves.toBe('abc')
    expect(fetchMock).toHaveBeenCalledWith('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
  })

  it('throws the server error message when the response is not OK', async () => {
    stubFetch(400, { error: 'challenge is required' })

    await expect(createSessionRequest({ challenge: '', burstSeconds: 240 })).rejects.toThrow('challenge is required')
  })

  it('throws the status when the error response is not JSON', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<html>Bad Gateway</html>', { status: 502 })))

    await expect(createSessionRequest({ challenge: 'Why?', burstSeconds: 240 })).rejects.toThrow('Request failed (502)')
  })
})
