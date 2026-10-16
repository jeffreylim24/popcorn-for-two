import { useCallback, useEffect, useEffectEvent, useRef } from 'react'

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

  const send = useCallback((data: string) => {
    if (socketRef.current?.readyState !== WebSocket.OPEN)
      return
    socketRef.current.send(data)
  }, [])

  return send
}
