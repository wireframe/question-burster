import { describe, expect, it } from 'vitest'
import { expectNoKey } from './test-support'

describe('expectNoKey', () => {
  it('passes when the key is absent everywhere', () => {
    expectNoKey({ a: [{ b: 1 }] }, 'authorId')
  })

  it('fails naming the path of a nested key', () => {
    const view = { questions: [{ text: 'Why?' }, { text: 'How?', authorId: 'p1' }] }

    expect(() => expectNoKey(view, 'authorId')).toThrow('$.questions[1].authorId')
  })
})
