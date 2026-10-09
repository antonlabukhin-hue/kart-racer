# Дорожный прорыв (simple-kart-racer)

Браузерная гонка на Three.js + Vite. Сайт — GitHub Pages (`antonlabukhin-hue/kart-racer`), плюс сборки для Яндекс Игр, Electron (`desktop/`) и мобильных (`mobile/`).
Общение и коммиты — на русском.

## Карта кода
- `src/main.js` (~11.6k строк) — склейка: меню, гараж, `initGame` с игровым циклом. **Не читать целиком** — искать Grep по имени функции и читать окрестность.
  Ориентиры: `createProfile`, `renderGaragePartsPanel`, `startGaragePreview`, `refreshMapSelectUI`, `showAnimalShout`, `createCar`, `handleObstacleHit`, `showBossCard`, `isCampaignRun`, `closeGarage`.
- Остальное в `src/*.js` — модули с чистой логикой и юнит-тестами; таблица модулей — `src/ARCHITECTURE.md`.
- Данные: `src/data.js` (трассы, машины, звери), `src/content.js` (мета-контент), `src/locales/`.
- Стили — `css/style.css`. Доки — `docs/` (QA, RELEASE, YANDEX, METRICS…).

## Правила для кода
- Новую логику — в отдельный модуль (состояние параметрами, без `window.*`) + тест в `tests/unit/`. `tests/unit/architecture.test.js` ограничивает число строк `main.js` (`MAX_MAIN_LINES`).
- В `main.js` длинные строки с несколькими операторами: не дописывать `// комментарий` в середину строки — проглотит остаток. Только `/* */` или в самый конец.
- В `initGame` есть локальные `const track` и др. — импорт с таким же именем ловит TDZ (поэтому аналитика импортируется как `trackEvent`).
- Аналитика `track(name, props)`: имя события лежит в поле `e`, не называть проп `e`.
- Функции из `onclick=` в разметке должны оставаться на `window`.
- `python` здесь — заглушка Store; скриптовые правки делать через `node`. Диск C почти полный — чистить `%TEMP%\playwright_*profile-*` при ENOSPC.

## Сборки и тесты
- `npm run test:unit` — vitest, быстро.
- `npm run test:e2e:edge` — e2e в установленном Edge (Chromium для Playwright не скачивается). ~5 мин.
- `CI=1 npm run test:e2e:slow` — Edge без GPU, как CI; ~60 мин, запускать частями (см. скилл `release`).
- `npm run build:test` → `dist-test/` с `window.__raceDebug` и `window.__artKit`; превью — launch-конфиг `test-build` (порт 4174).
- `npm run art` (`ART_ONLY=...`) — рендеры картинок в `public/images`.
- e2e использует фиксированные порты 4199/4299 — не запускать два e2e-прогона параллельно.

## Процесс
- Работа в ветке `claude/<тема>`, один коммит на пункт (`feat(...)`/`fix(...)`, по-русски).
- Мерж в main и деплой — скилл `release`. Проверка визуала — скилл `visual-check`.
- `gh` CLI нет — статус Actions смотреть через публичный REST API curl'ом.
