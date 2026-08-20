import { readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { mkdir } from "node:fs/promises";
import type {
  AvailabilitySnapshot,
  Brand,
  PersistedState,
  StationSubscription,
  UserRecord
} from "../domain/types.js";
import { formatStationKey } from "../domain/brands.js";

const EMPTY_STATE: PersistedState = {
  users: {},
  availability: {}
};

function cloneState(state: PersistedState): PersistedState {
  return {
    users: structuredClone(state.users),
    availability: structuredClone(state.availability)
  };
}

export class StateStore {
  private state: PersistedState = cloneState(EMPTY_STATE);

  constructor(private readonly filePath: string) {}

  async load(): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });

    try {
      const raw = await readFile(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as PersistedState;
      this.state = {
        users: parsed.users ?? {},
        availability: parsed.availability ?? {}
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
      await this.persist();
    }
  }

  getUsers(): UserRecord[] {
    return Object.values(this.state.users);
  }

  getUser(userId: string): UserRecord | undefined {
    const user = this.state.users[userId];
    return user ? structuredClone(user) : undefined;
  }

  async upsertSubscription(userId: string, chatId: number, subscription: StationSubscription): Promise<void> {
    const existing = this.state.users[userId] ?? {
      userId,
      chatId,
      subscriptions: []
    };

    const nextSubscriptions = existing.subscriptions.filter(
      (item) => !(item.brand === subscription.brand && item.stationId === subscription.stationId)
    );
    nextSubscriptions.push(subscription);

    this.state.users[userId] = {
      userId,
      chatId,
      subscriptions: nextSubscriptions
    };

    await this.persist();
  }

  async removeSubscription(userId: string, brand: Brand, stationId: string): Promise<boolean> {
    const existing = this.state.users[userId];
    if (!existing) {
      return false;
    }

    const nextSubscriptions = existing.subscriptions.filter(
      (item) => !(item.brand === brand && item.stationId === stationId)
    );

    if (nextSubscriptions.length === existing.subscriptions.length) {
      return false;
    }

    if (nextSubscriptions.length === 0) {
      delete this.state.users[userId];
    } else {
      this.state.users[userId] = {
        ...existing,
        subscriptions: nextSubscriptions
      };
    }

    await this.persist();
    return true;
  }

  async clearUser(userId: string): Promise<boolean> {
    const existed = Boolean(this.state.users[userId]);
    delete this.state.users[userId];

    if (existed) {
      await this.persist();
    }

    return existed;
  }

  getAvailability(brand: Brand, stationId: string): AvailabilitySnapshot | undefined {
    const key = formatStationKey(brand, stationId);
    const snapshot = this.state.availability[key];
    return snapshot ? structuredClone(snapshot) : undefined;
  }

  async setAvailability(brand: Brand, stationId: string, availability: AvailabilitySnapshot): Promise<void> {
    const key = formatStationKey(brand, stationId);
    this.state.availability[key] = structuredClone(availability);
    await this.persist();
  }

  async bulkSetAvailability(
    entries: Array<{ brand: Brand; stationId: string; availability: AvailabilitySnapshot }>
  ): Promise<void> {
    for (const entry of entries) {
      const key = formatStationKey(entry.brand, entry.stationId);
      this.state.availability[key] = structuredClone(entry.availability);
    }

    await this.persist();
  }

  private async persist(): Promise<void> {
    await writeFile(this.filePath, JSON.stringify(this.state, null, 2), "utf8");
  }
}
