const NOTE_COLORS = [
  'bg-note-yellow',
  'bg-note-pink',
  'bg-note-mint',
  'bg-note-sky',
  'bg-note-lavender',
  'bg-note-peach',
  'bg-note-lime',
  'bg-note-aqua',
]
const NOTE_TILTS = ['-rotate-1', 'rotate-1', 'rotate-0', '-rotate-[0.5deg]']

export function stickyNoteClasses(color: number, position: number): string {
  const tilt = NOTE_TILTS[position % NOTE_TILTS.length]
  return `${NOTE_COLORS[color]} ${tilt} motion-reduce:rotate-0 rounded-note shadow-note text-ink break-words`
}
