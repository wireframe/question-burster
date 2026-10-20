import { describe, expect, it } from 'vitest'
import { NOTE_COLOR_COUNT } from '../../shared/protocol'
import { pickColorIndex } from './note-colors'

const allColors = Array.from({ length: NOTE_COLOR_COUNT }, (_, index) => index)

describe('pickColorIndex', () => {
  it('picks among the unused colors using the random source', () => {
    expect(pickColorIndex([0, 2], () => 0)).toBe(1)
    expect(pickColorIndex([0, 2], () => 0.999)).toBe(NOTE_COLOR_COUNT - 1)
  })

  it('never repeats a color while one is unused', () => {
    expect(pickColorIndex(allColors.slice(1), () => 0.5)).toBe(0)
  })

  it('reuses any color once all are taken', () => {
    expect(pickColorIndex(allColors, () => 0.999)).toBe(NOTE_COLOR_COUNT - 1)
    expect(pickColorIndex([...allColors, 3], () => 0)).toBe(0)
  })
})
