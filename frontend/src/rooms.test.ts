import { describe, expect, test } from 'vitest'
import { roomCode } from './rooms'

describe('roomCode', () => {
  test.each([
    ['83d474b7146ed1-xY3kQ9', 'xY3kQ9'],
    ['local-xY3kQ9', 'xY3kQ9'],
    ['xY3kQ9', 'xY3kQ9'],
  ])('gives %s → %s', (key, want) => {
    expect(roomCode(key)).toBe(want)
  })
})
