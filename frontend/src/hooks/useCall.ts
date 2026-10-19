import { useEffect, useEffectEvent, useRef, useState } from 'react'
import type { RoomSocket } from './useRoomSocket'

/**
 * Fallback when TURN credentials can't be fetched: free public STUN only,
 * which tells each browser its public address. Most calls still connect.
 */
const FALLBACK_ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
]

/** The fields a call message may carry. Anything else is ignored. */
type CallMessage = {
  type?: string
  sdp?: string
  candidate?: RTCIceCandidateInit
  /** On a `camera` or `mic` message: is the partner's camera / mic on? */
  on?: boolean
}

/**
 * Puts my camera and mic into the phone's sending slots (null = send
 * nothing). Safe to call again: it swaps, never adds, so no new offer.
 */
function putTracks(
  pc: RTCPeerConnection,
  videoTrack: MediaStreamTrack | null,
  audioTrack: MediaStreamTrack | null,
) {
  return Promise.all(
    pc.getTransceivers().map((slot) => {
      // The receiver's track always exists; the sender's is null until filled.
      const kind = slot.receiver.track.kind
      return slot.sender.replaceTrack(
        kind === 'video' ? videoTrack : audioTrack,
      )
    }),
  )
}

/**
 * The video call with the partner, over the room's `socket`. The newcomer
 * offers; the one already in the room answers. `micLive` = the partner can
 * hear me (mic button on and a mic to send).
 */
export function useCall(
  socket: RoomSocket,
  videoTrack: MediaStreamTrack | null,
  audioTrack: MediaStreamTrack | null,
  micLive: boolean,
) {
  const { send, subscribe } = socket
  const pcRef = useRef<RTCPeerConnection | null>(null)
  /**
   * The servers each new phone gathers routes from. Starts as the fallback;
   * replaced by Cloudflare's STUN + TURN list once fetched on Join.
   */
  const iceServersRef = useRef<RTCIceServer[]>(FALLBACK_ICE_SERVERS)
  /** Settles when the ICE server fetch is done, either way. Never rejects. */
  const iceReadyRef = useRef<Promise<void>>(Promise.resolve())
  const [partnerStream, setPartnerStream] = useState<MediaStream | null>(null)
  /**
   * Whether the partner's camera is on, from their `camera` messages.
   * Starts false: a moment of "camera off" while video loads beats a black box.
   */
  const [partnerCameraOn, setPartnerCameraOn] = useState(false)
  /**
   * Whether the partner's mic is on, from their `mic` messages. Starts true:
   * a wrong "muted" badge would make you think they can't hear you.
   */
  const [partnerMicOn, setPartnerMicOn] = useState(true)

  /** Tells the partner whether my camera is on: on = there's a video track. */
  const sendCamera = () => {
    send(JSON.stringify({ type: 'camera', on: videoTrack !== null }))
  }

  /** Tells the partner whether they can hear me. */
  const sendMic = () => {
    send(JSON.stringify({ type: 'mic', on: micLive }))
  }

  /** Hangs up and forgets the phone and the partner's stream, if any. */
  const closePhone = () => {
    pcRef.current?.close()
    pcRef.current = null
    setPartnerStream(null)
    // Back to the default, so the next partner starts fresh.
    setPartnerCameraOn(false)
    setPartnerMicOn(true)
  }

  /** Throws away any old phone and gets a new one, but keeps the partner's camera/mic state. */
  const newPhone = () => {
    // Don't call closePhone: that would reset the partner's camera/mic state, which is not stale in this case.
    pcRef.current?.close()
    pcRef.current = null
    setPartnerStream(null)

    const pc = new RTCPeerConnection({ iceServers: iceServersRef.current })
    pc.onsignalingstatechange = () => {
      console.log('call: signalingState', pc.signalingState)
    }
    pc.onconnectionstatechange = () => {
      console.log('call: connectionState', pc.connectionState)
    }
    pc.ontrack = (e) => {
      console.log('call: partner track', e.track.kind)
      // Updater form: fill the stream with the new track.
      setPartnerStream(
        (prev) => new MediaStream([...(prev?.getTracks() ?? []), e.track]),
      )
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
        // Safe to wait: the partner holds a phone ready for my offer.
        await iceReadyRef.current
        const pc = newPhone()
        // They may not know my camera is off or I'm muted: say so now.
        sendCamera()
        sendMic()
        pc.addTransceiver('video')
        pc.addTransceiver('audio')
        await putTracks(pc, videoTrack, audioTrack)
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        send(JSON.stringify(offer))
        break
      }

      // I was here first: get a phone and wait for the offer. No waiting for
      // the ICE fetch: the offer may arrive any moment and needs a phone.
      case 'partner-joined':
        newPhone()
        // They missed any camera/mic message sent before they arrived.
        sendCamera()
        sendMic()
        break

      // The partner turned their camera on or off. Strict check: only a real
      // `true` counts, so a malformed message reads as "off".
      case 'camera':
        setPartnerCameraOn(msg.on === true)
        break

      // The partner muted or unmuted. Only a real `false` counts, so a
      // malformed message never shows a wrong "muted" badge.
      case 'mic':
        setPartnerMicOn(msg.on !== false)
        break

      case 'offer': {
        const pc = pcRef.current
        if (!pc) return
        await pc.setRemoteDescription({ type: 'offer', sdp: msg.sdp })
        // The offer's slots arrive receive-only; we send too.
        pc.getTransceivers().forEach((t) => {
          t.direction = 'sendrecv'
        })
        await putTracks(pc, videoTrack, audioTrack)
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

  // Fetch STUN + TURN on Join, before any partner shows up. A failure keeps
  // the fallback, so the promise never rejects and the newcomer can await it.
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/ice-servers')
        if (!res.ok) throw new Error(`status ${res.status}`)
        const data: { iceServers?: RTCIceServer[] } = await res.json()
        if (Array.isArray(data.iceServers)) {
          iceServersRef.current = data.iceServers
        }
      } catch (err) {
        console.warn('call: no TURN, using STUN only', err)
      }
    }
    iceReadyRef.current = load()
  }, [])

  // Plug into the socket; the cleanup unplugs on unmount.
  useEffect(() => subscribe((data) => handleMessage(data)), [subscribe])

  // A track changed mid-call (camera toggled, mic allowed late): swap it in.
  // No phone yet? The offer/answer cases put the latest tracks in later.
  useEffect(() => {
    const pc = pcRef.current
    if (!pc) return
    putTracks(pc, videoTrack, audioTrack)
  }, [videoTrack, audioTrack])

  // My camera turned on or off mid-call: tell the partner. No phone = no
  // partner yet; the partner-joined/present cases send it when they arrive.
  useEffect(() => {
    if (!pcRef.current) return
    send(JSON.stringify({ type: 'camera', on: videoTrack !== null }))
  }, [videoTrack, send])

  // Muted, unmuted, or the mic arrived or failed mid-call: tell the partner.
  useEffect(() => {
    if (!pcRef.current) return
    send(JSON.stringify({ type: 'mic', on: micLive }))
  }, [micLive, send])

  // Hang up when the room goes away. Its own effect, not the subscribe one:
  // that cleanup also runs if `subscribe` ever changes, which would drop a live call.
  useEffect(() => closePhone, [])

  return { partnerStream, partnerCameraOn, partnerMicOn }
}
