# Архитектура модулей

## Фаза 1 — нарезка файлов
Модули в `src/` как отдельные файлы.

## Фаза 2 — подключено (текущее)
Корневой `index.html` импортирует:

```js
import { SoundEngine } from './src/audio.js';
import { AnimalSpawner } from './src/animals.js';
import { ParticleSystem } from './src/particles.js';
```

Классы из монолита удалены. `window.createAnimalMesh` задаётся после объявления фабрики мешей в HTML.

Игра по-прежнему один HTML + ES modules (importmap three + relative `./src/*`).

## Фаза 3 — дальше
- `data.js` / `storage.js` вместо дублей констант и профилей в HTML
- `boss.js` — createArcadeBossMesh
- единый teardown, XSS-escape имён
- по желанию: полный вынос `initGame` в `game.js`


## Фаза 3a — безопасность (сделано)
- `escapeHtml` + экранирование имени в `renderProfileList`
- `setInterval` мобильных кнопок: один id, работа только при `__inRace`


## P0 (сделано)

- Онбординг первого заезда (`road_racing_onboarded_v1`, `#onboarding-tip`)
- Telegraph босса: ring + scale pulse + `_windupNeed` ≥ 0.65 с
- `window.teardownRaceUI` — единая очистка HUD/финиш/пауза
- `docs/QA.md` — smoke-чеклист
