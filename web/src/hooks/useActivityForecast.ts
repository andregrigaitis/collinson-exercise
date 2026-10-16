import { useEffect, useState } from 'react'
import {
  activityForecast,
  type ActivityForecast,
} from '../api/activityForecast.ts'
import { GraphQLRequestError } from '../api/graphql.ts'
import type { Location } from '../api/searchLocations.ts'

export type ForecastState =
  | { status: 'loading' }
  | { status: 'done'; activities: ActivityForecast[] }
  | { status: 'unavailable' }
  | { status: 'error' }

type Result = { location: Location; attempt: number; state: ForecastState }

export function useActivityForecast(location: Location): {
  state: ForecastState
  retry: () => void
} {
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<Result | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    const settle = (state: ForecastState) =>
      setResult({ location, attempt, state })
    activityForecast(location.latitude, location.longitude, controller.signal)
      .then((activities) => settle({ status: 'done', activities }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        console.error(error)
        const unavailable =
          error instanceof GraphQLRequestError &&
          error.code === 'FORECAST_UNAVAILABLE'
        settle({ status: unavailable ? 'unavailable' : 'error' })
      })
    return () => controller.abort()
  }, [location, attempt])

  const current = result?.location === location && result.attempt === attempt
  return {
    state: current ? result.state : { status: 'loading' },
    retry: () => setAttempt((n) => n + 1),
  }
}
