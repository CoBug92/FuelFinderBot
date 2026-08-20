import type { Station } from "../domain/types.js";
import type { StationProvider } from "../providers/types.js";
import { Logger } from "../logger.js";
import { StationCatalog } from "./catalog.js";

export interface PollResult {
  stations: Station[];
}

export class ProviderPoller {
  constructor(
    private readonly providers: StationProvider[],
    private readonly catalog: StationCatalog,
    private readonly logger: Logger
  ) {}

  async pollOnce(): Promise<PollResult> {
    const stations: Station[] = [];

    for (const provider of this.providers) {
      try {
        const result = await provider.fetchStations();
        stations.push(...result.stations);
        this.logger.info("provider poll completed", {
          brand: provider.brand,
          stations: result.stations.length
        });
      } catch (error) {
        this.logger.error("provider poll failed", {
          brand: provider.brand,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    this.catalog.replaceAll(stations);
    this.logger.info("catalog refreshed", { stations: stations.length });
    return { stations };
  }
}
