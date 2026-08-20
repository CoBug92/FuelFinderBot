import type { Station } from "../domain/types.js";
import type { ProviderFetchResult, StationProvider } from "./types.js";

interface LukoilGasStationSummary {
  GasStationId: number;
  Latitude: number;
  Longitude: number;
  DisplayName: string;
  Street?: string | null;
  City?: string | null;
}

interface LukoilSearchObjectsResponse {
  GasStations?: LukoilGasStationSummary[];
}

interface LukoilCountryFuelState {
  GasStationId: number;
  FuelClasses?: number[];
}

interface LukoilCountryDependentResponse {
  FuelClasses?: number[];
  GasStations?: LukoilCountryFuelState[];
}

interface LukoilFuelClassResponse {
  FuelId: number;
  Name: string;
}

interface LukoilDetailGasStation {
  GasStationId: number;
  Address?: string | null;
}

interface LukoilDetailResponseItem {
  GasStation?: LukoilDetailGasStation | null;
}

interface Bounds {
  minLatitude: number;
  maxLatitude: number;
  minLongitude: number;
  maxLongitude: number;
}

const DETAIL_BATCH_SIZE = 50;

const MOSCOW_REGION_BOUNDS: Bounds = {
  minLatitude: 54.9,
  maxLatitude: 57.2,
  minLongitude: 35.0,
  maxLongitude: 40.3
};

function isWithinBounds(latitude: number, longitude: number, bounds: Bounds): boolean {
  return (
    latitude >= bounds.minLatitude &&
    latitude <= bounds.maxLatitude &&
    longitude >= bounds.minLongitude &&
    longitude <= bounds.maxLongitude
  );
}

function isMoscowRegionStation(raw: LukoilGasStationSummary): boolean {
  const city = String(raw.City ?? "")
    .trim()
    .toLowerCase();

  if (city.includes("моск")) {
    return true;
  }

  return isWithinBounds(raw.Latitude, raw.Longitude, MOSCOW_REGION_BOUNDS);
}

function buildFuelCode(fuelId: number): string {
  return `lukoil:${fuelId}`;
}

function decodeBitset(values: number[], dictionary: number[]): number[] {
  const result: number[] = [];

  for (let groupIndex = 0; groupIndex < values.length; groupIndex += 1) {
    const normalized = (values[groupIndex] ?? 0) >>> 0;

    for (let bitIndex = 0; bitIndex < 32; bitIndex += 1) {
      if ((normalized & (1 << bitIndex)) === 0) {
        continue;
      }

      const dictionaryIndex = groupIndex * 32 + bitIndex;
      const item = dictionary[dictionaryIndex];

      if (item !== undefined) {
        result.push(item);
      }
    }
  }

  return result;
}

export function normalizeLukoilStation(
  raw: LukoilGasStationSummary,
  availableFuelIds: number[],
  fuelLabelsById: Map<number, string>,
  detailedAddress?: string
): Station | null {
  if (!Number.isFinite(raw.Latitude) || !Number.isFinite(raw.Longitude)) {
    return null;
  }

  if (!isMoscowRegionStation(raw)) {
    return null;
  }

  const fuelAvailability: Record<string, boolean> = {};
  const fuelLabels: Record<string, string> = {};

  for (const fuelId of availableFuelIds) {
    const code = buildFuelCode(fuelId);
    fuelAvailability[code] = true;
    fuelLabels[code] = fuelLabelsById.get(fuelId) ?? `Топливо ${fuelId}`;
  }

  return {
    brand: "lukoil",
    stationId: String(raw.GasStationId),
    displayName: raw.DisplayName.trim(),
    city: String(raw.City ?? "").trim(),
    address: String(detailedAddress ?? raw.Street ?? "").trim(),
    coordinates: {
      latitude: raw.Latitude,
      longitude: raw.Longitude
    },
    fuelAvailability,
    fuelLabels
  };
}

export class LukoilProvider implements StationProvider {
  readonly brand = "lukoil" as const;

  constructor(
    private readonly searchObjectsEndpoint = "https://auto.lukoil.ru/api/cartography/GetSearchObjects?form=gasStation",
    private readonly countryDataEndpoint =
      "https://auto.lukoil.ru/api/cartography/GetCountryDependentSearchObjectData?form=gasStation&country=RU",
    private readonly fuelClassesEndpoint =
      "https://auto.lukoil.ru/api/cartography/GetFuelClasses?country=RU&languageCode=RU",
    private readonly detailObjectsEndpoint = "https://auto.lukoil.ru/api/cartography/GetObjects",
    private readonly fetchImpl: typeof fetch = fetch
  ) {}

  private async fetchDetailedAddresses(stationIds: number[]): Promise<Map<number, string>> {
    const addresses = new Map<number, string>();

    if (stationIds.length === 0) {
      return addresses;
    }

    for (let index = 0; index < stationIds.length; index += DETAIL_BATCH_SIZE) {
      const batch = stationIds.slice(index, index + DETAIL_BATCH_SIZE);
      const params = new URLSearchParams({ languageCode: "RU" });

      for (const stationId of batch) {
        params.append("ids", `gasStation${stationId}`);
      }

      const response = await this.fetchImpl(`${this.detailObjectsEndpoint}?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`Lukoil GetObjects API returned ${response.status}`);
      }

      const payload = (await response.json()) as LukoilDetailResponseItem[];

      for (const item of payload) {
        const gasStation = item.GasStation;
        const address = gasStation?.Address?.trim();

        if (gasStation?.GasStationId != null && address) {
          addresses.set(gasStation.GasStationId, address);
        }
      }
    }

    return addresses;
  }

  async fetchStations(): Promise<ProviderFetchResult> {
    const [searchResponse, countryResponse, fuelClassesResponse] = await Promise.all([
      this.fetchImpl(this.searchObjectsEndpoint),
      this.fetchImpl(this.countryDataEndpoint),
      this.fetchImpl(this.fuelClassesEndpoint)
    ]);

    if (!searchResponse.ok) {
      throw new Error(`Lukoil GetSearchObjects API returned ${searchResponse.status}`);
    }

    if (!countryResponse.ok) {
      throw new Error(`Lukoil GetCountryDependentSearchObjectData API returned ${countryResponse.status}`);
    }

    if (!fuelClassesResponse.ok) {
      throw new Error(`Lukoil GetFuelClasses API returned ${fuelClassesResponse.status}`);
    }

    const [searchPayload, countryPayload, fuelClassesPayload] = (await Promise.all([
      searchResponse.json(),
      countryResponse.json(),
      fuelClassesResponse.json()
    ])) as [LukoilSearchObjectsResponse, LukoilCountryDependentResponse, LukoilFuelClassResponse[]];

    const fuelLabelsById = new Map(fuelClassesPayload.map((item) => [item.FuelId, item.Name]));
    const fuelDictionary = countryPayload.FuelClasses ?? [];
    const stationFuelIds = new Map<number, number[]>(
      (countryPayload.GasStations ?? []).map((item) => [
        item.GasStationId,
        decodeBitset(item.FuelClasses ?? [], fuelDictionary)
      ])
    );

    const baseStations = (searchPayload.GasStations ?? [])
      .filter((station) => isMoscowRegionStation(station));
    const detailedAddresses = await this.fetchDetailedAddresses(
      baseStations.map((station) => station.GasStationId)
    );

    const stations = baseStations
      .map((station) =>
        normalizeLukoilStation(
          station,
          stationFuelIds.get(station.GasStationId) ?? [],
          fuelLabelsById,
          detailedAddresses.get(station.GasStationId)
        )
      )
      .filter((station): station is Station => station !== null);

    return { stations };
  }
}
