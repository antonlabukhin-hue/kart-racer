# Метрики: возвращаемость и длина сессий (Supabase)

Игра (`src/metrics.js`) раз в минуту и при сворачивании отправляет одну строку на сессию:
случайный id устройства (без имени), день установки, день сессии, активное время (пока игра на экране),
число заездов, забегов бесконечной трассы и лучшую дальность за сессию, платформу (`web` / `yandex`) и версию сборки.
Тестовая сборка и автотесты ничего не отправляют.

## 1. Один раз: Supabase → SQL Editor → New query → Run

```sql
create table if not exists public.sessions (
  sid        text primary key,
  pid        text not null,
  day0       date not null,
  day        date not null,
  dur_s      int  not null default 0,
  races      int  not null default 0,
  runs       int  not null default 0,
  best_m     int  not null default 0,
  platform   text not null default 'web',
  ver        text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists sessions_pid on public.sessions (pid);
create index if not exists sessions_day on public.sessions (day);
alter table public.sessions enable row level security;   -- прямого доступа нет: только функция ниже

create or replace function public.session_put(
  p_sid text, p_pid text, p_day0 date, p_day date, p_dur int, p_races int, p_runs int, p_best int,
  p_platform text, p_ver text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_sid !~ '^[0-9a-f]{16}$' or p_pid !~ '^[0-9a-f]{16}$' then raise exception 'bad id'; end if;
  if p_day0 > current_date + 1 or p_day > current_date + 1 or p_day < current_date - 2 or p_day0 < date '2026-01-01' then raise exception 'bad day'; end if;
  insert into sessions (sid, pid, day0, day, dur_s, races, runs, best_m, platform, ver)
  values (p_sid, p_pid, p_day0, p_day, least(greatest(p_dur, 0), 43200), least(greatest(p_races, 0), 1000),
          least(greatest(p_runs, 0), 1000), least(greatest(p_best, 0), 1000000), left(coalesce(p_platform, 'web'), 12), left(coalesce(p_ver, ''), 24))
  on conflict (sid) do update set   -- строка той же сессии только растёт и принадлежит тому же устройству
    dur_s = greatest(sessions.dur_s, excluded.dur_s), races = greatest(sessions.races, excluded.races),
    runs = greatest(sessions.runs, excluded.runs), best_m = greatest(sessions.best_m, excluded.best_m), updated_at = now()
  where sessions.pid = excluded.pid;
end $$;
revoke all on function public.session_put from public;
grant execute on function public.session_put to anon;
```

## 2. Смотреть картину (SQL Editor, сохранить как запросы)

**Возвращаемость D1 / D7 / D30 по дням установки** (доля игроков, вернувшихся через N дней):

```sql
with p as (select pid, min(day0) day0 from sessions group by pid),
     a as (select distinct pid, day from sessions)
select p.day0 as "день установки", count(*) as "новых",
  round(100.0 * count(*) filter (where exists (select 1 from a where a.pid = p.pid and a.day = p.day0 + 1)) / count(*), 1) as "D1 %",
  round(100.0 * count(*) filter (where exists (select 1 from a where a.pid = p.pid and a.day = p.day0 + 7)) / count(*), 1) as "D7 %",
  round(100.0 * count(*) filter (where exists (select 1 from a where a.pid = p.pid and a.day = p.day0 + 30)) / count(*), 1) as "D30 %"
from p group by p.day0 order by p.day0 desc;
```

**Длина сессий и активность по дням:**

```sql
select day as "день", count(distinct pid) as "игроков (DAU)", count(*) as "сессий",
  round(avg(dur_s) / 60.0, 1) as "средняя сессия, мин",
  round((percentile_cont(0.5) within group (order by dur_s) / 60.0)::numeric, 1) as "медиана, мин",
  round(sum(dur_s) / 60.0 / nullif(count(distinct pid), 0), 1) as "минут на игрока",
  sum(races) as "заездов", round(avg(nullif(best_m, 0))) as "средняя лучшая дальность, м"
from sessions group by day order by day desc;
```

**По версиям сборки** (стало ли лучше после обновления):

```sql
select ver, platform, count(*) sessions, round(avg(dur_s) / 60.0, 1) avg_min, round(avg(races), 1) avg_races
from sessions group by ver, platform order by max(created_at) desc;
```

Что считать хорошим для казуальной браузерной игры: D1 ≥ 30 %, D7 ≥ 10–12 %, средняя сессия ≥ 6–8 минут.
