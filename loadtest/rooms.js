import http from 'k6/http'
import { check } from 'k6'

/** 3 fake users share 20 room creations; from one IP, only the first 10 pass the per-IP limit. */
export const options = { vus: 3, iterations: 20 }

/** One iteration: create a room and check it succeeded. */
export default function () {
  const res = http.post('http://localhost:8080/api/rooms', null)

  check(res, {
    'status is 200': (r) => r.status === 200,
  })
}
