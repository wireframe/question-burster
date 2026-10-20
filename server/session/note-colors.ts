import { NOTE_COLOR_COUNT } from '../../shared/protocol'

const ALL_COLOR_INDEXES = Array.from({ length: NOTE_COLOR_COUNT }, (_, index) => index)

export function pickColorIndex(usedIndexes: number[], random: () => number): number {
  const unused = ALL_COLOR_INDEXES.filter((index) => !usedIndexes.includes(index))
  const choices = unused.length > 0 ? unused : ALL_COLOR_INDEXES
  return choices[Math.floor(random() * choices.length)]
}
