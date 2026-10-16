// Positions further apart than this count as a seek, and get corrected.
export const SEEK_THRESHOLD_S = 1

export type SyncMessage = {
  type: 'action' | 'sync'
  position: number
  state: 'playing' | 'paused'
}

export type AgreedState = {
  state: SyncMessage['state']
  position: number
  at: number
}

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

export function shouldCatchUp(
  isPlaying: boolean,
  myPosition: number,
  partnerPosition: number,
): boolean {
  if (!isPlaying) return false
  const gap = partnerPosition - myPosition
  return gap > SEEK_THRESHOLD_S
}
