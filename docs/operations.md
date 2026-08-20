# Запуск и эксплуатация

## Локальная разработка

Подтверждённые команды из [package.json](/Users/b.kostyuchenko/Documents/Developer/FuelFinderBot/package.json:1):

```bash
npm install
cp .env.example .env
npm run dev
```

Скрипты:

- `npm run dev` -> `tsx watch src/index.ts`
- `npm run build` -> `tsc -p tsconfig.json`
- `npm start` -> `node dist/index.js`
- `npm test` -> `vitest run`

## Порядок работы процесса

1. Приложение загружает `.env`.
2. Создаёт или открывает `state.json`.
3. Выполняет первый опрос провайдеров.
4. Обновляет каталог станций.
5. Пытается обработать уведомления.
6. Запускает polling по расписанию.
7. Запускает Telegram long polling через `grammy`.

## Логирование

Источник: [src/logger.ts](/Users/b.kostyuchenko/Documents/Developer/FuelFinderBot/src/logger.ts:1)

Подтверждено:

- лог пишет JSON-строки в stdout/stderr;
- каждая запись содержит `level`, `message`, `timestamp`;
- `context` добавляется опционально;
- фильтрация по уровню идёт через `LEVEL_ORDER`.

Примеры событий, которые точно логируются:

- `provider poll completed`
- `provider poll failed`
- `catalog refreshed`
- `subscription updated`
- `availability alert sent`
- `failed to send availability alert`
- `telegram bot error`

## Хранилище состояния

Источник: [src/services/state-store.ts](/Users/b.kostyuchenko/Documents/Developer/FuelFinderBot/src/services/state-store.ts:1)

Файл:

- `${DATA_DIR}/state.json`

Содержимое:

- `users` — подписки пользователей и `chatId`;
- `availability` — последний снимок доступности топлива по ключу `brand:stationId`.

Пример формы данных:

```json
{
  "users": {
    "12345": {
      "userId": "12345",
      "chatId": 12345,
      "subscriptions": [
        {
          "brand": "gazpromneft",
          "stationId": "501",
          "stationLabel": "Газпромнефть • АЗС № 501 • Москва",
          "fuelCodes": ["gpn:62"]
        }
      ]
    }
  },
  "availability": {
    "gazpromneft:501": {
      "gpn:62": true
    }
  }
}
```

Поля и структура выведены из типа `PersistedState` и логики `StateStore`, а не из снапшота реального production-файла.

## Команды Telegram

Источник: [src/bot.ts](/Users/b.kostyuchenko/Documents/Developer/FuelFinderBot/src/bot.ts:1)

- `/start` — краткое описание сценария.
- `/help` — список основных команд.
- `/find <запрос>` — поиск АЗС по номеру, городу или адресу.
- `/subscriptions` — список текущих подписок пользователя.
- `/stop` — удаление всех подписок пользователя.

## Практические операционные эффекты

Подтверждено:

- при перезапуске процесса подписки и snapshots сохраняются, если сохранён `DATA_DIR`;
- при перезапуске процесса черновики подписок теряются;
- если провайдер временно недоступен, бот не завершается автоматически по этой ошибке;
- при пустом каталоге `/find` возвращает "По этому запросу ничего не найдено.".

## Проверка текущего контракта

В рамках аудита выполнен `npm test`.

Подтверждено тестами:

- нормализация станции `GazpromneftProvider`;
- нормализация станции `LukoilProvider`;
- раздельное хранение подписок по брендам;
- поиск одинаковых локальных `stationId` у разных брендов;
- уведомление только на переходе `false -> true`.
