import { graphql } from './graphql.ts'

export type Activity =
  | 'SKIING'
  | 'SURFING'
  | 'OUTDOOR_SIGHTSEEING'
  | 'INDOOR_SIGHTSEEING'

export type ScoreFactor = {
  name: string
  subScore: number
  weight: number
  detail: string
}

export type DayScore = {
  /** YYYY-MM-DD, the location's local date. */
  date: string
  score: number | null
  factors: ScoreFactor[]
  gate: string | null
  penalty: string | null
  missingData: string | null
}

export type ActivityForecast = {
  activity: Activity
  applicable: boolean
  reason: string | null
  bestDate: string | null
  days: DayScore[]
}

const ACTIVITY_FORECAST = `
  query ActivityForecast($latitude: Float!, $longitude: Float!) {
    activityForecast(latitude: $latitude, longitude: $longitude) {
      activity
      applicable
      reason
      bestDate
      days {
        date
        score
        factors {
          name
          subScore
          weight
          detail
        }
        gate
        penalty
        missingData
      }
    }
  }
`

export async function activityForecast(
  latitude: number,
  longitude: number,
  signal?: AbortSignal,
): Promise<ActivityForecast[]> {
  const data = await graphql<{ activityForecast: ActivityForecast[] }>(
    ACTIVITY_FORECAST,
    { latitude, longitude },
    signal,
  )
  return data.activityForecast
}
