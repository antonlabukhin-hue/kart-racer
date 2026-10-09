---
name: race-autopilot
description: Прогнать настоящий заезд автопилотом на тестовой сборке (window.__raceDebug) и собрать метрики/скриншоты — для проверки геймплея, баланса, боссов, трафика, производительности. Использовать, когда нужно «проехать», «поиграть», «проверить в заезде», замерить время/урон/FPS.
---

# Заезд автопилотом

## Подготовка
1. `npm run build:test` → `dist-test/` (есть `window.__raceDebug`, `window.__artKit`).
2. Превью: launch-конфиг `test-build` (порт 4174) через `preview_start`.
3. **Не через панель браузера:** когда панель скрыта, `requestAnimationFrame` стоит и заезд замирает на отсчёте. Надёжно — скрипт Playwright в Edge.
4. Не запускать параллельно с e2e (порты 4199/4299 не мешают, но CPU/GPU — да, метрики поплывут).

## Скрипт
Положить в `dist-test/` (тогда резолвится `@playwright/test`), запускать `node dist-test/auto.mjs`:

```js
import { chromium } from '@playwright/test';
const b = await chromium.launch({ channel: 'msedge' });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
await p.goto('http://localhost:4174/');
// вход: имя ≥ 3 символов, затем меню → нужный режим/трасса → старт
await p.evaluate(() => {
  const prev = window.__raceDebug;               // хук ставится в initGame: ждать НОВЫЙ объект, не сбрасывать его
  const held = new Set();
  const key = (k, down) => window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { key: k, code: 'Key' + k.toUpperCase() }));
  setInterval(() => {
    const d = window.__raceDebug; if (!d || d === prev) return;
    const ups = d.speed * 60;                    // speed — за кадр; ×60 = ед./с
    const look = 12 + 1.4 * ups;                 // дистанция упреждения
    // выбрать из 5 кандидатов x наименее опасный на дистанции look, рулить A/D
    // ...
    ['w'].forEach(k => key(k, true));            // игра ставит паузу на blur и отпускает клавиши — переотправлять каждый тик
  }, 50);
});
```

Поля `__raceDebug` смотреть в `src/main.js` (Grep `__raceDebug =`) — набор меняется.

## Что собирать
- Итог: место/время/урон/кольца, причины проигрыша; кадры в ключевые моменты (`page.screenshot` в scratchpad, не в репозиторий).
- Для перфа — средний и худший кадр (`performance.now()` между rAF).
- Для мобильного — второй прогон с `viewport 844×390, isMobile, hasTouch` (и портрет 390×844).

## Как читать результат
- Автопилот стабильно выигрывает на лёгкой, на средней часто проигрывает — проигрыш сам по себе не баг.
- Игровое время замедляется на медленных кадрах — не ждать N игровых секунд по настенным часам.
- Если что-то выглядит сломанным — приложить кадр и состояние `__raceDebug` в момент события.
