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
