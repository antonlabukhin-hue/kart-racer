# Архитектура модулей (фаза 1)

## Сделано
| Файл | Содержимое |
|------|------------|
| `audio.js` | `SoundEngine` |
| `animals.js` | `AnimalSpawner` |
| `particles.js` | `ParticleSystem` (+ `aliveCount = 0`) |
| `data.js` | `CAMPAIGN_TRACKS`, `CAR_PRESETS`, `ANIMAL_TYPES`, `MAP_ANIMALS`, `CAMPAIGN_STAGE_MODS`, `CAMPAIGN_BOSSES` |
| `storage.js` | профили / кампания (часть функций) |
| `boss.js` | заглушка (меши ещё в initGame) |
| `index.js` | re-export |

## Ещё в `index.html` (initGame closure)
- `initGame` / `update` / `animate` / `endGame`
- `createArcadeBossMesh`, `spawnBoss`
- `_buildShowroomCar`, трафик, ландшафт
- `showEndScreen`, меню, UI bootstrap
- `recordRaceResult`, `loginAs` (сильная связь с DOM)

## Фаза 2 (следующий шаг)
1. Подключить модули из Vite-entry без удаления монолита (dual-run).
2. `game/RaceSession.js` — тонкая обёртка над initGame.
3. Вынести boss mesh + car builder.
4. Удалить дубли из `index.html`.

## Фаза 3
- `menu.js` — профили, кампания UI
- `ui.js` — end screen, lore, achievements  
- XSS-escape имён, единый teardown гонки

## Запуск сейчас
Игра по-прежнему работает через корневой **index.html** (монолит не сломан).
Модули в `src/` — готовая нарезка для импорта, когда подключим entry.
