import { Bot, InlineKeyboard } from "grammy";
import { BRAND_LABELS, formatStationKey } from "./domain/brands.js";
import { sortFuelCodes } from "./domain/fuels.js";
import type { AppConfig } from "./config.js";
import type { Brand, FuelCode, Station } from "./domain/types.js";
import { Logger } from "./logger.js";
import { StationCatalog } from "./services/catalog.js";
import { SubscriptionDraftStore } from "./services/subscription-drafts.js";
import { SubscriptionService } from "./services/subscription-service.js";

function createStationKeyboard(station: Station): InlineKeyboard {
  return new InlineKeyboard().text(
    "Подписаться",
    `draft|create|${station.brand}|${station.stationId}`
  );
}

function createFuelSelectionKeyboard(
  station: Station,
  selectedFuelCodes: FuelCode[]
): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  const selected = new Set(selectedFuelCodes);
  const orderedFuelCodes = sortFuelCodes(Object.keys(station.fuelLabels), station.fuelLabels);

  orderedFuelCodes.forEach((fuelCode, index) => {
    const label = station.fuelLabels[fuelCode] ?? fuelCode;
    const marker = selected.has(fuelCode) ? "✅" : "▫️";
    keyboard.text(`${marker} ${label}`, `draft|toggle|${station.brand}|${station.stationId}|${fuelCode}`);
    if (index % 2 === 1) {
      keyboard.row();
    }
  });

  keyboard.row();
  keyboard.text("Сохранить", `draft|save|${station.brand}|${station.stationId}`);
  keyboard.text("Отмена", `draft|cancel|${station.brand}|${station.stationId}`);

  return keyboard;
}

function renderStation(station: Station): string {
  return `${BRAND_LABELS[station.brand]} • ${station.displayName}\n${station.city}, ${station.address}`;
}

function renderSubscription(stationLabel: string, fuelCodes: FuelCode[], station?: Station): string {
  const fuelLabels = fuelCodes.map((fuelCode) => station?.fuelLabels[fuelCode] ?? fuelCode).join(", ");
  return `${stationLabel}\nТопливо: ${fuelLabels || "не выбрано"}`;
}

function isBrand(value: string): value is Brand {
  return value === "gazpromneft" || value === "lukoil" || value === "rosneft";
}

export function createTelegramBot(params: {
  config: AppConfig;
  catalog: StationCatalog;
  logger: Logger;
  subscriptionService: SubscriptionService;
  draftStore: SubscriptionDraftStore;
}): Bot {
  const { config, catalog, logger, subscriptionService, draftStore } = params;
  const bot = new Bot(config.botToken);

  bot.command("start", async (ctx) => {
    await ctx.reply(
      "Ищу топливо на АЗС.\nИспользуй /find <запрос>, чтобы найти станции в Москве и области."
    );
  });

  bot.command("help", async (ctx) => {
    await ctx.reply(
      [
        "/find <запрос> — поиск АЗС по номеру, городу или адресу",
        "/subscriptions — показать текущие подписки",
        "/stop — удалить все подписки"
      ].join("\n")
    );
  });

  bot.command("find", async (ctx) => {
    const query = ctx.match?.toString().trim() ?? "";
    if (!query) {
      await ctx.reply("Передай запрос: /find москва или /find 501");
      return;
    }

    const results = catalog.search(query, config.searchLimit);
    if (results.length === 0) {
      await ctx.reply("По этому запросу ничего не найдено.");
      return;
    }

    for (const station of results) {
      await ctx.reply(renderStation(station), {
        reply_markup: createStationKeyboard(station)
      });
    }
  });

  bot.command("subscriptions", async (ctx) => {
    const user = subscriptionService.getUserSubscriptions(String(ctx.from?.id ?? ""));
    if (!user || user.subscriptions.length === 0) {
      await ctx.reply("Подписок пока нет.");
      return;
    }

    for (const subscription of user.subscriptions) {
      const station = catalog.getStation(subscription.brand, subscription.stationId);
      const keyboard = new InlineKeyboard()
        .text("Изменить топливо", `draft|edit|${subscription.brand}|${subscription.stationId}`)
        .text("Удалить", `sub|remove|${subscription.brand}|${subscription.stationId}`);

      await ctx.reply(
        renderSubscription(subscription.stationLabel, subscription.fuelCodes, station),
        { reply_markup: keyboard }
      );
    }
  });

  bot.command("stop", async (ctx) => {
    const removed = await subscriptionService.clearUser(String(ctx.from?.id ?? ""));
    await ctx.reply(removed ? "Все подписки удалены." : "Подписок не было.");
  });

  bot.callbackQuery(/^draft\|(create|edit)\|([^|]+)\|([^|]+)$/, async (ctx) => {
    const mode = ctx.match[1];
    const brand = ctx.match[2];
    const stationId = ctx.match[3];
    if (!mode || !brand || !stationId || !isBrand(brand)) {
      await ctx.answerCallbackQuery({ text: "Некорректные данные", show_alert: true });
      return;
    }

    const station = catalog.getStation(brand, stationId);
    if (!station) {
      await ctx.answerCallbackQuery({ text: "Станция сейчас недоступна", show_alert: true });
      return;
    }

    const userId = String(ctx.from.id);
    const stationKey = formatStationKey(station.brand, station.stationId);
    const existing = subscriptionService.getUserSubscriptions(userId)?.subscriptions.find(
      (item) => item.brand === station.brand && item.stationId === station.stationId
    );
    const selectedFuelCodes =
      mode === "edit"
        ? existing?.fuelCodes ?? []
        : Object.keys(station.fuelLabels).filter((fuelCode) => station.fuelAvailability[fuelCode] === true);

    draftStore.set(userId, stationKey, {
      mode: mode === "edit" ? "edit" : "create",
      fuelCodes: selectedFuelCodes
    });

    await ctx.editMessageText(`Выбери топливо для подписки\n${renderStation(station)}`, {
      reply_markup: createFuelSelectionKeyboard(station, selectedFuelCodes)
    });
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery(/^draft\|toggle\|([^|]+)\|([^|]+)\|(.+)$/, async (ctx) => {
    const brand = ctx.match[1];
    const stationId = ctx.match[2];
    const fuelCode = ctx.match[3];
    if (!brand || !stationId || !fuelCode || !isBrand(brand)) {
      await ctx.answerCallbackQuery({ text: "Некорректные данные", show_alert: true });
      return;
    }

    const station = catalog.getStation(brand, stationId);
    if (!station) {
      await ctx.answerCallbackQuery({ text: "Станция сейчас недоступна", show_alert: true });
      return;
    }

    const userId = String(ctx.from.id);
    const stationKey = formatStationKey(station.brand, station.stationId);
    const draft = draftStore.get(userId, stationKey);

    if (!draft) {
      await ctx.answerCallbackQuery({ text: "Черновик подписки устарел", show_alert: true });
      return;
    }

    const selected = new Set(draft.fuelCodes);
    if (selected.has(fuelCode)) {
      selected.delete(fuelCode);
    } else {
      selected.add(fuelCode);
    }

    const selectedFuelCodes = [...selected];
    draftStore.set(userId, stationKey, {
      ...draft,
      fuelCodes: selectedFuelCodes
    });

    await ctx.editMessageReplyMarkup({
      reply_markup: createFuelSelectionKeyboard(station, selectedFuelCodes)
    });
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery(/^draft\|save\|([^|]+)\|([^|]+)$/, async (ctx) => {
    const brand = ctx.match[1];
    const stationId = ctx.match[2];
    if (!brand || !stationId || !isBrand(brand)) {
      await ctx.answerCallbackQuery({ text: "Некорректные данные", show_alert: true });
      return;
    }

    const station = catalog.getStation(brand, stationId);
    if (!station) {
      await ctx.answerCallbackQuery({ text: "Станция сейчас недоступна", show_alert: true });
      return;
    }

    const userId = String(ctx.from.id);
    const stationKey = formatStationKey(station.brand, station.stationId);
    const draft = draftStore.get(userId, stationKey);

    if (!draft || draft.fuelCodes.length === 0) {
      await ctx.answerCallbackQuery({ text: "Выбери хотя бы один вид топлива", show_alert: true });
      return;
    }

    if (!ctx.chat) {
      await ctx.answerCallbackQuery({ text: "Чат недоступен", show_alert: true });
      return;
    }

    const subscription = await subscriptionService.saveSubscription(
      userId,
      ctx.chat.id,
      station,
      draft.fuelCodes
    );

    draftStore.delete(userId, stationKey);
    logger.info("subscription updated", {
      userId,
      brand: subscription.brand,
      stationId: subscription.stationId,
      fuelCodes: subscription.fuelCodes
    });

    await ctx.editMessageText(
      `Подписка сохранена\n${renderSubscription(subscription.stationLabel, subscription.fuelCodes, station)}`
    );
    await ctx.answerCallbackQuery({ text: "Сохранено" });
  });

  bot.callbackQuery(/^draft\|cancel\|([^|]+)\|([^|]+)$/, async (ctx) => {
    const brand = ctx.match[1];
    const stationId = ctx.match[2];
    if (!brand || !stationId || !isBrand(brand)) {
      await ctx.answerCallbackQuery({ text: "Некорректные данные", show_alert: true });
      return;
    }

    const station = catalog.getStation(brand, stationId);
    const stationKey = formatStationKey(brand, stationId);
    draftStore.delete(String(ctx.from.id), stationKey);

    if (!station) {
      await ctx.editMessageText("Черновик закрыт.");
    } else {
      await ctx.editMessageText(renderStation(station), {
        reply_markup: createStationKeyboard(station)
      });
    }

    await ctx.answerCallbackQuery({ text: "Отменено" });
  });

  bot.callbackQuery(/^sub\|remove\|([^|]+)\|([^|]+)$/, async (ctx) => {
    const brand = ctx.match[1];
    const stationId = ctx.match[2];
    if (!brand || !stationId || !isBrand(brand)) {
      await ctx.answerCallbackQuery({ text: "Некорректные данные", show_alert: true });
      return;
    }

    const removed = await subscriptionService.removeSubscription(String(ctx.from.id), brand, stationId);
    await ctx.editMessageText(removed ? "Подписка удалена." : "Подписка уже отсутствует.");
    await ctx.answerCallbackQuery({ text: removed ? "Удалено" : "Уже удалено" });
  });

  bot.catch((error) => {
    logger.error("telegram bot error", {
      error: error.error instanceof Error ? error.error.message : String(error.error)
    });
  });

  return bot;
}
