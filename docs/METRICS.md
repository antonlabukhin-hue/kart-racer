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

## 3. Воронка глав кампании — где бросают (один раз: SQL Editor → Run)

Игра (`src/metrics.js` → `chapterRow`) отправляет по событию на каждую попытку главы: `start` — начал, `win` — прошёл,
`lose` — 5 аварий, `timeout` — время вышло, `quit` — вышел посреди заезда. Плюс аварии, время и сколько трассы проехал.

```sql
create table if not exists public.chapter_events (
  id         bigint generated always as identity primary key,
  pid        text not null,
  chapter    text not null,
  kind       text not null,
  day        date not null,
  strikes    int  not null default 0,
  time_s     int  not null default 0,
  progress   int  not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists chapter_events_ch on public.chapter_events (chapter, kind);
alter table public.chapter_events enable row level security;   -- прямого доступа нет: только функция ниже

create or replace function public.chapter_put(
  p_pid text, p_chapter text, p_kind text, p_day date, p_strikes int, p_time int, p_progress int) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_pid !~ '^[0-9a-f]{16}$' or p_chapter !~ '^c[0-9]{2}$' or p_kind not in ('start', 'win', 'lose', 'timeout', 'quit') then raise exception 'bad'; end if;
  if p_day > current_date + 1 or p_day < current_date - 2 then raise exception 'bad day'; end if;
  insert into chapter_events (pid, chapter, kind, day, strikes, time_s, progress)
  values (p_pid, p_chapter, p_kind, p_day, least(greatest(p_strikes, 0), 20), least(greatest(p_time, 0), 3600), least(greatest(p_progress, 0), 100));
end $$;
revoke all on function public.chapter_put from public;
grant execute on function public.chapter_put to anon;
```

**Где бросают** (по главам: сколько игроков начали, прошли, доля побед, где чаще всего проигрывают):

```sql
select chapter as "глава",
  count(distinct pid) filter (where kind = 'start') as "начали (игроков)",
  count(distinct pid) filter (where kind = 'win') as "прошли (игроков)",
  round(100.0 * count(*) filter (where kind = 'win') / nullif(count(*) filter (where kind = 'start'), 0), 1) as "побед из попыток %",
  count(*) filter (where kind = 'lose') as "проигрыши (аварии)",
  count(*) filter (where kind = 'timeout') as "время вышло",
  count(*) filter (where kind = 'quit') as "вышли",
  round(avg(progress) filter (where kind in ('lose', 'timeout', 'quit'))) as "где проигрывают, % трассы"
from chapter_events group by chapter order by chapter;
```

## 4. Забеги бесконечной трассы — где и от чего заканчиваются (один раз: SQL Editor → Run)

Игра (`src/run-metrics.js`) шлёт строку на каждый законченный забег: дальность, длительность, причина последней аварии,
все аварии забега (`412:car,980:animal:BEAR`), номер забега на устройстве, пауза до «Ещё раз» (`gap_s`, у первого в сессии −1),
вид (`inf` / `daily` / `challenge`), машина, вторые шансы, «горячий старт», вариант правил A/B (`ab`), нитро по кнопке и рывки из-за попутки.

```sql
create table if not exists public.run_events (
  id         bigint generated always as identity primary key,
  pid        text not null,
  day0       date not null,
  day        date not null,
  run_no     int  not null default 0,
  kind       text not null default 'inf',
  dist       int  not null default 0,
  time_s     int  not null default 0,
  cause      text not null default '',
  crashes    text not null default '',
  gap_s      int  not null default -1,
  cont       int  not null default 0,
  car        text not null default '',
  ab         text not null default '',
  warm       int  not null default 0,
  nitro      int  not null default 0,
  slip       int  not null default 0,
  platform   text not null default 'web',
  ver        text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists run_events_day on public.run_events (day);
alter table public.run_events enable row level security;   -- прямого доступа нет: только функция ниже

create or replace function public.run_put(
  p_pid text, p_day0 date, p_day date, p_run_no int, p_kind text, p_dist int, p_time int, p_cause text, p_crashes text,
  p_gap int, p_cont int, p_car text, p_ab text, p_warm int, p_nitro int, p_slip int, p_platform text, p_ver text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_pid !~ '^[0-9a-f]{16}$' or p_kind not in ('inf', 'daily', 'challenge') then raise exception 'bad'; end if;
  if p_day > current_date + 1 or p_day < current_date - 2 then raise exception 'bad day'; end if;
  insert into run_events (pid, day0, day, run_no, kind, dist, time_s, cause, crashes, gap_s, cont, car, ab, warm, nitro, slip, platform, ver)
  values (p_pid, p_day0, p_day, least(greatest(p_run_no, 0), 100000), p_kind, least(greatest(p_dist, 0), 1000000), least(greatest(p_time, 0), 36000),
    left(p_cause, 24), left(p_crashes, 400), least(greatest(p_gap, -1), 86400), least(greatest(p_cont, 0), 9), left(p_car, 24), left(p_ab, 24),
    least(greatest(p_warm, 0), 5000), least(greatest(p_nitro, 0), 999), least(greatest(p_slip, 0), 999), left(p_platform, 12), left(p_ver, 40));
end $$;
revoke all on function public.run_put from public;
grant execute on function public.run_put to anon;
```

**Где заканчиваются забеги** (корзины по 250 м; новички — первые 5 забегов на устройстве):

```sql
select (dist / 250) * 250 as "м", count(*) as "забегов",
  count(*) filter (where run_no <= 5) as "из них новички",
  mode() within group (order by cause) as "чаще всего от"
from run_events where kind = 'inf' and day > current_date - 7 group by 1 order by 1;
```

**От чего** (причина последней аварии, медиана дальности):

```sql
select cause as "причина", count(*) as "забегов", percentile_cont(0.5) within group (order by dist) as "медиана, м"
from run_events where day > current_date - 7 group by cause order by 2 desc;
```

**Длина забега и «Ещё раз»** (медиана и 90-й процентиль; доля рестартов быстрее 10 с):

```sql
select case when run_no <= 5 then 'новички (1–5)' else 'опытные' end as "кто", count(*) as "забегов",
  percentile_cont(0.5) within group (order by time_s) as "медиана, с",
  percentile_cont(0.9) within group (order by time_s) as "90%, с",
  round(100.0 * count(*) filter (where gap_s between 0 and 10) / nullif(count(*) filter (where gap_s >= 0), 0), 1) as "рестарт ≤ 10 с, %"
from run_events where day > current_date - 7 group by 1;
```

**D1 по длине первого забега** (вернулись ли назавтра те, у кого первый забег был коротким):

```sql
with first as (select pid, day0, time_s from run_events where run_no = 1),
     back  as (select distinct pid, day from sessions)
select case when f.time_s < 40 then '< 40 с' when f.time_s < 90 then '40–90 с' else '> 90 с' end as "первый забег",
  count(*) as "игроков",
  round(100.0 * count(*) filter (where exists (select 1 from back b where b.pid = f.pid and b.day = f.day0 + 1)) / count(*), 1) as "D1 %"
from first f group by 1 order by 1;
```

**A/B правил** (сравнение вариантов, только обычные забеги):

```sql
select ab as "вариант", count(distinct pid) as "игроков", count(*) as "забегов",
  percentile_cont(0.5) within group (order by time_s) as "медиана, с",
  percentile_cont(0.5) within group (order by dist) as "медиана, м",
  round(count(*)::numeric / count(distinct pid), 1) as "забегов на игрока",
  round(100.0 * count(*) filter (where gap_s between 0 and 10) / nullif(count(*) filter (where gap_s >= 0), 0), 1) as "рестарт ≤ 10 с, %"
from run_events where kind = 'inf' and ab <> '' group by ab;
```
