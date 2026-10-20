const NOTE_COLORS = ['bg-note-yellow', 'bg-note-pink', 'bg-note-mint', 'bg-note-sky']
const NOTE_TILTS = ['-rotate-1', 'rotate-1', 'rotate-0', '-rotate-[0.5deg]']

export function stickyNoteClasses(index: number): string {
  const color = NOTE_COLORS[index % NOTE_COLORS.length]
  const tilt = NOTE_TILTS[index % NOTE_TILTS.length]
  return `${color} ${tilt} motion-reduce:rotate-0 rounded-note shadow-note text-ink break-words`
}
