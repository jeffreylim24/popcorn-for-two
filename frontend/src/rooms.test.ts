import { describe, expect, test } from 'vitest'
import { createRoomErrorMessage, roomCode } from './rooms'

describe('createRoomErrorMessage', () => {
  test.each([
    [429, 'Too many rooms created, try again in a few minutes'],
    [503, 'The server is full, try again later'],
    // Anything else falls back: a server crash, a proxy error, an unexpected status.
    [500, 'Couldn’t create a room, try again'],
    [502, 'Couldn’t create a room, try again'],
    [404, 'Couldn’t create a room, try again'],
  ])('gives %i → %s', (status, want) => {
    expect(createRoomErrorMessage(status)).toBe(want)
  })
})

describe('roomCode', () => {
  test.each([
    ['83d474b7146ed1-xY3kQ9', 'xY3kQ9'],
    ['local-xY3kQ9', 'xY3kQ9'],
    ['xY3kQ9', 'xY3kQ9'],
  ])('gives %s → %s', (key, want) => {
    expect(roomCode(key)).toBe(want)
  })
})
