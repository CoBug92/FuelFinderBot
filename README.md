# FuelFinderBot

`FuelFinderBot` — Telegram-бот на Node.js/TypeScript для отслеживания появления топлива на АЗС по Москве и Московской области.

Текущая реализация поддерживает провайдеры `gazpromneft` и `lukoil`. Бренд `rosneft` остаётся только в доменных типах и UI-валидации, но собственного провайдера ещё не имеет.

## Назначение

Бот позволяет:

- найти АЗС командой `/find <запрос>`;
- создать подписку на конкретную АЗС;
- выбрать один или несколько видов топлива для отслеживания;
- получить уведомление, когда топливо перешло из состояния `недоступно` в `доступно`;
- просмотреть подписки командой `/subscriptions`;
- удалить все подписки командой `/stop`.

## Что входит в проект

- Telegram-бот на библиотеке `grammy`;
- опрос внешнего API провайдера по таймеру;
- in-memory каталог станций для поиска;
- JSON-хранилище подписок и последних снимков доступности топлива;
- набор unit-тестов для ключевых сервисов и нормализации данных провайдера.

## Быстрый старт

Требования:

- Node.js `>=20`;
- действующий `BOT_TOKEN` для Telegram-бота.

Локальный запуск:

```bash
npm install
cp .env.example .env
# заполнить BOT_TOKEN
npm run dev
```

Сборка и запуск production-версии:

```bash
npm run build
npm start
```

Запуск тестов:

```bash
npm test
```

## Docker

В проекте есть `Dockerfile` и `docker-compose.yml`.

Запуск:

```bash
docker compose up --build -d
```

Подтверждённые особенности:

- `docker-compose.yml` подключает `./data:/app/data`;
- контейнер читает переменные из файла `.env`;
- `Dockerfile` копирует `.env.example` и `README.md` в runtime-образ.

## Конфигурация

Поддерживаемые переменные окружения подтверждены кодом в `src/config.ts`:

| Переменная | Обязательность | По умолчанию | Назначение |
| --- | --- | --- | --- |
| `BOT_TOKEN` | обязательна | нет | токен Telegram-бота |
| `POLL_INTERVAL_MS` | нет | `180000` | интервал опроса провайдеров в миллисекундах |
| `DATA_DIR` | нет | `./data` | каталог для `state.json` |
| `LOG_LEVEL` | нет | `info` | уровень логирования: `debug`, `info`, `warn`, `error` |
| `ENABLED_PROVIDERS` | нет | `gazpromneft` | список брендов через запятую; используются только реализованные провайдеры, сейчас это `gazpromneft` и `lukoil` |
| `SEARCH_LIMIT` | нет | `8` | максимальное число результатов `/find` |

Пример файла есть в [.env.example](/Users/b.kostyuchenko/Documents/Developer/FuelFinderBot/.env.example:1).

## Структура документации

- [docs/architecture.md](/Users/b.kostyuchenko/Documents/Developer/FuelFinderBot/docs/architecture.md)
- [docs/components.md](/Users/b.kostyuchenko/Documents/Developer/FuelFinderBot/docs/components.md)
- [docs/configuration.md](/Users/b.kostyuchenko/Documents/Developer/FuelFinderBot/docs/configuration.md)
- [docs/operations.md](/Users/b.kostyuchenko/Documents/Developer/FuelFinderBot/docs/operations.md)
- [docs/limitations.md](/Users/b.kostyuchenko/Documents/Developer/FuelFinderBot/docs/limitations.md)

## Ключевые факты о реализации

- Точка входа: [src/index.ts](/Users/b.kostyuchenko/Documents/Developer/FuelFinderBot/src/index.ts:1).
- Состояние хранится в JSON-файле `state.json` внутри `DATA_DIR`.
- Перед запуском polling выполняется один немедленный опрос провайдеров.
- Каталог станций полностью заменяется на каждом цикле `pollOnce()`.
- Уведомления отправляются только если для подписанного топлива зафиксирован переход `false -> true`.
- Если предыдущего снимка доступности для станции ещё нет, уведомление не отправляется.
- Черновики выбора топлива (`SubscriptionDraftStore`) хранятся только в памяти процесса.

## Подтверждённые ограничения

- Реализованы `GazpromneftProvider` и `LukoilProvider`; `rosneft` в коде провайдеров пока отсутствует.
- Фильтрация по Москве и области у `GazpromneftProvider` и `LukoilProvider` основана на названии города и координатном прямоугольнике.
- Если опрос провайдера завершился ошибкой, бот продолжает работу, а ошибка пишется в лог.
- В проекте нет встроенных механизмов миграции состояния, retention-политики и health-check endpoint.

## Что не подтверждено и не документируется как факт

- SLA внешнего API `https://gpnbonus.ru/api/stations/list`;
- SLA или стабильность публичных cartography-эндпоинтов Лукойла;
- точный формат ответа API за пределами полей, реально используемых в коде;
- поведение бота после рестарта в части незавершённых черновиков подписки, кроме факта их потери из-за in-memory хранения;
- поддержка `rosneft` без добавления нового провайдера в `src/providers`;
- то, что публичные cartography-эндпоинты Лукойла являются официальным и долгосрочно стабильным контрактом для availability-сценария.

## Источники для этой документации

Документация основана на чтении:

- файлов `src/**/*.ts`;
- файлов `tests/**/*.ts` как дополнительного подтверждения контракта;
- `package.json`, `tsconfig.json`, `vitest.config.ts`;
- `Dockerfile`, `docker-compose.yml`, `.env.example`.
