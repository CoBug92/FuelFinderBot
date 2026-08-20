export type Brand = "gazpromneft" | "lukoil" | "rosneft";

export type FuelCode = string;

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface FuelAvailabilityEntry {
  code: FuelCode;
  label: string;
  available: boolean;
}

export interface Station {
  brand: Brand;
  stationId: string;
  displayName: string;
  city: string;
  address: string;
  coordinates: Coordinates;
  fuelAvailability: Record<FuelCode, boolean>;
  fuelLabels: Record<FuelCode, string>;
}

export interface StationSubscription {
  brand: Brand;
  stationId: string;
  stationLabel: string;
  fuelCodes: FuelCode[];
}

export interface UserRecord {
  userId: string;
  chatId: number;
  subscriptions: StationSubscription[];
}

export interface AvailabilitySnapshot {
  [fuelCode: FuelCode]: boolean;
}

export interface PersistedState {
  users: Record<string, UserRecord>;
  availability: Record<string, AvailabilitySnapshot>;
}

export interface SearchResult {
  station: Station;
  score: number;
}
