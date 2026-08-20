import type { Brand, Station } from "../domain/types.js";

export interface ProviderFetchResult {
  stations: Station[];
}

export interface StationProvider {
  readonly brand: Brand;
  fetchStations(): Promise<ProviderFetchResult>;
}
