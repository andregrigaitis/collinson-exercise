import { useState } from 'react'
import type { Location } from './api/searchLocations.ts'
import ForecastView from './components/ForecastView.tsx'
import LocationResults from './components/LocationResults.tsx'
import SearchBox from './components/SearchBox.tsx'
import { useLocationSearch, type SearchRequest } from './hooks/useLocationSearch.ts'

function App() {
  const [request, setRequest] = useState<SearchRequest | null>(null)
  const [selected, setSelected] = useState<Location | null>(null)
  const search = useLocationSearch(request)

  return (
    <main>
      <h1>Activity forecast</h1>
      {selected ? (
        <ForecastView location={selected} onBack={() => setSelected(null)} />
      ) : (
        <>
          <SearchBox
            initialValue={request?.name}
            onSearch={(name) => setRequest({ name })}
          />
          <LocationResults state={search} onPick={setSelected} />
        </>
      )}
    </main>
  )
}

export default App
