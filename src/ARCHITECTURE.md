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

Классы из монолита удалены. `window.createAnimalMesh` и `window.showAnimalShout` задаются в HTML после объявления функций: модули не видят функций из `index.html` напрямую.

Vite собирает `index.html`, `src/*` и three из `node_modules` в один файл в `dist/assets/`.

## Фаза 3 — дальше
- `data.js` вместо дублей констант в HTML
- `boss.js` — createArcadeBossMesh
- единый teardown, XSS-escape имён
- по желанию: полный вынос `initGame` в `game.js`


## Фаза 3a — безопасность (сделано)
- `escapeHtml` + экранирование имени в `renderProfileList`
- `setInterval` мобильных кнопок: один id, работа только при `__inRace`
