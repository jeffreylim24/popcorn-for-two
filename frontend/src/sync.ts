/**
 * Positions further apart than this count as a seek, and get corrected.
 */
export const SEEK_THRESHOLD_S = 1

// Allowed values live once, as runtime arrays; the types are derived from
// them, so the parser's checks and the types can't drift apart.
export const MESSAGE_TYPES = ['action', 'sync'] as const
export const PLAYBACK_STATES = ['playing', 'paused'] as const

export type MessageType = (typeof MESSAGE_TYPES)[number]
export type PlaybackState = (typeof PLAYBACK_STATES)[number]

export type SyncMessage = {
  type: MessageType
  position: number
  state: PlaybackState
}

export type AgreedState = {
  state: SyncMessage['state']
  position: number
  at: number
}

/**
 * Turns raw socket text into a `SyncMessage`, or `null` if it isn't one.
 * The partner's tab may run older code after a deploy, so nothing off the
 * wire is trusted.
 */
export function parseSyncMessage(data: string): SyncMessage | null {
  let value: unknown

  try {
    value = JSON.parse(data)
  } catch {
    return null
  }

  if (typeof value !== 'object' || value === null) return null
  const v = value as Record<string, unknown>
  if (!MESSAGE_TYPES.some((t) => t === v.type)) return null
  if (typeof v.position !== 'number') return null
  if (v.position < 0) return null
  if (!PLAYBACK_STATES.some((s) => s === v.state)) return null

  return v as SyncMessage
}

/**
 * Where the video should be now (in seconds), given the last state both
 * tabs agreed on. While playing, it moves forward with real time.
 * @param nowMs Current time in ms (e.g. `Date.now()`).
 */
export function expectedPosition(last: AgreedState, nowMs: number): number {
  switch (last.state) {
    case 'playing':
      return last.position + (nowMs - last.at) / 1000
    case 'paused':
      return last.position
    default: {
      const unhandled: never = last.state
      throw new Error(`Unhandled state: ${unhandled}`)
    }
  }
}

/**
 * Echo guard: applying the partner's message fires our own state change,
 * so only send what the partner can't already predict. Otherwise every
 * message would bounce straight back.
 * @param nowMs Current time in ms (e.g. `Date.now()`).
 */
export function isNews(
  last: AgreedState | null,
  state: SyncMessage['state'],
  position: number,
  nowMs: number,
): boolean {
  if (!last || last.state !== state) return true
  const expectedPos = expectedPosition(last, nowMs)
  return Math.abs(expectedPos - position) > SEEK_THRESHOLD_S
}

/**
 * Ahead wins: only the tab that's behind jumps, so two drifting clocks
 * never fight over who's right. That's why the gap is signed, not
 * `Math.abs`.
 */
export function shouldCatchUp(
  isPlaying: boolean,
  myPosition: number,
  partnerPosition: number,
): boolean {
  if (!isPlaying) return false
  const gap = partnerPosition - myPosition
  return gap > SEEK_THRESHOLD_S
}
