import type { Brand, Station } from "../domain/types.js";
import { BRAND_LABELS, formatStationKey } from "../domain/brands.js";

function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}

export class StationCatalog {
  private stations = new Map<string, Station>();

  replaceAll(stations: Station[]): void {
    this.stations = new Map(
      stations.map((station) => [formatStationKey(station.brand, station.stationId), station])
    );
  }

  getAll(): Station[] {
    return [...this.stations.values()];
  }

  getStation(brand: Brand, stationId: string): Station | undefined {
    return this.stations.get(formatStationKey(brand, stationId));
  }

  search(query: string, limit: number): Station[] {
    const normalizedQuery = normalizeText(query);
    if (!normalizedQuery) {
      return [];
    }

    return this.getAll()
      .map((station) => {
        const brandLabel = BRAND_LABELS[station.brand];
        const haystack = normalizeText(
          `${station.displayName} ${station.city} ${station.address} ${station.stationId} ${station.brand} ${brandLabel}`
        );

        let score = 0;
        if (haystack.includes(normalizedQuery)) {
          score += 10;
        }
        if (normalizeText(station.displayName).includes(normalizedQuery)) {
          score += 5;
        }
        if (normalizeText(station.city).includes(normalizedQuery)) {
          score += 3;
        }
        if (normalizeText(station.address).includes(normalizedQuery)) {
          score += 2;
        }
        if (normalizeText(station.stationId) === normalizedQuery) {
          score += 10;
        }
        if (normalizeText(brandLabel).includes(normalizedQuery)) {
          score += 4;
        }
        if (normalizeText(station.brand).includes(normalizedQuery)) {
          score += 4;
        }

        return { station, score };
      })
      .filter((entry) => entry.score > 0)
      .sort((left, right) => right.score - left.score)
      .slice(0, limit)
      .map((entry) => entry.station);
  }
}
