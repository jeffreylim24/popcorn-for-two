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
