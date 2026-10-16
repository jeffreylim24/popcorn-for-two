import { describe, expect, test } from 'vitest'
import {
  expectedPosition,
  isNews,
  parseSyncMessage,
  shouldCatchUp,
} from './sync'
import type { AgreedState } from './sync'

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

describe('isNews', () => {
  test('no agreed state yet: is news', () => {
    const result = isNews(null, 'playing', 10, 1000)
    expect(result).toBe(true)
  })

  test('state changed: is news', () => {
    const last: AgreedState = { state: 'paused', position: 10, at: 1000 }
    const result = isNews(last, 'playing', 10, 1000)
    expect(result).toBe(true)
  })

  test('playing, no time passed, ahead by more than 1s: is news', () => {
    const last: AgreedState = { state: 'playing', position: 10, at: 1000 }
    const result = isNews(last, 'playing', 11.1, 1000)
    expect(result).toBe(true)
  })

  test('playing, 1.5s later, ahead by more than 1s: is news', () => {
    const last: AgreedState = { state: 'playing', position: 10, at: 1000 }
    const result = isNews(last, 'playing', 12.6, 2500) // expected position is 11.5
    expect(result).toBe(true)
  })

  test('playing, 1.5s later, rewound by more than 1s: is news', () => {
    const last: AgreedState = { state: 'playing', position: 10, at: 1000 }
    const result = isNews(last, 'playing', 5, 2500) // expected position is 11.5
    expect(result).toBe(true)
  })

  test('playing, no time passed, within 1s: not news', () => {
    const last: AgreedState = { state: 'playing', position: 10, at: 1000 }
    const result = isNews(last, 'playing', 10.1, 1000)
    expect(result).toBe(false)
  })

  test('playing, 1.5s later, near the projected position: not news', () => {
    const last: AgreedState = { state: 'playing', position: 10, at: 1000 }
    const result = isNews(last, 'playing', 11.4, 2500) // expected position is 11.5
    expect(result).toBe(false)
  })

  test('playing, 1.5s later, exactly 1s ahead: not news', () => {
    const last: AgreedState = { state: 'playing', position: 10, at: 1000 }
    const result = isNews(last, 'playing', 12.5, 2500) // expected position is 11.5
    expect(result).toBe(false)
  })

  test('paused, 10s later, same position: not news', () => {
    const last: AgreedState = { state: 'paused', position: 10, at: 1000 }
    const result = isNews(last, 'paused', 10, 11000)
    expect(result).toBe(false)
  })

  test('paused, 10s later, moved by more than 1s: is news', () => {
    const last: AgreedState = { state: 'paused', position: 10, at: 1000 }
    const result = isNews(last, 'paused', 30, 11000)
    expect(result).toBe(true)
  })
})

describe('shouldCatchUp', () => {
  test('not playing: should not catch up', () => {
    const result = shouldCatchUp(false, 10, 20)
    expect(result).toBe(false)
  })

  test('playing, behind by more than 1s: should catch up', () => {
    const result = shouldCatchUp(true, 10, 20)
    expect(result).toBe(true)
  })

  test('playing, behind by exactly 1s: should not catch up', () => {
    const result = shouldCatchUp(true, 10, 11)
    expect(result).toBe(false)
  })

  test('playing, behind by less than 1s: should not catch up', () => {
    const result = shouldCatchUp(true, 10, 10.5)
    expect(result).toBe(false)
  })

  test('playing, ahead: should not catch up', () => {
    const result = shouldCatchUp(true, 20, 10)
    expect(result).toBe(false)
  })
})

describe('parseSyncMessage', () => {
  test('valid message: returns SyncMessage', () => {
    const data = JSON.stringify({
      type: 'sync',
      position: 10,
      state: 'playing',
    })
    const result = parseSyncMessage(data)
    expect(result).toEqual({ type: 'sync', position: 10, state: 'playing' })
  })

  test('invalid JSON: returns null', () => {
    const data = '{ invalid json }'
    const result = parseSyncMessage(data)
    expect(result).toBeNull()
  })

  test('missing fields: returns null', () => {
    const data = JSON.stringify({ type: 'sync', position: 10 })
    const result = parseSyncMessage(data)
    expect(result).toBeNull()
  })

  test('invalid state: returns null', () => {
    const data = JSON.stringify({
      type: 'sync',
      position: 10,
      state: 'invalid',
    })
    const result = parseSyncMessage(data)
    expect(result).toBeNull()
  })

  test('invalid type: returns null', () => {
    const data = JSON.stringify({
      type: 'invalid',
      position: 10,
      state: 'playing',
    })
    const result = parseSyncMessage(data)
    expect(result).toBeNull()
  })

  test('position is not a number: returns null', () => {
    const data = JSON.stringify({
      type: 'sync',
      position: 'not a number',
      state: 'playing',
    })
    const result = parseSyncMessage(data)
    expect(result).toBeNull()
  })

  test('position is negative: returns null', () => {
    const data = JSON.stringify({
      type: 'sync',
      position: -5,
      state: 'playing',
    })
    const result = parseSyncMessage(data)
    expect(result).toBeNull()
  })

  test('position is exactly 0: returns SyncMessage', () => {
    const data = JSON.stringify({
      type: 'sync',
      position: 0,
      state: 'playing',
    })
    const result = parseSyncMessage(data)
    expect(result).toEqual({ type: 'sync', position: 0, state: 'playing' })
  })
})
