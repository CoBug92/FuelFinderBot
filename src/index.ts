import { loadConfig } from "./config.js";
import { createProviders } from "./providers/index.js";
import { createTelegramBot } from "./bot.js";
import { Logger } from "./logger.js";
import { AvailabilityNotifier } from "./services/availability-notifier.js";
import { StationCatalog } from "./services/catalog.js";
import { ProviderPoller } from "./services/poller.js";
import { StateStore } from "./services/state-store.js";
import { SubscriptionDraftStore } from "./services/subscription-drafts.js";
import { SubscriptionService } from "./services/subscription-service.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const logger = new Logger(config.logLevel);
  const store = new StateStore(config.stateFilePath);
  await store.load();

  const catalog = new StationCatalog();
  const subscriptionService = new SubscriptionService(store);
  const draftStore = new SubscriptionDraftStore();
  const providers = createProviders(config.enabledBrands);
  const poller = new ProviderPoller(providers, catalog, logger);
  const bot = createTelegramBot({
    config,
    catalog,
    logger,
    subscriptionService,
    draftStore
  });
  const notifier = new AvailabilityNotifier(bot, store, logger);

  const runPoll = async (): Promise<void> => {
    const result = await poller.pollOnce();
    await notifier.processStations(result.stations);
  };

  await runPoll();
  setInterval(() => {
    void runPoll();
  }, config.pollIntervalMs);

  await bot.start({
    onStart: () => {
      logger.info("telegram bot started", {
        brands: config.enabledBrands,
        pollIntervalMs: config.pollIntervalMs
      });
    }
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
