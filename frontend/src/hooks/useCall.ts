import { useEffect, useEffectEvent, useRef } from 'react'
import type { RoomSocket } from './useRoomSocket'

/** Free public STUN: tells each browser its public address. */
const ICE_SERVERS: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }]

/** The fields a call message may carry. Anything else is ignored. */
type CallMessage = {
  type?: string
  sdp?: string
  candidate?: RTCIceCandidateInit
}

/**
 * The video call with the partner, over the room's `socket`. The newcomer
 * offers; the one already in the room answers.
 */
export function useCall(socket: RoomSocket) {
  const { send, subscribe } = socket
  /** This tab's phone: its half of the call. `null` when there's no call. */
  const pcRef = useRef<RTCPeerConnection | null>(null)

  /** Hangs up and forgets the phone, if there is one. */
  const closePhone = () => {
    pcRef.current?.close()
    pcRef.current = null
  }

  /** Throws away any old phone and gets a new one. */
  const newPhone = () => {
    closePhone()
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
    pc.onsignalingstatechange = () => {
      console.log('call: signalingState', pc.signalingState)
    }
    pc.onconnectionstatechange = () => {
      console.log('call: connectionState', pc.connectionState)
    }
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        send(JSON.stringify({ type: 'candidate', candidate: e.candidate }))
      }
    }
    pcRef.current = pc
    return pc
  }

  /** Applies one incoming message; ignores types that aren't for the call. */
  const handleMessage = useEffectEvent(async (data: string) => {
    let msg: CallMessage
    try {
      msg = JSON.parse(data)
    } catch {
      return
    }

    switch (msg.type) {
      // I'm the newcomer: I offer.
      case 'partner-present': {
        const pc = newPhone()
        pc.addTransceiver('video')
        pc.addTransceiver('audio')
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        send(JSON.stringify(offer))
        break
      }

      // I was here first: get a phone and wait for the offer.
      case 'partner-joined':
        newPhone()
        break

      case 'offer': {
        const pc = pcRef.current
        if (!pc) return
        await pc.setRemoteDescription({ type: 'offer', sdp: msg.sdp })
        // The offer's slots arrive receive-only; we send too.
        pc.getTransceivers().forEach((t) => {
          t.direction = 'sendrecv'
        })
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        send(JSON.stringify(answer))
        break
      }

      case 'answer': {
        const pc = pcRef.current
        if (!pc) return
        await pc.setRemoteDescription({ type: 'answer', sdp: msg.sdp })
        break
      }

      // An address the partner's phone found: our phone tries it.
      case 'candidate': {
        const pc = pcRef.current
        if (!pc) return
        await pc.addIceCandidate(msg.candidate)
        break
      }

      case 'partner-left':
        closePhone()
        break
    }
  })

  // Plug into the socket; the cleanup unplugs on unmount.
  useEffect(() => subscribe((data) => handleMessage(data)), [subscribe])
}
