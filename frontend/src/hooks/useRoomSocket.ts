import { useEffect, useEffectEvent, useRef } from 'react'

export function useRoomSocket(
  code: string | undefined,
  onMessage: (data: string) => void,
) {
  const socketRef = useRef<WebSocket | null>(null)
  const handleMessage = useEffectEvent(onMessage)

  useEffect(() => {
    if (!code) return

    socketRef.current = new WebSocket(`/api/rooms/${code}/ws`)
    socketRef.current.onmessage = (e) => {
      handleMessage(e.data)
    }

    return () => {
      socketRef.current?.close()
      socketRef.current = null
    }
  }, [code])

  return socketRef
}
