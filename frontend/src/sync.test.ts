import { describe, expect, test } from 'vitest'
import { expectedPosition, type AgreedState } from './sync'

describe('expectedPosition', () => {
  test('paused: position stays the same over time', () => {
    const last: AgreedState = { state: 'paused', position: 10, at: 1000 }
    const result = expectedPosition(last, 2500)
    expect(result).toBe(10)
  })

  test('playing: position advances by elapsed seconds', () => {
    const last: AgreedState = { state: 'playing', position: 10, at: 1000 }
    const result = expectedPosition(last, 2500)
    expect(result).toBe(11.5)
  })
})
