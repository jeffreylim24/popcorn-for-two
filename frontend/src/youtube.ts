/** Hosts whose `/watch` and `/shorts/` links carry a video ID. */
const YOUTUBE_HOSTS = ['youtube.com', 'www.youtube.com', 'm.youtube.com']

/** A YouTube video ID: exactly 11 URL-safe characters. */
export const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/

/**
 * Turns a pasted YouTube link into its 11-character video ID, or null if
 * it isn't one. The server checks the ID again; this check is so the
 * input can show an error right away.
 */
export function parseVideoId(link: string): string | null {
  let url: URL
  try {
    url = new URL(link)
  } catch {
    return null
  }

  let id: string | null = null
  if (url.hostname === 'youtu.be') {
    id = url.pathname.slice(1)
  } else if (YOUTUBE_HOSTS.includes(url.hostname)) {
    if (url.pathname === '/watch') {
      id = url.searchParams.get('v')
    } else if (url.pathname.startsWith('/shorts/')) {
      id = url.pathname.slice('/shorts/'.length)
    }
  }

  return id !== null && VIDEO_ID.test(id) ? id : null
}
