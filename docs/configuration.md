# Конфигурация и окружение

## Runtime-параметры

Источники:

- [src/config.ts](/Users/b.kostyuchenko/Documents/Developer/FuelFinderBot/src/config.ts:1)
- [.env.example](/Users/b.kostyuchenko/Documents/Developer/FuelFinderBot/.env.example:1)

## Переменные окружения

### `BOT_TOKEN`

- Обязательна.
- Если переменная отсутствует или пуста, `loadConfig()` выбрасывает `Error("BOT_TOKEN is required")`.

### `DATA_DIR`

- Необязательна.
- По умолчанию: `data`.
- Преобразуется через `resolve(process.cwd(), ...)`.
- Каталог создаётся автоматически.

### `POLL_INTERVAL_MS`

- Необязательна.
- По умолчанию: `180000`.
- Принимаются только положительные целые числа.
- Невалидное значение заменяется значением по умолчанию.

### `LOG_LEVEL`

- Необязательна.
- По умолчанию: `info`.
- Поддерживаются только `debug`, `info`, `warn`, `error`.

### `ENABLED_PROVIDERS`

- Необязательна.
- По умолчанию: `gazpromneft`.
- Значение разбивается по запятой.
- В итоговую конфигурацию попадают только бренды, для которых есть factory в `src/providers/index.ts`.
- На текущий момент factory есть для `gazpromneft` и `lukoil`.
- Если после фильтрации список пуст, приложение завершается с ошибкой.

### `SEARCH_LIMIT`

- Необязательна.
- По умолчанию: `8`.
- Принимаются только положительные целые числа.

## Пример `.env`

```dotenv
BOT_TOKEN=replace-me
POLL_INTERVAL_MS=180000
DATA_DIR=./data
LOG_LEVEL=info
ENABLED_PROVIDERS=gazpromneft,lukoil
SEARCH_LIMIT=8
```

## Docker-конфигурация

Источники:

- [Dockerfile](/Users/b.kostyuchenko/Documents/Developer/FuelFinderBot/Dockerfile:1)
- [docker-compose.yml](/Users/b.kostyuchenko/Documents/Developer/FuelFinderBot/docker-compose.yml:1)

Подтверждено:

- базовый образ: `node:20-alpine`;
- build-stage запускает `npm install` и `npm run build`;
- runtime-stage запускает `npm install --omit=dev`;
- команда контейнера: `node dist/index.js`;
- `docker-compose.yml` указывает `env_file: .env`;
- данные состояния выносятся в volume `./data:/app/data`.

## Конфигурационные риски

Подтверждено по коду:

- валидация `BOT_TOKEN` есть, но валидации остальных параметров на бизнес-уровне нет;
- приложение не проверяет доступность внешнего API на старте заранее;
- список брендов в `Brand` шире списка реально реализованных провайдеров.
