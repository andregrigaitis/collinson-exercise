import type { Location } from '../api/searchLocations.ts'
import { useActivityForecast } from '../hooks/useActivityForecast.ts'
import ActivitySection from './ActivitySection.tsx'

type Props = {
  location: Location
  onBack: () => void
}

function ForecastView({ location, onBack }: Props) {
  const { state, retry } = useActivityForecast(location)
  const place = [location.name, location.region, location.country]
    .filter(Boolean)
    .join(', ')

  return (
    <>
      <button type="button" onClick={onBack}>
        ← Search another place
      </button>
      <h2>{place}</h2>
      {state.status === 'loading' && <p role="status">Loading forecast…</p>}
      {state.status === 'unavailable' && (
        <div role="alert">
          <p>The weather service is unavailable, try again.</p>
          <button type="button" onClick={retry}>
            Retry
          </button>
        </div>
      )}
      {state.status === 'error' && (
        <p role="alert">Something went wrong loading the forecast.</p>
      )}
      {state.status === 'done' &&
        state.activities.map((forecast) => (
          <ActivitySection key={forecast.activity} forecast={forecast} />
        ))}
    </>
  )
}

export default ForecastView
