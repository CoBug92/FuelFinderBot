import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { StateStore } from "../src/services/state-store.js";
import { SubscriptionService } from "../src/services/subscription-service.js";
import type { Station } from "../src/domain/types.js";

const GPN_STATION: Station = {
  brand: "gazpromneft",
  stationId: "10",
  displayName: "АЗС № 10",
  city: "Москва",
  address: "Проспект Мира, 1",
  coordinates: { latitude: 55.7, longitude: 37.6 },
  fuelAvailability: { "gpn:62": true },
  fuelLabels: { "gpn:62": "АИ-95" }
};

const LUKOIL_STATION: Station = {
  brand: "lukoil",
  stationId: "10",
  displayName: "АЗС Лукойл 10",
  city: "Москва",
  address: "МКАД, 10 км",
  coordinates: { latitude: 55.8, longitude: 37.7 },
  fuelAvailability: { "luk:95": true },
  fuelLabels: { "luk:95": "АИ-95" }
};

describe("SubscriptionService", () => {
  it("stores subscriptions separately per brand", async () => {
    const dir = await mkdtemp(join(tmpdir(), "gaz-finder-"));
    const store = new StateStore(join(dir, "state.json"));
    await store.load();
    const service = new SubscriptionService(store);

    await service.saveSubscription("1", 100, GPN_STATION, ["gpn:62"]);
    await service.saveSubscription("1", 100, LUKOIL_STATION, ["luk:95"]);

    const user = service.getUserSubscriptions("1");
    expect(user?.subscriptions).toHaveLength(2);

    const rawState = JSON.parse(await readFile(join(dir, "state.json"), "utf8")) as {
      users: Record<string, { subscriptions: Array<{ brand: string; stationId: string }> }>;
    };
    const userState = rawState.users["1"];
    expect(userState).toBeDefined();
    expect(userState?.subscriptions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ brand: "gazpromneft", stationId: "10" }),
        expect.objectContaining({ brand: "lukoil", stationId: "10" })
      ])
    );
  });
});
