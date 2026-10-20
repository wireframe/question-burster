import { describe, expect, it } from 'vitest'
import { loadEnvironment } from './environment'

const REQUIRED = { ANTHROPIC_API_KEY: 'test-key' }

describe('loadEnvironment', () => {
  it('defaults the port and database path', () => {
    expect(loadEnvironment(REQUIRED)).toEqual({
      port: 3280,
      databasePath: 'data/question-burst.db',
      anthropicApiKey: 'test-key',
    })
  })

  it('respects PORT and DATABASE_PATH', () => {
    const environment = loadEnvironment({ ...REQUIRED, PORT: '4000', DATABASE_PATH: 'tmp/test.db' })

    expect(environment).toEqual({ port: 4000, databasePath: 'tmp/test.db', anthropicApiKey: 'test-key' })
  })

  it('refuses a PORT that is not a number', () => {
    expect(() => loadEnvironment({ ...REQUIRED, PORT: 'abc' })).toThrow(new Error('Invalid PORT'))
  })

  it('never puts the bad value in the error message', () => {
    expect(() => loadEnvironment({ ...REQUIRED, PORT: 'secret-value' })).toThrow(
      expect.objectContaining({ message: expect.not.stringContaining('secret-value') }),
    )
  })

  it('requires ANTHROPIC_API_KEY', () => {
    expect(() => loadEnvironment({})).toThrow(/ANTHROPIC_API_KEY/)
  })

  it('treats an empty ANTHROPIC_API_KEY as missing', () => {
    expect(() => loadEnvironment({ ANTHROPIC_API_KEY: '' })).toThrow(/ANTHROPIC_API_KEY/)
  })

  it('never puts the API key in an error message', () => {
    expect(() => loadEnvironment({ ANTHROPIC_API_KEY: 'sk-secret-key', PORT: 'abc' })).toThrow(
      expect.objectContaining({ message: expect.not.stringContaining('sk-secret-key') }),
    )
  })
})
