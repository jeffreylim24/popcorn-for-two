import { useEffect, useState } from 'react'

export function useHealth(): string {
  const [message, setMessage] = useState('Loading...')

  useEffect(() => {
    fetch('/api/health')
      .then((response) => {
        if (!response.ok) {
          throw new Error('Network response was not ok: ' + response.status)
        }
        return response.text()
      })
      .then((data) => setMessage(data))
      .catch((error) =>
        setMessage('Error fetching health status: ' + error.message),
      )
  }, [])

  return message
}
