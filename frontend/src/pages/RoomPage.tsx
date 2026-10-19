import { useState } from 'react'
import { useCamera } from '@/hooks/useCamera'
import { useMic } from '@/hooks/useMic'
import { Lobby } from '@/components/Lobby'
import { RoomView } from '@/components/RoomView'

// Owns the camera so the stream survives Join: Lobby and RoomView swap
// underneath, but this component stays mounted the whole time.
export function RoomPage({ code }: { code: string }) {
  const [joined, setJoined] = useState(false)
  const [cameraOn, setCameraOn] = useState(true)
  const camera = useCamera(cameraOn)
  const [micOn, setMicOn] = useState(true)
  const mic = useMic(micOn)

  if (!joined) {
    return (
      <Lobby
        code={code}
        stream={camera.stream}
        cameraError={camera.error}
        cameraOn={cameraOn}
        onToggleCamera={() => setCameraOn((on) => !on)}
        micError={mic.error}
        micOn={micOn}
        onToggleMic={() => setMicOn((on) => !on)}
        onJoin={() => setJoined(true)}
      />
    )
  }

  return (
    <RoomView
      code={code}
      camStream={camera.stream}
      micStream={mic.stream}
      cameraError={camera.error}
      cameraOn={cameraOn}
      onToggleCamera={() => setCameraOn((on) => !on)}
      micError={mic.error}
      micOn={micOn}
      onToggleMic={() => setMicOn((on) => !on)}
    />
  )
}
