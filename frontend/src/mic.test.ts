import { describe, expect, test } from 'vitest'
import { micLabel } from './mic'

describe('micLabel', () => {
  test.each([
    { error: null, on: true, want: 'Mic on' },
    { error: null, on: false, want: 'Mic off' },
    // An error wins over the toggle: there's no mic to be on or off.
    { error: 'denied', on: true, want: 'Mic blocked' },
    { error: 'unavailable', on: false, want: 'No mic found' },
  ] as const)('error $error, on $on → $want', ({ error, on, want }) => {
    expect(micLabel(error, on)).toBe(want)
  })
})
