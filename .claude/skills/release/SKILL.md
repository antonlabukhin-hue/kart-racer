---
name: release
description: Проверить и выкатить готовую ветку claude/* в main (тесты, ожидание текущего деплоя, мерж --no-ff, пуш, контроль GitHub Actions). Использовать, когда пользователь просит «залить», «смержить», «выкатить», «в main», «задеплоить».
---

# Релиз ветки в main

Репозиторий: `antonlabukhin-hue/kart-racer`. Деплой на GitHub Pages идёт только после зелёного `test:full` на push в main (~45 мин). Новый пуш **отменяет** идущий деплой, а пользователь проверяет каждый деплой на iPhone — поэтому мержим строго по одному.

## 1. Перед мержем
1. `git status` — всё закоммичено, один коммит на пункт (`feat(...)`/`fix(...)` по-русски).
2. `npm run test:unit`.
3. `npm run test:e2e:edge`. Таймаут `goto` в «выход в меню во время отсчёта» — известный флейк, перезапустить этот тест.
4. Для рискованных изменений (тайминги, физика, производительность) — медленный прогон как в CI: `CI=1 npm run test:e2e:slow`. Он идёт ~60 мин, а фоновая задача живёт ~30 мин, поэтому:
   - отдельное дерево: `git worktree add --detach ../kart-x <sha>` и `cmd /c mklink /J ..\kart-x\node_modules node_modules`;
   - запускать в 4 частях по списку spec-файлов (`tests/e2e/scenarios/*.spec.js`);
   - перед запуском убить зависшие vite preview на портах 4199/4299.

## 2. Дождаться текущего деплоя
Не пушить в main, пока последний прогон на main не `completed`:

```bash
curl -s "https://api.github.com/repos/antonlabukhin-hue/kart-racer/actions/runs?branch=main&per_page=1" | node -e "const r=JSON.parse(require('fs').readFileSync(0)).workflow_runs[0];console.log(r.head_sha.slice(0,7),r.status,r.conclusion,r.html_url)"
```

Если `in_progress`/`queued` — ждать (Monitor с циклом опроса раз в несколько минут), сообщить пользователю.

## 3. Мерж
```bash
git checkout main && git pull --ff-only
git merge --no-ff claude/<тема> -m "merge: <кратко по-русски>"
git push origin main
```
Вернуться в рабочую ветку.

## 4. После пуша
Тем же curl проверить, что прогон для нового sha начался; в конце — `conclusion: success`. При падении: запросить jobs (`/actions/runs/<id>/jobs`), найти упавший шаг; логи требуют логина — воспроизводить локально.

## 5. Отчёт
Список коммитов, результаты тестов, ссылка на прогон Actions; затем предложения следующих улучшений (цель — релиз в Steam/мобильных).
