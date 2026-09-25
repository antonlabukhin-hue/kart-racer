# Архитектура модулей

## Фаза 1 — нарезка файлов
Модули в `src/` как отдельные файлы.

## Фаза 2 — подключено
Классы из монолита удалены. `window.createAnimalMesh` и `window.showAnimalShout` задаются в `main.js` после объявления функций: модули не видят функций из `main.js` напрямую.

## Фаза 3 — index.html разделён (текущее)
- стили: `css/style.css`;
- весь код игры: `src/main.js` (перенесён из `<script type="module">` как был);
- каталоги `CAMPAIGN_TRACKS`, `CAMPAIGN_STAGE_MODS`, `CAR_PRESETS`, `ANIMAL_TYPES`, `MAP_ANIMALS` — только в `data.js`, `main.js` их импортирует.

`index.html` подключает `./src/main.js`, тот импортирует остальное:

```js
import { SoundEngine } from './audio.js';
import { AnimalSpawner } from './animals.js';
import { ParticleSystem } from './particles.js';
import { CAMPAIGN_TRACKS, CAMPAIGN_STAGE_MODS, CAR_PRESETS, ANIMAL_TYPES, MAP_ANIMALS } from './data.js';
```

Функции, которые вызываются из разметки (`onclick="nextLorePanel()"` и т.п.), должны оставаться на `window`.

Vite собирает `index.html`, `css/`, `src/*` и three из `node_modules` в `dist/assets/` (importmap больше нет, версия three — в `package.json`).

## Фаза 4 — дальше
- `storage.js` вместо профилей в `main.js`
- `boss.js` — createArcadeBossMesh
- по желанию: полный вынос `initGame` в `game.js`


## Фаза 3a — безопасность (сделано)
- `escapeHtml` + экранирование имени в `renderProfileList`
- мобильные кнопки: делегирование событий без `setInterval`, обработчики заезда снимаются через `AbortController` в `__stopRace`


## P0 (сделано)

- Онбординг первого заезда (`road_racing_onboarded_v1`, `#onboarding-tip`)
- Telegraph босса: ring + scale pulse + `_windupNeed` ≥ 0.65 с
- `window.teardownRaceUI` — единая очистка HUD/финиш/пауза
- `docs/QA.md` — smoke-чеклист
