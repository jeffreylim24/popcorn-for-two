import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Where the socket stands. `not-found` and `full` come from the server's
 * close codes.
 */
export type RoomStatus =
  'connecting' | 'connected' | 'not-found' | 'full' | 'disconnected'

/** A function that gets each incoming message's text. */
type Listener = (data: string) => void

/** What `useRoomSocket` hands back: the pipe that hooks plug into. */
export type RoomSocket = ReturnType<typeof useRoomSocket>

/**
 * This tab's one socket to the room. Hooks plug in with `subscribe` to hear
 * incoming messages; each one ignores the types it doesn't handle.
 */
export function useRoomSocket(code: string) {
  const socketRef = useRef<WebSocket | null>(null)
  /** Everyone plugged in. Kept across reconnects, so nobody has to re-plug. */
  const listenersRef = useRef(new Set<Listener>())

  const [status, setStatus] = useState<RoomStatus>('connecting')
  /**
   * Bumped by `reconnect`. The effect depends on it, so a bump opens a new
   * socket.
   */
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    socketRef.current = new WebSocket(`/api/rooms/${code}/ws`)
    socketRef.current.onmessage = (e) => {
      listenersRef.current.forEach((listener) => listener(e.data))
    }
    socketRef.current.onopen = () => {
      setStatus('connected')
    }
    socketRef.current.onclose = (e) => {
      // TODO: refactor hard-coded error codes into a shared enum with the backend
      switch (e.code) {
        case 4004:
          setStatus('not-found')
          break
        case 4005:
          setStatus('full')
          break
        default:
          setStatus('disconnected')
      }
    }

    return () => {
      const socket = socketRef.current
      if (!socket) return
      // Detach first, so our own close doesn't show "Connection lost".
      socket.onclose = null
      socket.close()
      socketRef.current = null
    }
  }, [code, attempt])

  /** Sends `data` if the socket is open; otherwise drops it (no queue). */
  const send = useCallback((data: string) => {
    if (socketRef.current?.readyState !== WebSocket.OPEN) return
    socketRef.current.send(data)
  }, [])

  /** Opens a fresh socket to the same room, e.g. after "Connection lost". */
  const reconnect = useCallback(() => {
    setAttempt((prev) => prev + 1)
    setStatus('connecting')
  }, [])

  /** Plugs `listener` in. Returns the function that unplugs it. */
  const subscribe = useCallback((listener: Listener) => {
    listenersRef.current.add(listener)
    return () => {
      listenersRef.current.delete(listener)
    }
  }, [])

  return { send, status, reconnect, subscribe }
}
