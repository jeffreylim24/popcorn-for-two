import { toast } from 'sonner'

/**
 * Toast id shared by every create-room error, so a repeated failure replaces
 * the toast on screen instead of stacking a new one.
 */
const CREATE_ERROR_TOAST_ID = 'create-room-error'

/**
 * The message to show when the server refuses a create with `status`:
 * 429 = this IP's per-10-min limit, 503 = the machine's room cap.
 */
export function createRoomErrorMessage(status: number): string {
  if (status === 429) {
    return 'Too many rooms created, try again in a few minutes'
  }
  if (status === 503) return 'The server is full, try again later'
  return 'Couldn’t create a room, try again'
}

/**
 * Creates a room on the server and goes to its page. If the server refuses
 * or can't be reached, shows an error toast and stays on the current page.
 */
export async function createAndJoinRoom() {
  try {
    const response = await fetch('/api/rooms', { method: 'POST' })
    if (!response.ok) {
      toast.error(createRoomErrorMessage(response.status), {
        id: CREATE_ERROR_TOAST_ID,
      })
      return
    }
    const code = await response.text()
    window.location.assign(`/room/${code}`)
  } catch {
    // fetch rejects (no response at all) when the request never arrives: offline, DNS, etc.
    toast.error('Can’t reach the server, check your connection', {
      id: CREATE_ERROR_TOAST_ID,
    })
  }
}

/**
 * The 6-char room code in a room key (`{machine}-{code}`), for display.
 * Splits on the last `-`, like the server's `parseRoomKey`: codes never
 * contain one. A key with no `-` comes back whole.
 */
export function roomCode(key: string): string {
  return key.slice(key.lastIndexOf('-') + 1)
}
