import { useState } from 'react'
import type { Location } from './api/searchLocations.ts'
import LocationResults from './components/LocationResults.tsx'
import SearchBox from './components/SearchBox.tsx'
import { useLocationSearch, type SearchRequest } from './hooks/useLocationSearch.ts'

function App() {
  const [request, setRequest] = useState<SearchRequest | null>(null)
  const [selected, setSelected] = useState<Location | null>(null)
  const search = useLocationSearch(request)

  function handleSearch(name: string) {
    setRequest({ name })
    setSelected(null)
  }

  return (
    <main>
      <h1>Activity forecast</h1>
      <SearchBox onSearch={handleSearch} />
      {selected ? (
        <p>
          Selected: {selected.name}
          {selected.country && `, ${selected.country}`}
        </p>
      ) : (
        <LocationResults state={search} onPick={setSelected} />
      )}
    </main>
  )
}

export default App
