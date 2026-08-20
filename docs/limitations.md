# Ограничения, допущения и неизвестное

## Подтверждённые ограничения

### Поддержка брендов

Источники:

- [src/domain/types.ts](/Users/b.kostyuchenko/Documents/Developer/FuelFinderBot/src/domain/types.ts:1)
- [src/providers/index.ts](/Users/b.kostyuchenko/Documents/Developer/FuelFinderBot/src/providers/index.ts:1)

Подтверждено:

- тип `Brand` содержит `gazpromneft`, `lukoil`, `rosneft`;
- factory реализован для `gazpromneft` и `lukoil`;
- `ENABLED_PROVIDERS=rosneft` приведёт к ошибке конфигурации, потому что после фильтрации список реализованных провайдеров окажется пустым;
- `ENABLED_PROVIDERS=lukoil` и `ENABLED_PROVIDERS=gazpromneft,lukoil` поддерживаются кодом.

### Географическая фильтрация

Источники:

- [src/providers/gazpromneft.ts](/Users/b.kostyuchenko/Documents/Developer/FuelFinderBot/src/providers/gazpromneft.ts:1)
- [src/providers/lukoil.ts](/Users/b.kostyuchenko/Documents/Developer/FuelFinderBot/src/providers/lukoil.ts:1)

Подтверждено:

- станция проходит фильтр, если `city` содержит `моск`;
- иначе используется проверка на попадание координат в `MOSCOW_REGION_BOUNDS`;
- эта логика не опирается на официальный справочник регионов;
- одна и та же эвристика используется и для Газпромнефти, и для Лукойла.

### Семантика уведомлений

Источник: [src/services/availability-notifier.ts](/Users/b.kostyuchenko/Documents/Developer/FuelFinderBot/src/services/availability-notifier.ts:1)

Подтверждено:

- уведомление не отправляется при первом увиденном состоянии станции;
- уведомление не отправляется при переходе `undefined -> true`;
- уведомление не отправляется при сохранении состояния `true -> true`.

### Хранение данных

Источники:

- [src/services/state-store.ts](/Users/b.kostyuchenko/Documents/Developer/FuelFinderBot/src/services/state-store.ts:1)
- [src/services/subscription-drafts.ts](/Users/b.kostyuchenko/Documents/Developer/FuelFinderBot/src/services/subscription-drafts.ts:1)

Подтверждено:

- durable-state хранится в одном JSON-файле;
- черновики подписки хранятся только в памяти;
- код не содержит file locking или coordination между несколькими процессами.

## Неизвестное

Следующие утверждения не подтверждены кодом проекта и поэтому не должны восприниматься как факт:

- реальный лимит Telegram по объёму сообщений или частоте отправки в данном сценарии;
- стабильность и совместимость внешнего API `gpnbonus.ru`;
- стабильность и совместимость публичных cartography-эндпоинтов Лукойла;
- точность соответствия fuel-кодов пользовательским названиям для всех возможных значений API;
- то, насколько корректно публичные данные Лукойла отражают именно текущее наличие топлива, а не просто доступность вида топлива на станции в каталоге;
- производительность при большом числе подписок, станций и брендов;
- поведение при частично повреждённом `state.json`, кроме того что `JSON.parse` при невалидном содержимом вызовет ошибку.

## Осторожные интерпретации

- Архитектура подготовлена к мультибрендовости на уровне доменных типов и ключей.
- Архитектура уже подтверждена как мультибрендовая как минимум для `gazpromneft` и `lukoil` на уровне интеграций, конфигурации и хранения состояния.
- Архитектура ещё не подтверждена как полноценно мультибрендовая для произвольного числа брендов и разнородных внешних источников.
- JSON-хранилище подходит для текущей локальной или малой инсталляции.
- При росте нагрузки может потребоваться иная стратегия хранения, но это уже гипотеза, а не установленный факт.
