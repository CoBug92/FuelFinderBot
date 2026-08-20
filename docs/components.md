# Компоненты и потоки данных

## Основные компоненты

### `loadConfig`

Источник: [src/config.ts](/Users/b.kostyuchenko/Documents/Developer/FuelFinderBot/src/config.ts:1)

Подтверждено:

- читает `.env` через `dotenv`;
- требует `BOT_TOKEN`;
- создаёт `DATA_DIR`, если каталог отсутствует;
- вычисляет путь `stateFilePath = resolve(dataDir, "state.json")`;
- отбрасывает неподдерживаемые бренды из `ENABLED_PROVIDERS`;
- выбрасывает ошибку, если после фильтрации не осталось ни одного реализованного провайдера.

### `StateStore`

Источник: [src/services/state-store.ts](/Users/b.kostyuchenko/Documents/Developer/FuelFinderBot/src/services/state-store.ts:1)

Подтверждено:

- хранит `users` и `availability`;
- при первом запуске создаёт файл состояния;
- сериализует состояние в JSON с отступом `2`;
- после каждого изменения подписок или снимков вызывает `persist()`.

### `SubscriptionService`

Источник: [src/services/subscription-service.ts](/Users/b.kostyuchenko/Documents/Developer/FuelFinderBot/src/services/subscription-service.ts:1)

Подтверждено:

- сохраняет одну подписку на пару `(brand, stationId)`;
- дедуплицирует `fuelCodes` через `Set`;
- формирует `stationLabel` как `Бренд • Название • Город`.

### `SubscriptionDraftStore`

Источник: [src/services/subscription-drafts.ts](/Users/b.kostyuchenko/Documents/Developer/FuelFinderBot/src/services/subscription-drafts.ts:1)

Подтверждено:

- использует `Map<string, DraftState>`;
- ключ строится как `${userId}:${stationKey}`;
- не имеет постоянного хранилища.

### `StationCatalog`

Источник: [src/services/catalog.ts](/Users/b.kostyuchenko/Documents/Developer/FuelFinderBot/src/services/catalog.ts:1)

Подтверждено:

- хранит станции по ключу `brand:stationId`;
- полностью заменяет каталог через `replaceAll(stations)`;
- поиск учитывает `displayName`, `city`, `address`, `stationId`;
- поиск работает через простую scoring-модель, а не через полнотекстовый индекс.

### `ProviderPoller`

Источник: [src/services/poller.ts](/Users/b.kostyuchenko/Documents/Developer/FuelFinderBot/src/services/poller.ts:1)

Подтверждено:

- опрашивает провайдеры последовательно;
- логирует успех и ошибку по каждому провайдеру;
- по завершении обновляет `StationCatalog`.

### `AvailabilityNotifier`

Источник: [src/services/availability-notifier.ts](/Users/b.kostyuchenko/Documents/Developer/FuelFinderBot/src/services/availability-notifier.ts:1)

Подтверждено:

- смотрит только на станции, которые пришли в текущем `pollOnce()`;
- уведомляет только при переходе `false -> true`;
- после обработки всех пользователей сохраняет новые снимки доступности через `bulkSetAvailability(...)`.

## Поток данных: от внешнего API до уведомления

```mermaid
sequenceDiagram
    participant Timer as setInterval / first run
    participant Poller as ProviderPoller
    participant Provider as StationProvider
    participant Catalog as StationCatalog
    participant Notifier as AvailabilityNotifier
    participant Store as StateStore
    participant TG as Telegram Bot API

    Timer->>Poller: pollOnce()
    Poller->>Provider: fetchStations()
    Provider-->>Poller: Station[]
    Poller->>Catalog: replaceAll(stations)
    Poller-->>Notifier: processStations(stations)
    Notifier->>Store: getUsers()
    loop for each subscription
        Notifier->>Store: getAvailability(brand, stationId)
        alt previous exists and false -> true
            Notifier->>TG: sendMessage(chatId, message)
        end
    end
    Notifier->>Store: bulkSetAvailability(...)
```

## Поток данных: создание подписки

```mermaid
sequenceDiagram
    participant User as Пользователь
    participant Bot as Telegram handlers
    participant Catalog as StationCatalog
    participant Drafts as SubscriptionDraftStore
    participant Subs as SubscriptionService
    participant Store as StateStore

    User->>Bot: /find <query>
    Bot->>Catalog: search(query, searchLimit)
    Catalog-->>Bot: Station[]
    User->>Bot: callback draft|create|brand|stationId
    Bot->>Catalog: getStation(...)
    Bot->>Drafts: set(userId, stationKey, draft)
    User->>Bot: callback draft|toggle|...
    Bot->>Drafts: get/set(...)
    User->>Bot: callback draft|save|brand|stationId
    Bot->>Catalog: getStation(...)
    Bot->>Subs: saveSubscription(...)
    Subs->>Store: upsertSubscription(...)
```

## Формат callback payload

Подтверждено по [src/bot.ts](/Users/b.kostyuchenko/Documents/Developer/FuelFinderBot/src/bot.ts:1):

- `draft|create|{brand}|{stationId}`
- `draft|edit|{brand}|{stationId}`
- `draft|toggle|{brand}|{stationId}|{fuelCode}`
- `draft|save|{brand}|{stationId}`
- `draft|cancel|{brand}|{stationId}`
- `sub|remove|{brand}|{stationId}`

## Что важно для эксплуатации

Подтверждено:

- удаление станции из текущего каталога делает невозможным редактирование подписки через актуальную карточку станции;
- отсутствие previous snapshot блокирует отправку первого уведомления;
- подписки постоянные, черновики временные.
- корректность availability для `lukoil` зависит от публичных cartography-эндпоинтов Лукойла и их текущей семантики.
