import { describe, expect, it } from 'vitest'
import { parseRoute } from './route'

describe('parseRoute', () => {
  it('maps the root path to the create screen', () => {
    expect(parseRoute('/')).toEqual({ name: 'create' })
  })

  it('maps /s/<id> to the session screen', () => {
    expect(parseRoute('/s/abc')).toEqual({ name: 'session', id: 'abc' })
  })

  it.each(['/s/', '/s/abc/extra', '/other'])('maps %s to not found', (path) => {
    expect(parseRoute(path)).toEqual({ name: 'notFound' })
  })
})
