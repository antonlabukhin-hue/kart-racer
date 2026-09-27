# Аналитика

`src/analytics.js` — журнал событий на устройстве игрока (`localStorage`, ключ `road_racing_analytics_v1`,
последние 600 событий). В сеть ничего не уходит, пока не подключён отправщик `setSender(fn)`.

## Как посмотреть
В консоли браузера (или DevTools в Electron):

```js
__analytics.summary()   // сводка
__analytics.events()    // сырые события
__analytics.clear()     // очистить журнал
```

## События

| Событие | Когда | Поля |
|---|---|---|
| `race_start` | старт заезда | `mode` (race / campaign / endless / contract), `map`, `diff`, `car`, `chapter`, `wave` |
| `race_end` | финиш, авария, время вышло | `state` (win / crash / timeout), `time`, `strikes`, `progress` (0..1), `mode`, `map`, `diff`, `chapter`, `nearMiss`, `wave` |
| `crash` | каждая авария | `cause` (кто/что), `at` (% трассы), `map`, `chapter` |
| `race_quit` | выход из заезда в меню | `chapter`, `mode` |
| `buy` | покупка за фишки | `item` (car / paint / part / upgrade), `id`, `price`, `level`, `car` |

У каждого события есть `t` (время) и `s` (сессия).

## Что смотреть перед релизом
- **Доля побед по главам** (`summary().chapters`): глава с долей побед ниже ~35% — стена, ниже 10% — игроки бросают.
- **Где проигрывают** (`loseAt`): пик в одной корзине — перегруженный участок (босс, разлом, сцена карты).
- **Причины аварий** (`crashCauses`): какой зверь или ловушка «нечестные».
- **Выходы из заезда** (`quits`) против финишей: много выходов — раздражает, а не бросает вызов.
- **Покупки**: что покупают первым, копятся ли фишки без трат (экономика слишком щедрая).

## Отправка на сервер (когда понадобится)
```js
import { setSender } from './analytics.js';
setSender(ev => navigator.sendBeacon('https://example.com/ev', JSON.stringify(ev)));
```
Перед включением — согласие игрока и строка в политике конфиденциальности магазина.
