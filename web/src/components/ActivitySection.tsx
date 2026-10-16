import type { Activity, ActivityForecast } from '../api/activityForecast.ts'
import { formatDate } from '../format/date.ts'
import DayRow from './DayRow.tsx'

const ACTIVITY_NAMES: Record<Activity, string> = {
  SKIING: 'Skiing',
  SURFING: 'Surfing',
  OUTDOOR_SIGHTSEEING: 'Outdoor sightseeing',
  INDOOR_SIGHTSEEING: 'Indoor sightseeing',
}

type Props = {
  forecast: ActivityForecast
}

function ActivitySection({ forecast }: Props) {
  const name = ACTIVITY_NAMES[forecast.activity]

  return (
    <section className="activity" aria-labelledby={forecast.activity}>
      <h2 id={forecast.activity}>{name}</h2>
      {!forecast.applicable ? (
        <p>{forecast.reason ?? 'Not available for this place.'}</p>
      ) : (
        <>
          <p className="best-summary">
            {forecast.bestDate
              ? `Best day: ${formatDate(forecast.bestDate)}`
              : 'No good day this week.'}
          </p>
          <ol className="days">
            {forecast.days.map((day) => (
              <DayRow
                key={day.date}
                day={day}
                isBest={day.date === forecast.bestDate}
              />
            ))}
          </ol>
        </>
      )}
    </section>
  )
}

export default ActivitySection
