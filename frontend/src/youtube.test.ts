import { describe, expect, test } from 'vitest'
import { parseVideoId } from './youtube'

describe('parseVideoId', () => {
  test.each([
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://youtube.com/watch?v=dQw4w9WgXcQ',
    'https://m.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s',
    'https://youtu.be/dQw4w9WgXcQ',
    'https://youtu.be/dQw4w9WgXcQ?si=abc',
    'https://www.youtube.com/shorts/dQw4w9WgXcQ',
  ])('returns the ID for %s', (link) => {
    expect(parseVideoId(link)).toBe('dQw4w9WgXcQd')
  })

  test.each([
    ['not a URL', 'hello'],
    ['wrong host', 'https://evil.com/watch?v=dQw4w9WgXcQ'],
    ['watch link without v', 'https://www.youtube.com/watch'],
    ['empty ID', 'https://youtu.be/'],
    ['ID too short', 'https://youtu.be/abc'],
    ['ID too long', 'https://www.youtube.com/watch?v=dQw4w9WgXcQextra'],
  ])('returns null for %s', (_reason, link) => {
    expect(parseVideoId(link)).toBeNull()
  })
})
