import type { FuelCode } from "./types.js";

export function sanitizeFuelCode(code: string): FuelCode {
  return code.replace(/[^a-zA-Z0-9:_-]/g, "_");
}

export function sortFuelCodes(codes: FuelCode[], labels: Record<FuelCode, string>): FuelCode[] {
  return [...codes].sort((left, right) => {
    const leftLabel = labels[left] ?? left;
    const rightLabel = labels[right] ?? right;
    return leftLabel.localeCompare(rightLabel, "ru");
  });
}
