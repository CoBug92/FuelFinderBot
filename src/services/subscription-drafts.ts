import type { FuelCode } from "../domain/types.js";

interface DraftState {
  fuelCodes: FuelCode[];
  mode: "create" | "edit";
}

export class SubscriptionDraftStore {
  private readonly drafts = new Map<string, DraftState>();

  set(userId: string, stationKey: string, draft: DraftState): void {
    this.drafts.set(`${userId}:${stationKey}`, draft);
  }

  get(userId: string, stationKey: string): DraftState | undefined {
    return this.drafts.get(`${userId}:${stationKey}`);
  }

  delete(userId: string, stationKey: string): void {
    this.drafts.delete(`${userId}:${stationKey}`);
  }
}
