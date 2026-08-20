import { describe, expect, it } from "vitest";
import { StationCatalog } from "../src/services/catalog.js";
import type { Station } from "../src/domain/types.js";

const STATIONS: Station[] = [
  {
    brand: "gazpromneft",
    stationId: "10",
    displayName: "АЗС № 10",
    city: "Москва",
    address: "Ленинградское шоссе, 10",
    coordinates: { latitude: 55.8, longitude: 37.5 },
    fuelAvailability: { "gpn:62": true },
    fuelLabels: { "gpn:62": "АИ-95" }
  },
  {
    brand: "lukoil",
    stationId: "10",
    displayName: "АЗС Лукойл 10",
    city: "Химки",
    address: "МКАД, 74 км",
    coordinates: { latitude: 55.89, longitude: 37.4 },
    fuelAvailability: { "luk:95": true },
    fuelLabels: { "luk:95": "АИ-95" }
  }
];

describe("StationCatalog", () => {
  it("finds results across multiple brands", () => {
    const catalog = new StationCatalog();
    catalog.replaceAll(STATIONS);

    const results = catalog.search("10", 10);
    expect(results).toHaveLength(2);
    expect(results.map((station) => station.brand)).toEqual(["gazpromneft", "lukoil"]);
  });

  it("keeps stations with same local id separate", () => {
    const catalog = new StationCatalog();
    catalog.replaceAll(STATIONS);

    expect(catalog.getStation("gazpromneft", "10")?.displayName).toBe("АЗС № 10");
    expect(catalog.getStation("lukoil", "10")?.displayName).toBe("АЗС Лукойл 10");
  });

  it("finds stations by Russian brand label", () => {
    const catalog = new StationCatalog();
    catalog.replaceAll(STATIONS);

    const results = catalog.search("лукойл", 10);

    expect(results).toHaveLength(1);
    expect(results[0]?.brand).toBe("lukoil");
  });

  it("finds stations by internal brand code", () => {
    const catalog = new StationCatalog();
    catalog.replaceAll(STATIONS);

    const results = catalog.search("lukoil", 10);

    expect(results).toHaveLength(1);
    expect(results[0]?.brand).toBe("lukoil");
  });
});
