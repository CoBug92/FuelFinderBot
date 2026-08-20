import { describe, expect, it, vi } from "vitest";
import { GazpromneftProvider, normalizeGazpromneftStation } from "../src/providers/gazpromneft.js";

describe("normalizeGazpromneftStation", () => {
  it("normalizes Moscow region station", () => {
    const station = normalizeGazpromneftStation({
      id: 501,
      name: "АЗС № 501",
      city: "Москва",
      address: "Ленинградское шоссе, 10",
      latitude: "55.82",
      longitude: "37.49",
      oils: {
        "12": true,
        "62": false,
        "372": true,
        "421": true
      }
    });

    expect(station).not.toBeNull();
    expect(station?.brand).toBe("gazpromneft");
    expect(station?.fuelLabels["gpn:12"]).toBe("АИ-95");
    expect(station?.fuelLabels["gpn:62"]).toBe("АИ-92");
    expect(station?.fuelLabels["gpn:372"]).toBe("ДТ");
    expect(station?.fuelLabels["gpn:421"]).toBe("G-95");
    expect(station?.fuelAvailability["gpn:372"]).toBe(true);
  });

  it("filters out non Moscow region station", () => {
    const station = normalizeGazpromneftStation({
      id: 999,
      name: "АЗС № 999",
      city: "Новосибирск",
      address: "Покатная, 124",
      latitude: "55.02546",
      longitude: "82.94943",
      oils: {}
    });

    expect(station).toBeNull();
  });

  it("sends browser-like headers required by Gazpromneft WAF", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ stations: [] })
    });
    const provider = new GazpromneftProvider(undefined, fetchImpl as typeof fetch);

    await provider.fetchStations();

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://gpnbonus.ru/api/stations/list",
      expect.objectContaining({
        method: "POST",
        body: "{}",
        headers: expect.objectContaining({
          origin: "https://gpnbonus.ru",
          referer: "https://gpnbonus.ru/",
          accept: "application/json, text/plain, */*"
        })
      })
    );
  });
});
