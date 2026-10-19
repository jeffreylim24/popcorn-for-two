/** The mic button's text, so the lobby and the room say the same. */
export function micLabel(
  error: 'denied' | 'unavailable' | null,
  on: boolean,
): string {
  if (error === 'denied') return 'Mic blocked'
  if (error === 'unavailable') return 'No mic found'
  return on ? 'Mic on' : 'Mic off'
}
