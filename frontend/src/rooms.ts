/**
 * Creates a room on the server and goes to its page. If the server refuses,
 * logs the status and stays on the current page.
 */
export async function createAndJoinRoom() {
  const response = await fetch('/api/rooms', { method: 'POST' })
  if (!response.ok) {
    console.error('Failed to create room:', response.status)
    return
  }
  const code = await response.text()
  window.location.assign(`/room/${code}`)
}

/**
 * The 6-char room code in a room key (`{machine}-{code}`), for display.
 * Splits on the last `-`, like the server's `parseRoomKey`: codes never
 * contain one. A key with no `-` comes back whole.
 */
export function roomCode(key: string): string {
  return key.slice(key.lastIndexOf('-') + 1)
}
