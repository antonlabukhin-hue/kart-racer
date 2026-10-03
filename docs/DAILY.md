# Дневные таблицы: «Заезд дня» и «Звериный час дня» (Supabase)

Игра (`src/daily-board.js`) отправляет один результат за попытку: режим (`inf` — бесконечная трасса, метры; `beast` — «Звериный час», очки),
день, имя игрока, счёт и машину. Пока таблицы нет — игра показывает таблицу дня только с этого устройства, ничего не ломается.
Тестовая сборка и автотесты ничего не отправляют.

## Один раз: Supabase → SQL Editor → New query → Run

```sql
create table if not exists public.daily_runs (
  id         bigint generated always as identity primary key,
  mode       text not null check (mode in ('inf', 'beast')),
  day        date not null,
  name       text not null check (char_length(name) between 1 and 24),
  score      int  not null check (score between 1 and 10000000),
  car        text check (car is null or char_length(car) <= 24),
  created_at timestamptz not null default now()
);
create index if not exists daily_runs_day on public.daily_runs (mode, day, score desc);
alter table public.daily_runs enable row level security;
-- читать может любой (таблица дня), добавлять — только за сегодня/вчера (часовые пояса), менять и удалять — никто
create policy daily_read on public.daily_runs for select to anon using (true);
create policy daily_add on public.daily_runs for insert to anon
  with check (day between current_date - 1 and current_date + 1);
```

## Посмотреть

```sql
select mode, day, count(*) as "результатов", count(distinct name) as "игроков", max(score) as "лучший"
from daily_runs group by mode, day order by day desc, mode;
```
