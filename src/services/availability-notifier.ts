import type { Bot } from "grammy";
import { BRAND_LABELS, formatStationKey } from "../domain/brands.js";
import type { Station } from "../domain/types.js";
import { Logger } from "../logger.js";
import { StateStore } from "./state-store.js";

export class AvailabilityNotifier {
  constructor(
    private readonly bot: Bot,
    private readonly store: StateStore,
    private readonly logger: Logger
  ) {}

  async processStations(stations: Station[]): Promise<void> {
    const stationMap = new Map(stations.map((station) => [formatStationKey(station.brand, station.stationId), station]));
    const users = this.store.getUsers();

    for (const user of users) {
      for (const subscription of user.subscriptions) {
        const key = formatStationKey(subscription.brand, subscription.stationId);
        const station = stationMap.get(key);

        if (!station) {
          continue;
        }

        const previous = this.store.getAvailability(subscription.brand, subscription.stationId);

        if (!previous) {
          continue;
        }

        const newlyAvailable = subscription.fuelCodes.filter((fuelCode) => {
          const current = station.fuelAvailability[fuelCode];
          const before = previous[fuelCode];
          return current === true && before === false;
        });

        if (newlyAvailable.length === 0) {
          continue;
        }

        const labels = newlyAvailable.map((fuelCode) => station.fuelLabels[fuelCode] ?? fuelCode).join(", ");
        const message =
          `Появилось топливо: ${labels}\n` +
          `${BRAND_LABELS[station.brand]} • ${station.displayName}\n` +
          `${station.city}, ${station.address}`;

        try {
          await this.bot.api.sendMessage(user.chatId, message);
          this.logger.info("availability alert sent", {
            userId: user.userId,
            stationKey: key,
            fuels: newlyAvailable
          });
        } catch (error) {
          this.logger.error("failed to send availability alert", {
            userId: user.userId,
            stationKey: key,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
    }

    await this.store.bulkSetAvailability(
      stations.map((station) => ({
        brand: station.brand,
        stationId: station.stationId,
        availability: station.fuelAvailability
      }))
    );
  }
}
