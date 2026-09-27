# Релиз: Steam и мобильные магазины

Сайт (GitHub Pages) собирается как раньше: `npm run build` → `dist/`.
Настольная и мобильная сборки — обёртки вокруг того же `dist/`. У каждой свои зависимости в своей папке,
поэтому `npm ci` в корне и CI их не касаются.

## Настольная сборка (Steam, Windows/macOS/Linux) — `desktop/`

Electron-оболочка `desktop/main.cjs` отдаёт `dist/` по протоколу `app://game/`, поэтому ES-модули и `fetch`
музыки работают как на сайте. F11 включает полный экран, окно без меню, игра не «засыпает» без фокуса.

```bash
cd desktop
npm install
npm start            # собрать dist/ и открыть окно игры
npm run dist         # папка приложения в desktop/release/ (для загрузки в Steam — depot)
```

Проверка сборки без окна (грузит игру, пишет итог в консоль и выходит):

```bash
cd desktop
RB_SMOKE=1 npx electron .
```

Проверено: `RB_SMOKE {"title":"🏎️ Дорожный прорыв","cards":6,"errors":[]}` на Electron 39.

### Что нужно для Steam
- [ ] Steamworks: аккаунт партнёра, App ID, depot; загрузка папки `desktop/release/*-unpacked` через SteamPipe.
- [ ] `steamworks.js` (npm) в `main.cjs`: достижения Steam ← `ACHIEVEMENTS` из `src/content.js`, облачные сохранения
      профиля (сейчас `localStorage` — `road_racing_profiles_*`, `road_racing_campaign_*`, `road_racing_ghost_v1_*`).
- [ ] Полная поддержка геймпада (Steam Deck): гонка, пауза и меню уже работают (`src/gamepad.js`);
      осталось проверить на устройстве и добавить подписи кнопок геймпада в брифинге.
- [ ] Иконка приложения (`build.win.icon` / `build.mac.icon` в `desktop/package.json`), капсулы магазина, трейлер.
- [ ] Подпись кода для Windows/macOS.

## Мобильная сборка (Android / iOS) — `mobile/`

Capacitor берёт `dist/` (`webDir: ../dist`).

```bash
cd mobile
npm install
npx cap add android          # один раз; для iOS — npx cap add ios (нужен macOS + Xcode)
npm run android              # собрать dist/, синхронизировать и открыть Android Studio
```

### Что нужно для магазинов
- [ ] Альбомная ориентация: в `android/app/src/main/AndroidManifest.xml` у активити `android:screenOrientation="sensorLandscape"`,
      в iOS — только Landscape в Info.plist (игра и сама просит повернуть телефон).
- [ ] Иконки и заставка (`@capacitor/assets`), ID приложения `ru.roadbreakthrough.game` — заменить на свой домен.
- [ ] Google Play: подписанный AAB, политика конфиденциальности (аналитика локальная — см. ниже).
- [ ] App Store: аккаунт разработчика, TestFlight.

## Локализация
- Язык: «Авто» (по языку браузера/системы), «Русский», «English» — в Настройках; `?lang=en` для проверки.
- Словарь: `src/locales/en.js` (точные строки + шаблоны с числами), движок: `src/i18n.js`.
- Переведено: меню, экраны выбора, HUD, пауза, брифинг, настройки, финиш, задания глав, карточки босса, подсказки тренера.
- **Не переведено:** лор кампании, реплики злодея и зверей, названия глав, радио. Быстро найти остатки на экране:
  открыть игру с `?lang=en` и выполнить в консоли
  `[...document.querySelectorAll('body *')].filter(e => e.children.length === 0 && /[А-Яа-яЁё]/.test(e.textContent) && e.offsetParent).map(e => e.textContent.trim())`.

## Аналитика
Локальный журнал событий — `src/analytics.js` (см. docs/ANALYTICS.md): ничего не уходит в сеть, пока не подключён
отправщик. Для магазинов это упрощает политику конфиденциальности.

## Лицензии ассетов
Перед релизом — `docs/ASSETS.md`: у каждого файла из `public/` должен быть подтверждённый источник и лицензия.
