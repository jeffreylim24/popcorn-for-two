import { describe, expect, test } from 'vitest'
import {
  expectedPosition,
  isNews,
  MAX_PLAYBACK_RATE,
  MIN_PLAYBACK_RATE,
  parsePlaybackMessage,
  parsePlaybackRateMessage,
  parseVideoMessage,
  shouldCatchUp,
} from './sync'
import type { AgreedState } from './sync'

describe('expectedPosition', () => {
  test('paused: position stays the same over time', () => {
    const last: AgreedState = { state: 'paused', position: 10, at: 1000, rate: 1 }
    const result = expectedPosition(last, 2500)
    expect(result).toBe(10)
  })

  test('playing: position advances by elapsed seconds', () => {
    const last: AgreedState = { state: 'playing', position: 10, at: 1000, rate: 1 }
    const result = expectedPosition(last, 2500)
    expect(result).toBe(11.5)
  })

  test('playing at 2x: position advances twice as fast', () => {
    const last: AgreedState = { state: 'playing', position: 10, at: 1000, rate: 2 }
    const result = expectedPosition(last, 2500)
    expect(result).toBe(13)
  })

  test('paused at 2x: position still stays the same', () => {
    const last: AgreedState = { state: 'paused', position: 10, at: 1000, rate: 2 }
    const result = expectedPosition(last, 2500)
    expect(result).toBe(10)
  })
})

describe('isNews', () => {
  test('no agreed state yet: is news', () => {
    const result = isNews(null, 'playing', 10, 1000)
    expect(result).toBe(true)
  })

  test('state changed: is news', () => {
    const last: AgreedState = { state: 'paused', position: 10, at: 1000, rate: 1 }
    const result = isNews(last, 'playing', 10, 1000)
    expect(result).toBe(true)
  })

  test('playing, no time passed, ahead by more than 1s: is news', () => {
    const last: AgreedState = { state: 'playing', position: 10, at: 1000, rate: 1 }
    const result = isNews(last, 'playing', 11.1, 1000)
    expect(result).toBe(true)
  })

  test('playing, 1.5s later, ahead by more than 1s: is news', () => {
    const last: AgreedState = { state: 'playing', position: 10, at: 1000, rate: 1 }
    const result = isNews(last, 'playing', 12.6, 2500) // expected position is 11.5
    expect(result).toBe(true)
  })

  test('playing, 1.5s later, rewound by more than 1s: is news', () => {
    const last: AgreedState = { state: 'playing', position: 10, at: 1000, rate: 1 }
    const result = isNews(last, 'playing', 5, 2500) // expected position is 11.5
    expect(result).toBe(true)
  })

  test('playing, no time passed, within 1s: not news', () => {
    const last: AgreedState = { state: 'playing', position: 10, at: 1000, rate: 1 }
    const result = isNews(last, 'playing', 10.1, 1000)
    expect(result).toBe(false)
  })

  test('playing, 1.5s later, near the projected position: not news', () => {
    const last: AgreedState = { state: 'playing', position: 10, at: 1000, rate: 1 }
    const result = isNews(last, 'playing', 11.4, 2500) // expected position is 11.5
    expect(result).toBe(false)
  })

  test('playing, 1.5s later, exactly 1s ahead: not news', () => {
    const last: AgreedState = { state: 'playing', position: 10, at: 1000, rate: 1 }
    const result = isNews(last, 'playing', 12.5, 2500) // expected position is 11.5
    expect(result).toBe(false)
  })

  test('playing at 2x, 2s later, where 2x puts it: not news', () => {
    const last: AgreedState = { state: 'playing', position: 10, at: 1000, rate: 2 }
    const result = isNews(last, 'playing', 14, 3000) // expected position is 14
    expect(result).toBe(false)
  })

  test('playing at 2x, 2s later, where 1x would put it: is news', () => {
    const last: AgreedState = { state: 'playing', position: 10, at: 1000, rate: 2 }
    const result = isNews(last, 'playing', 12, 3000) // expected position is 14
    expect(result).toBe(true)
  })

  test('paused, 10s later, same position: not news', () => {
    const last: AgreedState = { state: 'paused', position: 10, at: 1000, rate: 1 }
    const result = isNews(last, 'paused', 10, 11000)
    expect(result).toBe(false)
  })

  test('paused, 10s later, moved by more than 1s: is news', () => {
    const last: AgreedState = { state: 'paused', position: 10, at: 1000, rate: 1 }
    const result = isNews(last, 'paused', 30, 11000)
    expect(result).toBe(true)
  })
})

describe('shouldCatchUp', () => {
  // [name, isPlaying, myPosition, partnerPosition, want]
  test.each([
    ['not playing', false, 10, 20, false],
    ['playing, behind by more than 1s', true, 10, 20, true],
    ['playing, behind by exactly 1s', true, 10, 11, false],
    ['playing, behind by less than 1s', true, 10, 10.5, false],
    ['playing, ahead', true, 20, 10, false],
  ])('%s', (_name, isPlaying, mine, partner, want) => {
    expect(shouldCatchUp(isPlaying, mine, partner)).toBe(want)
  })
})

describe('parsePlaybackMessage', () => {
  // A valid message with some fields swapped out. A field set to undefined
  // is left out entirely, because JSON.stringify drops it.
  const message = (fields: Record<string, unknown> = {}) =>
    JSON.stringify({ type: 'sync', position: 10, state: 'playing', ...fields })

  test.each([
    ['valid message', message()],
    ['position is exactly 0', message({ position: 0 })],
  ])('%s: returns PlaybackMessage', (_reason, data) => {
    expect(parsePlaybackMessage(data)).toEqual(JSON.parse(data))
  })

  test.each([
    ['invalid JSON', '{ invalid json }'],
    ['missing fields', message({ state: undefined })],
    ['invalid state', message({ state: 'invalid' })],
    ['invalid type', message({ type: 'invalid' })],
    ['position is not a number', message({ position: 'not a number' })],
    ['position is negative', message({ position: -5 })],
  ])('%s: returns null', (_reason, data) => {
    expect(parsePlaybackMessage(data)).toBeNull()
  })
})

describe('parseVideoMessage', () => {
  test('valid message: returns VideoMessage', () => {
    const data = JSON.stringify({ type: 'video', videoId: 'dQw4w9WgXcQ' })
    const result = parseVideoMessage(data)
    expect(result).toEqual({ type: 'video', videoId: 'dQw4w9WgXcQ' })
  })

  test.each([
    ['invalid JSON', '{ invalid json }'],
    ['not an object', JSON.stringify('dQw4w9WgXcQ')],
    ['wrong type', JSON.stringify({ type: 'action', videoId: 'dQw4w9WgXcQ' })],
    ['missing videoId', JSON.stringify({ type: 'video' })],
    ['videoId not a string', JSON.stringify({ type: 'video', videoId: 42 })],
    ['videoId too short', JSON.stringify({ type: 'video', videoId: 'abc' })],
    [
      'videoId with a bad character',
      JSON.stringify({ type: 'video', videoId: 'dQw4w9WgX<Q' }),
    ],
  ])('%s: returns null', (_reason, data) => {
    expect(parseVideoMessage(data)).toBeNull()
  })
})

describe('parsePlaybackRateMessage', () => {
  // A valid message with some fields swapped out, as in parsePlaybackMessage.
  const message = (fields: Record<string, unknown> = {}) =>
    JSON.stringify({ type: 'playbackRate', playbackRate: 1.5, ...fields })

  test.each([
    ['valid message', message()],
    ['rate is exactly the minimum', message({ playbackRate: MIN_PLAYBACK_RATE })],
    ['rate is exactly the maximum', message({ playbackRate: MAX_PLAYBACK_RATE })],
  ])('%s: returns PlaybackRateMessage', (_reason, data) => {
    expect(parsePlaybackRateMessage(data)).toEqual(JSON.parse(data))
  })

  test.each([
    ['invalid JSON', '{ invalid json }'],
    ['not an object', '1.5'],
    ['invalid type', message({ type: 'video' })],
    ['missing rate', message({ playbackRate: undefined })],
    ['rate is a string', message({ playbackRate: '1.5' })],
    ['rate is below the minimum', message({ playbackRate: 0.1 })],
    ['rate is 0', message({ playbackRate: 0 })],
    ['rate is above the maximum', message({ playbackRate: 3 })],
    ['rate is Infinity', '{"type":"playbackRate","playbackRate":1e999}'],
  ])('%s: returns null', (_reason, data) => {
    expect(parsePlaybackRateMessage(data)).toBeNull()
  })
})
