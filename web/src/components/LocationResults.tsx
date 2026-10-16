import type { Location } from '../api/searchLocations.ts'
import type { SearchState } from '../hooks/useLocationSearch.ts'

type Props = {
  state: SearchState
  onPick: (location: Location) => void
}

function LocationResults({ state, onPick }: Props) {
  switch (state.status) {
    case 'idle':
      return null
    case 'searching':
      return <p role="status">Searching…</p>
    case 'error':
      return <p role="alert">Something went wrong searching. Please try again.</p>
    case 'done':
      if (state.locations.length === 0) {
        return <p role="status">Couldn't find that place</p>
      }
      return (
        <ul>
          {state.locations.map((location) => (
            <li key={location.id}>
              <button type="button" onClick={() => onPick(location)}>
                <strong>{location.name}</strong>{' '}
                {[location.region, location.country].filter(Boolean).join(', ')}
              </button>
            </li>
          ))}
        </ul>
      )
  }
}

export default LocationResults
