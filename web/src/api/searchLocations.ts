import { graphql } from './graphql.ts'

export type Location = {
  id: string
  name: string
  country: string | null
  region: string | null
  latitude: number
  longitude: number
}

const SEARCH_LOCATIONS = `
  query SearchLocations($name: String!) {
    searchLocations(name: $name) {
      id
      name
      country
      region
      latitude
      longitude
    }
  }
`

export async function searchLocations(
  name: string,
  signal?: AbortSignal,
): Promise<Location[]> {
  const data = await graphql<{ searchLocations: Location[] }>(
    SEARCH_LOCATIONS,
    { name },
    signal,
  )
  return data.searchLocations
}
