import type { Location } from "../../domain/types.js";

interface OpenMeteoGeocodingResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  admin1?: string;
}

interface OpenMeteoGeocodingResponse {
  results?: OpenMeteoGeocodingResult[];
}

export class OpenMeteoGeocodingProvider {
  private readonly baseURL = "https://geocoding-api.open-meteo.com/v1/search";

  async search(name: string, count = 3): Promise<Location[]> {
    const query = name.trim();
    if (!query) return [];

    const url = new URL(this.baseURL);
    url.searchParams.set("name", query);
    url.searchParams.set("count", String(count));
    url.searchParams.set("language", "en");
    url.searchParams.set("format", "json");

    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) {
      throw new Error(
        `Open-Meteo geocoding request failed: ${response.status} ${response.statusText}`,
      );
    }

    const data = (await response.json()) as OpenMeteoGeocodingResponse;

    // Open-Meteo omits `results` entirely when nothing matches.
    return (data.results ?? []).map((result) => ({
      id: String(result.id),
      name: result.name,
      country: result.country,
      region: result.admin1,
      latitude: result.latitude,
      longitude: result.longitude,
    }));
  }
}
