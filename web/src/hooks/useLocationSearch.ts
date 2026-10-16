import { useEffect, useState } from 'react'
import { searchLocations, type Location } from '../api/searchLocations.ts'

// A new object per submit, so searching the same name again (e.g. after an error) re-runs.
export type SearchRequest = { name: string }

export type SearchState =
  | { status: 'idle' }
  | { status: 'searching' }
  | { status: 'done'; locations: Location[] }
  | { status: 'error' }

type Result =
  | { request: SearchRequest; status: 'done'; locations: Location[] }
  | { request: SearchRequest; status: 'error' }

export function useLocationSearch(request: SearchRequest | null): SearchState {
  const [result, setResult] = useState<Result | null>(null)

  useEffect(() => {
    if (request === null) return
    // Abort the previous request so a slow older search can't overwrite a newer one.
    const controller = new AbortController()
    searchLocations(request.name, controller.signal)
      .then((locations) => setResult({ request, status: 'done', locations }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        console.error(error)
        setResult({ request, status: 'error' })
      })
    return () => controller.abort()
  }, [request])

  if (request === null) return { status: 'idle' }
  // Until the current request settles, any stored result is for an older one.
  if (result?.request !== request) return { status: 'searching' }
  return result.status === 'done'
    ? { status: 'done', locations: result.locations }
    : { status: 'error' }
}
