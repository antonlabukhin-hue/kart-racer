/**
 * Режим «Звериный час»: забег волнами (правила волн и очки — src/endless.js, сид и раскладка волны — src/beast-seed.js,
 * вызов другу — src/challenge.js). Здесь — жизнь забега между заездами: старт, запуск волны, карточка между волнами,
 * итог волны, рекорд и «Звериный час дня», текст итогов, ссылка-вызов, строка в панели заезда.
 * Сам заезд волны — общий движок main.js (initGame); связь — d:
 *   d.player(), d.save(), d.startRace(quality, difficulty, carId, mapId, weatherId), d.setMode(mode), d.clearCampaign(), d.hideMenu(), d.quality()
 * Забег лежит в window.__endless (его читают тесты и отладка), раскладка волны — window.__layoutOverride.
 */
import { newEndlessRun, waveDifficulty, waveScore, partialScore, recordBest } from '../endless.js';
import { wavePlan, dailySeed, seedCode } from '../beast-seed.js';
import { challengeUrl, challengeResult, dailyBest } from '../challenge.js';
import { waveRule, CHOICES, CHOICE_SECONDS, applyChoice, defaultChoice } from '../wave-rules.js';
import { addLocal, submitDaily, fetchDaily, localDay, dayTop, placeOf } from '../daily-board.js';
import { dayKey } from '../streak.js';

export const WAVE_CARD_MS = 1800;

const esc = function(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function(c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

/** Карточка волны между трассами: «Волна N пройдена · +очки», правило следующей волны, выбор бонуса, счёт, аварии, сид */
export function waveCardHtml(run, gained) {
    const rule = waveRule(run.seed, run.wave);
    return '<div class="ew-sub">Волна ' + (run.wave - 1) + ' пройдена · +' + gained + '</div>'
        + '<div class="ew-title">🐾 ВОЛНА ' + run.wave + '</div>'
        + (rule ? '<div class="ew-rule"><i>' + rule.icon + '</i><b>' + esc(rule.name) + '</b><span>' + esc(rule.desc) + '</span></div>' : '')
        + '<div class="ew-sub">Счёт: ' + run.score + ' · Аварии: ' + run.strikes + ' / 5</div>'
        + '<div class="ew-choose"><div class="ew-ct">1. Выбери бонус ·<b class="ew-left">' + CHOICE_SECONDS + '</b> с</div>'
        + CHOICES.map(function(c) { return '<button type="button" class="ew-pick" data-choice="' + c.id + '"' + (c.id === 'heart' && !(run.strikes > 0) ? ' disabled' : '') + '><i>' + c.icon + '</i><b>' + c.name + '</b><small>' + c.desc + '</small></button>'; }).join('')
        + '</div>'
        + '<button type="button" class="ew-go" disabled>2. ▶ ПОЕХАЛИ</button>'
        + '<button type="button" class="ew-menu">🏠 В меню</button>'
        + '<div class="ew-seed">' + (run.daily ? 'Звериный час дня · ' : 'Сид ') + seedCode(run.seed) + '</div>';
}

/** Текст итогов забега: { title, color, message } */
export function finishText(run, o) {
    let message = (run.daily ? 'Звериный час дня · ' : 'Сид ') + seedCode(run.seed) + '\n'
        + 'Волна: ' + run.wave + ' · Счёт: ' + run.score
        + '\n' + (o.state === 'timeout' ? 'Время волны вышло' : 'Аварий: ' + o.strikes + ' / ' + o.maxStrikes)
        + '\n' + (run.isNewBest ? '🎉 НОВЫЙ РЕКОРД!' : '🏆 Рекорд: ' + (o.best || 0))
        + (run.daily ? '\n📅 Лучший за сегодня: ' + (run.dailyBest || run.score) + (run.dailyNew && !run.isNewBest ? ' — новый!' : '') : '');
    if (run.challenge) {
        const cr = challengeResult(run.score, run.challenge.score);
        message += '\n\n⚔ Вызов ' + run.challenge.name + ' (' + run.challenge.score + '): '
            + (cr === 'win' ? 'побит! 🎉' : cr === 'tie' ? 'ничья' : 'не хватило ' + (run.challenge.score - run.score));
    }
    return { title: '🐾 ЗВЕРИНЫЙ ЧАС ОКОНЧЕН', color: '#ffd23c', message: message };
}

/**
 * Итог волны (чистая логика): мутирует run и профиль. m: { state, nearMiss, strikes, time, timeLimit, starsPicked, progress }.
 * Возвращает { next: true, gained } — волна пройдена (дальше следующая) или { next: false } — забег окончен (рекорд записан).
 */
export function settleWave(run, player, m) {
    run.nearMiss += m.nearMiss || 0;
    run.strikes = m.strikes;
    if (m.state === 'win') {
        const rule = waveRule(run.seed, run.wave);
        const gained = (waveScore({ time: m.time, nearMiss: m.nearMiss || 0, starsPicked: m.starsPicked || 0, timeLimit: m.timeLimit })
            + (rule && rule.jumpBonus ? rule.jumpBonus * (m.jumps || 0) : 0)) * (run.mul || 1); // «Прыгай!» и выбор «×2 очки»
        run.mul = 1;
        run.score += gained;
        run.wave++;
        return { next: true, gained: gained };
    }
    run.score += partialScore(m.progress, m.nearMiss || 0);
    const rb = recordBest(player.endlessBest, run.score);
    run.isNewBest = rb.isNew;
    run.bestBefore = player.endlessBest || 0;
    player.endlessBest = rb.best;
    if (run.daily) { // лучший «Звериный час дня» на этом устройстве
        const db = dailyBest(player.beastDaily, run.seed, run.score);
        player.beastDaily = db.rec;
        run.dailyBest = db.rec.best;
        run.dailyNew = db.isNew;
    }
    return { next: false };
}

export function createBeastHour(d) {
    const bh = {
        get run() { return window.__endless || null; },
        /** Идёт ли забег (pendingMode — режим из main.js) */
        active: function(mode) { return mode === 'endless' && !!window.__endless; },
        /** Новый забег: seed не задан — «Звериный час дня» (сид общий для всех в этот день); challenge — вызов от друга */
        start: function(seed, challenge) {
            d.clearCampaign();
            const daily = seed == null;
            window.__endless = newEndlessRun(daily ? dailySeed() : seed, daily);
            if (challenge) window.__endless.challenge = challenge;
            bh.launch();
        },
        /** Заезд текущей волны: карта, погода и раскладка — из сида; правило волны (src/wave-rules.js) */
        launch: function() {
            const run = window.__endless, p = d.player();
            if (!run || !p) return;
            d.setMode('endless');
            try { d.hideMenu(); } catch (e) {}
            const car = (p.unlockedCars || []).indexOf(p.preferredCar) >= 0 ? p.preferredCar : 'cheburashka';
            const plan = wavePlan(run.seed, run.wave), rule = waveRule(run.seed, run.wave);
            window.__layoutOverride = plan.layout;
            d.startRace(d.quality(), waveDifficulty(run.wave), car, plan.map, (rule && rule.weather) || plan.weather);
        },
        /** Правило текущей волны или null */
        rule: function() { const run = window.__endless; return run ? waveRule(run.seed, run.wave) : null; },
        /** Строка в панели заезда */
        hud: function() { const run = window.__endless, rule = waveRule(run.seed, run.wave); return '🐾 ВОЛНА ' + run.wave + ' · ' + run.score + (run.mul > 1 ? ' · ×' + run.mul : '') + (rule ? ' · ' + rule.icon + ' ' + rule.name : ''); },
        /** Конец заезда волны: m — как в settleWave; onNext(cleanup) — между волнами. true — волна пройдена (итогов не будет) */
        raceEnd: function(m, onNext) {
            const run = window.__endless, p = d.player();
            const r = settleWave(run, p, m);
            if (r.next) {
                // карточка волны: правило следующей и выбор бонуса (CHOICE_SECONDS с; не выбрал — по умолчанию)
                const el = document.createElement('div');
                el.id = 'endless-wave-card';
                el.innerHTML = waveCardHtml(run, r.gained);
                document.body.appendChild(el);
                // сначала бонус (не выбрал за CHOICE_SECONDS с — по умолчанию), потом «Поехали» — волна стартует по нажатию
                let left = CHOICE_SECONDS, picked = false, started = false, t = null;
                const goBtn = el.querySelector('.ew-go');
                const pick = function(id) {
                    if (picked) return;
                    picked = true; clearInterval(t);
                    const got = applyChoice(run, id);
                    el.querySelectorAll('.ew-pick').forEach(function(b) { b.disabled = true; b.classList.toggle('on', b.dataset.choice === got); });
                    const ct = el.querySelector('.ew-ct'); if (ct) ct.textContent = '✔ Бонус выбран';
                    if (goBtn) { goBtn.disabled = false; goBtn.classList.add('ready'); try { goBtn.focus(); } catch (e) {} }
                };
                const onKey = function(e) { if (e.key === 'Enter' || e.key === ' ') { if (!picked) pick(defaultChoice(run)); else start(); } };
                const start = function() {
                    if (!picked || started) return;
                    started = true;
                    document.removeEventListener('keydown', onKey);
                    try { el.remove(); } catch (e) {} if (onNext) onNext(); bh.launch();
                };
                document.addEventListener('keydown', onKey);
                t = setInterval(function() { left--; const l = el.querySelector('.ew-left'); if (l) l.textContent = String(left); if (left <= 0) pick(defaultChoice(run)); }, 1000);
                el.querySelectorAll('.ew-pick').forEach(function(b) { b.onclick = function() { pick(b.dataset.choice); }; });
                if (goBtn) goBtn.onclick = start;
                // «В меню» — закончить забег между волнами: счёт волн уже засчитан (settleWave)
                const menuBtn = el.querySelector('.ew-menu');
                if (menuBtn) menuBtn.onclick = function() {
                    if (started) return;
                    started = true; clearInterval(t);
                    document.removeEventListener('keydown', onKey);
                    try { el.remove(); } catch (e) {}
                    try { d.save(); } catch (e) {}
                    if (d.toMenu) d.toMenu();
                };
                return true;
            }
            if (run.daily && run.score > 0) { // «Звериный час дня» — в дневную таблицу (src/daily-board.js)
                const row = { mode: 'beast', day: dayKey(new Date()), name: p.name, score: run.score, car: p.preferredCar };
                addLocal(row);
                if (d.online && d.online()) submitDaily(row);
            }
            try { d.save(); } catch (e) {}
            return false;
        },
        finishText: function(o) { return finishText(window.__endless, o); },
        /** Карточка режима в меню: место в «Звериный час дня» (мир, если есть сеть) — cb(текст) */
        dayPlace: function(cb) {
            const p = d.player(), day = dayKey(new Date());
            if (!p) return;
            const show = function(rows, online) {
                const top = dayTop(rows, p.name), pl = placeOf(top, p.name);
                if (top.length) cb((online ? '🌍 ' : '📅 ') + 'сегодня ' + (pl ? '#' + pl + ' · ' : '') + 'лидер ' + top[0].score.toLocaleString('ru-RU'));
            };
            const local = localDay('beast', day);
            show(local, false);
            if (d.online && d.online()) fetchDaily('beast', day).then(function(rows) { if (rows) show(rows.concat(local), true); });
        },
        /** Ссылка-вызов другу: { url, text } */
        challenge: function(origin) {
            const run = window.__endless, p = d.player();
            if (!run || !p) return null;
            return { url: challengeUrl(origin, { seed: run.seed, score: run.score, wave: run.wave, name: p.name }),
                text: 'Побей мой «Звериный час»: ' + run.score + ' очков, волна ' + run.wave };
        }
    };
    return bh;
}
