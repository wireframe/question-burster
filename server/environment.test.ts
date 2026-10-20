import { describe, expect, it } from 'vitest'
import { loadEnvironment } from './environment'

describe('loadEnvironment', () => {
  it('defaults the port and database path', () => {
    expect(loadEnvironment({})).toEqual({ port: 3001, databasePath: 'data/question-burst.db' })
  })

  it('respects PORT and DATABASE_PATH', () => {
    const environment = loadEnvironment({ PORT: '4000', DATABASE_PATH: 'tmp/test.db' })

    expect(environment).toEqual({ port: 4000, databasePath: 'tmp/test.db' })
  })

  it('refuses a PORT that is not a number', () => {
    expect(() => loadEnvironment({ PORT: 'abc' })).toThrow(new Error('Invalid PORT'))
  })

  it('never puts the bad value in the error message', () => {
    expect(() => loadEnvironment({ PORT: 'secret-value' })).toThrow(
      expect.objectContaining({ message: expect.not.stringContaining('secret-value') }),
    )
  })
})
