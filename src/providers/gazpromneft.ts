import type { Station } from "../domain/types.js";
import type { ProviderFetchResult, StationProvider } from "./types.js";

interface GazpromneftStationResponse {
  id: number;
  name: string;
  city: string;
  address: string;
  latitude: string;
  longitude: string;
  oils?: Record<string, boolean>;
}

interface GazpromneftApiResponse {
  stations?: GazpromneftStationResponse[];
}

interface Bounds {
  minLatitude: number;
  maxLatitude: number;
  minLongitude: number;
  maxLongitude: number;
}

const MOSCOW_REGION_BOUNDS: Bounds = {
  minLatitude: 54.9,
  maxLatitude: 57.2,
  minLongitude: 35.0,
  maxLongitude: 40.3
};

const GAZPROMNEFT_FUEL_LABELS: Record<string, string> = {
  "12": "АИ-95",
  "62": "АИ-92",
  "372": "ДТ",
  "421": "G-95",
  "512": "ДТ",
  "100032": "G-100",
  "100036": "АИ-100"
};

const GAZPROMNEFT_REQUEST_HEADERS = {
  accept: "application/json, text/plain, */*",
  "accept-language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
  "content-type": "application/json;charset=UTF-8",
  origin: "https://gpnbonus.ru",
  referer: "https://gpnbonus.ru/",
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "same-origin",
  "user-agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36"
} as const;

function isWithinBounds(latitude: number, longitude: number, bounds: Bounds): boolean {
  return (
    latitude >= bounds.minLatitude &&
    latitude <= bounds.maxLatitude &&
    longitude >= bounds.minLongitude &&
    longitude <= bounds.maxLongitude
  );
}

function isMoscowRegionStation(raw: GazpromneftStationResponse): boolean {
  const city = raw.city.trim().toLowerCase();

  if (city.includes("моск")) {
    return true;
  }

  const latitude = Number(raw.latitude);
  const longitude = Number(raw.longitude);

  if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
    return isWithinBounds(latitude, longitude, MOSCOW_REGION_BOUNDS);
  }

  return false;
}

function buildFuelCode(rawCode: string): string {
  return `gpn:${rawCode}`;
}

export function normalizeGazpromneftStation(raw: GazpromneftStationResponse): Station | null {
  const latitude = Number(raw.latitude);
  const longitude = Number(raw.longitude);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  if (!isMoscowRegionStation(raw)) {
    return null;
  }

  const fuelAvailability: Record<string, boolean> = {};
  const fuelLabels: Record<string, string> = {};
  const oils = raw.oils ?? {};

  for (const [rawCode, available] of Object.entries(oils)) {
    const code = buildFuelCode(rawCode);
    fuelAvailability[code] = Boolean(available);
    fuelLabels[code] = GAZPROMNEFT_FUEL_LABELS[rawCode] ?? `Топливо ${rawCode}`;
  }

  return {
    brand: "gazpromneft",
    stationId: String(raw.id),
    displayName: raw.name.trim(),
    city: raw.city.trim(),
    address: raw.address.trim(),
    coordinates: {
      latitude,
      longitude
    },
    fuelAvailability,
    fuelLabels
  };
}

export class GazpromneftProvider implements StationProvider {
  readonly brand = "gazpromneft" as const;

  constructor(
    private readonly endpoint = "https://gpnbonus.ru/api/stations/list",
    private readonly fetchImpl: typeof fetch = fetch
  ) {}

  async fetchStations(): Promise<ProviderFetchResult> {
    const response = await this.fetchImpl(this.endpoint, {
      method: "POST",
      headers: GAZPROMNEFT_REQUEST_HEADERS,
      body: JSON.stringify({})
    });

    if (!response.ok) {
      throw new Error(`Gazpromneft API returned ${response.status}`);
    }

    const payload = (await response.json()) as GazpromneftApiResponse;
    const stations = (payload.stations ?? [])
      .map((station) => normalizeGazpromneftStation(station))
      .filter((station): station is Station => station !== null);

    return { stations };
  }
}
