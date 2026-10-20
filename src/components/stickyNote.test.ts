import { describe, expect, it } from 'vitest'
import { NOTE_COLOR_COUNT } from '../../shared/protocol'
import { stickyNoteClasses } from './stickyNote'

function backgroundOf(classes: string): string | undefined {
  return classes.split(' ').find((name) => name.startsWith('bg-'))
}

describe('stickyNoteClasses', () => {
  it('gives every palette color its own background', () => {
    const backgrounds = Array.from({ length: NOTE_COLOR_COUNT }, (_, color) => backgroundOf(stickyNoteClasses(color, 0)))

    expect(new Set(backgrounds).size).toBe(NOTE_COLOR_COUNT)
  })

  it('keeps a color regardless of the note position', () => {
    expect(backgroundOf(stickyNoteClasses(3, 0))).toBe(backgroundOf(stickyNoteClasses(3, 5)))
  })
})
