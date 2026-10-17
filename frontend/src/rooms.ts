export async function createAndJoinRoom() {
  const response = await fetch('/api/rooms', { method: 'POST' })
  if (!response.ok) {
    console.error('Failed to create room:', response.status)
    return
  }
  const code = await response.text()
  window.location.assign(`/room/${code}`)
}
