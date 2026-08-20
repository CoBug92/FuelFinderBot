import { describe, expect, it, vi } from "vitest";
import { LukoilProvider, normalizeLukoilStation } from "../src/providers/lukoil.js";

describe("normalizeLukoilStation", () => {
  it("normalizes Moscow region station and decodes available fuel labels", () => {
    const station = normalizeLukoilStation(
      {
        GasStationId: 501,
        Latitude: 55.75,
        Longitude: 37.61,
        DisplayName: "АЗС №5001",
        Street: "Ленинградское шоссе, 10",
        City: "Москва"
      },
      [3, 6, 17],
      new Map([
        [3, "АИ 92 ЭКТО"],
        [6, "АИ 95 ЭКТО"],
        [17, "ДИЗЕЛЬ ЭКТО"]
      ]),
      "Россия, Москва, Ленинградское шоссе, 10"
    );

    expect(station).not.toBeNull();
    expect(station?.brand).toBe("lukoil");
    expect(station?.address).toBe("Россия, Москва, Ленинградское шоссе, 10");
    expect(station?.fuelLabels["lukoil:3"]).toBe("АИ 92 ЭКТО");
    expect(station?.fuelLabels["lukoil:6"]).toBe("АИ 95 ЭКТО");
    expect(station?.fuelAvailability["lukoil:17"]).toBe(true);
  });

  it("filters out non Moscow region station", () => {
    const station = normalizeLukoilStation(
      {
        GasStationId: 999,
        Latitude: 55.03,
        Longitude: 82.92,
        DisplayName: "АЗС №9999",
        Street: "Покатная, 124",
        City: "Новосибирск"
      },
      [3],
      new Map([[3, "АИ 92 ЭКТО"]])
    );

    expect(station).toBeNull();
  });
});

describe("LukoilProvider", () => {
  it("builds stations from the public cartography endpoints", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          GasStations: [
            {
              GasStationId: 501,
              Latitude: 55.75,
              Longitude: 37.61,
              DisplayName: "АЗС №5001",
              Street: "Ленинградское шоссе, 10",
              City: "Москва"
            }
          ]
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          FuelClasses: [0, 1, 2, 3, 4, 5, 6, 7],
          GasStations: [
            {
              GasStationId: 501,
              FuelClasses: [72]
            }
          ]
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { FuelId: 3, Name: "АИ 92 ЭКТО" },
          { FuelId: 6, Name: "АИ 95 ЭКТО" }
        ]
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            GasStation: {
              GasStationId: 501,
              Address: "Россия, Москва, Ленинградское шоссе, 10"
            }
          }
        ]
      });

    const provider = new LukoilProvider(undefined, undefined, undefined, undefined, fetchImpl as typeof fetch);
    const result = await provider.fetchStations();

    expect(result.stations).toHaveLength(1);
    expect(result.stations[0]?.address).toBe("Россия, Москва, Ленинградское шоссе, 10");
    expect(result.stations[0]?.fuelLabels).toEqual({
      "lukoil:3": "АИ 92 ЭКТО",
      "lukoil:6": "АИ 95 ЭКТО"
    });
    expect(fetchImpl).toHaveBeenCalledTimes(4);
  });
});
