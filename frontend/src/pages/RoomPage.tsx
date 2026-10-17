import { useState } from 'react'
import { useCamera } from '@/hooks/useCamera'
import { Lobby } from '@/components/Lobby'
import { RoomView } from '@/components/RoomView'

// Owns the camera so the stream survives Join: Lobby and RoomView swap
// underneath, but this component stays mounted the whole time.
export function RoomPage({ code }: { code: string }) {
  const [joined, setJoined] = useState(false)
  const [cameraOn, setCameraOn] = useState(true)
  const camera = useCamera(cameraOn)

  if (!joined) {
    return (
      <Lobby
        code={code}
        stream={camera.stream}
        error={camera.error}
        cameraOn={cameraOn}
        onToggleCamera={() => setCameraOn((on) => !on)}
        onJoin={() => setJoined(true)}
      />
    )
  }

  return (
    <RoomView
      code={code}
      stream={camera.stream}
      error={camera.error}
      cameraOn={cameraOn}
      onToggleCamera={() => setCameraOn((on) => !on)}
    />
  )
}
