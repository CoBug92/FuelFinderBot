import type { Brand } from "./types.js";

export const BRAND_LABELS: Record<Brand, string> = {
  gazpromneft: "Газпромнефть",
  lukoil: "Лукойл",
  rosneft: "Роснефть"
};

export function formatStationKey(brand: Brand, stationId: string): string {
  return `${brand}:${stationId}`;
}
