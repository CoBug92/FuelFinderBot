import { describe, expect, it, vi } from "vitest";
import { AvailabilityNotifier } from "../src/services/availability-notifier.js";
import { StateStore } from "../src/services/state-store.js";
import { Logger } from "../src/logger.js";
import type { Station } from "../src/domain/types.js";

describe("AvailabilityNotifier", () => {
  it("sends alert only on false to true transition", async () => {
    const store = {
      getUsers: () => [
        {
          userId: "1",
          chatId: 42,
          subscriptions: [
            {
              brand: "gazpromneft",
              stationId: "10",
              stationLabel: "Газпромнефть • АЗС № 10 • Москва",
              fuelCodes: ["gpn:62"]
            }
          ]
        }
      ],
      getAvailability: () => ({ "gpn:62": false }),
      bulkSetAvailability: vi.fn()
    } as unknown as StateStore;

    const sendMessage = vi.fn().mockResolvedValue(undefined);
    const bot = {
      api: {
        sendMessage
      }
    };

    const notifier = new AvailabilityNotifier(bot as never, store, new Logger("error"));
    const stations: Station[] = [
      {
        brand: "gazpromneft",
        stationId: "10",
        displayName: "АЗС № 10",
        city: "Москва",
        address: "Проспект Мира, 1",
        coordinates: { latitude: 55.7, longitude: 37.6 },
        fuelAvailability: { "gpn:62": true },
        fuelLabels: { "gpn:62": "АИ-95" }
      }
    ];

    await notifier.processStations(stations);

    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(sendMessage).toHaveBeenCalledWith(
      42,
      expect.stringContaining("Появилось топливо: АИ-95")
    );
  });
});
