import { VIDEO_ID } from './youtube'

/** Positions further apart than this (seconds) count as a seek, and get corrected. */
export const SEEK_THRESHOLD_S = 1

/**
 * Allowed playback message types. The values live once, as a runtime array,
 * and the type is derived from it, so the parser's checks and the type can't
 * drift apart.
 */
export const PLAYBACK_MESSAGE_TYPES = ['action', 'sync'] as const
/** Allowed playback states. Same pattern: the type is derived from this. */
export const PLAYBACK_STATES = ['playing', 'paused'] as const

export type PlaybackMessageType = (typeof PLAYBACK_MESSAGE_TYPES)[number]
export type PlaybackState = (typeof PLAYBACK_STATES)[number]

/**
 * A playback message. `action`: the user played, paused or seeked.
 * `sync`: the periodic position check sent while playing.
 */
export type PlaybackMessage = {
  type: PlaybackMessageType
  position: number
  state: PlaybackState
}

/** Switches both tabs to a new video. */
export type VideoMessage = { type: 'video'; videoId: string }

/**
 * The last playback state both tabs agreed on. `at` is when, in ms
 * (`Date.now()`), so a playing position can be worked out for any later time.
 */
export type AgreedState = {
  state: PlaybackMessage['state']
  position: number
  at: number
}

/**
 * Turns raw socket text into a `PlaybackMessage`, or `null` if it isn't one.
 * The partner's tab may run older code after a deploy, so nothing off the
 * wire is trusted.
 */
export function parsePlaybackMessage(data: string): PlaybackMessage | null {
  let value: unknown

  try {
    value = JSON.parse(data)
  } catch {
    return null
  }

  if (typeof value !== 'object' || value === null) return null
  const v = value as Record<string, unknown>
  if (!PLAYBACK_MESSAGE_TYPES.some((t) => t === v.type)) return null
  if (typeof v.position !== 'number') return null
  if (v.position < 0) return null
  if (!PLAYBACK_STATES.some((s) => s === v.state)) return null

  return v as PlaybackMessage
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
  state: PlaybackMessage['state'],
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

/**
 * Turns raw socket text into a `VideoMessage`, or `null` if it isn't one.
 * The server already checks the ID, but nothing off the wire is trusted:
 * a bad ID would reach `cueVideoById`.
 */
export function parseVideoMessage(data: string): VideoMessage | null {
  let value: unknown

  try {
    value = JSON.parse(data)
  } catch {
    return null
  }

  if (typeof value !== 'object' || value === null) return null
  const v = value as Record<string, unknown>
  if (v.type !== 'video') return null
  if (typeof v.videoId !== 'string') return null
  if (!VIDEO_ID.test(v.videoId)) return null

  return v as VideoMessage
}
