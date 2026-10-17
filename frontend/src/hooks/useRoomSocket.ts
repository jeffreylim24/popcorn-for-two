import { useCallback, useEffect, useEffectEvent, useRef, useState } from 'react'

export type RoomStatus =
  'connecting' | 'connected' | 'not-found' | 'full' | 'disconnected'

export function useRoomSocket(code: string, onMessage: (data: string) => void) {
  const socketRef = useRef<WebSocket | null>(null)
  const handleMessage = useEffectEvent(onMessage)

  const [status, setStatus] = useState<RoomStatus>('connecting')
  console.log('[status]', status)

  useEffect(() => {
    socketRef.current = new WebSocket(`/api/rooms/${code}/ws`)
    socketRef.current.onmessage = (e) => {
      handleMessage(e.data)
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
      socket.onclose = null
      socket.close()
      socketRef.current = null
    }
  }, [code])

  const send = useCallback((data: string) => {
    if (socketRef.current?.readyState !== WebSocket.OPEN) return
    socketRef.current.send(data)
  }, [])

  return { send, status }
}
