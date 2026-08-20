import type { Brand, FuelCode, Station, StationSubscription, UserRecord } from "../domain/types.js";
import { BRAND_LABELS } from "../domain/brands.js";
import { StateStore } from "./state-store.js";

export class SubscriptionService {
  constructor(private readonly store: StateStore) {}

  getUserSubscriptions(userId: string): UserRecord | undefined {
    return this.store.getUser(userId);
  }

  async saveSubscription(
    userId: string,
    chatId: number,
    station: Station,
    fuelCodes: FuelCode[]
  ): Promise<StationSubscription> {
    const subscription: StationSubscription = {
      brand: station.brand,
      stationId: station.stationId,
      stationLabel: `${BRAND_LABELS[station.brand]} • ${station.displayName} • ${station.city}`,
      fuelCodes: [...new Set(fuelCodes)]
    };

    await this.store.upsertSubscription(userId, chatId, subscription);
    return subscription;
  }

  async removeSubscription(userId: string, brand: Brand, stationId: string): Promise<boolean> {
    return this.store.removeSubscription(userId, brand, stationId);
  }

  async clearUser(userId: string): Promise<boolean> {
    return this.store.clearUser(userId);
  }
}
