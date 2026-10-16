import { useEffect, useRef } from 'react'

export function useRoomSocket(code: string | undefined) {
  const socketRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    if (!code) return

    socketRef.current = new WebSocket(`/api/rooms/${code}/ws`)

    return () => {
      socketRef.current?.close()
      socketRef.current = null
    }
  }, [code])

  return socketRef
}
