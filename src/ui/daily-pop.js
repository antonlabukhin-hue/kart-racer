/**
 * «Заезд дня» в меню и на итогах (логика — src/daily-run.js, таблица дня — src/daily-board.js):
 *   renderDailyCard — карточка в главном меню (условие дня или «✔ 3 200 м · #2»);
 *   showDailyPop — окно: условие, таблица дня, «Поехали» (одна попытка) или «Попытка потрачена»;
 *   dailyFinishHtml — строка итогов «Заезда дня» (результат записывается, место приходит с сервера);
 *   challengeFinishHtml — строка итогов вызова друга в бесконечной трассе.
 */
import { ruleOf, dailyState, finishDaily } from '../daily-run.js';
import { dayTop, placeOf, localDay, addLocal, submitDaily, fetchDaily } from '../daily-board.js';

const esc = function(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function(c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
const m = function(n) { return Math.round(n || 0).toLocaleString('ru-RU'); };

let cache = null; // { day, rows, at } — таблица дня с сервера
function withOnline(o, done) {
    const local = localDay('inf', o.day);
    done(local, false);
    if (!o.online) return;
    if (cache && cache.day === o.day && Date.now() - cache.at < 60000) { done(cache.rows.concat(local), true); return; }
    fetchDaily('inf', o.day).then(function(rows) { if (rows) { cache = { day: o.day, rows: rows, at: Date.now() }; done(rows.concat(local), true); } });
}

/** Карточка в меню: o — { profile, day, online, onOpen } */
export function renderDailyCard(o) {
    const btn = document.getElementById('mm-daily'), t = document.getElementById('mm-daily-text');
    if (!btn || !t || !o.profile) return;
    const st = dailyState(o.profile, o.day), rule = ruleOf(o.day);
    btn.classList.toggle('done', !!st.started);
    btn.onclick = o.onOpen;
    if (!st.started) { t.textContent = rule.icon + ' ' + rule.name; return; }
    withOnline(o, function(rows) {
        const top = dayTop(rows, o.profile.name), pl = placeOf(top, o.profile.name);
        t.textContent = '✔ ' + m(st.dist) + ' м' + (pl ? ' · #' + pl : '');
    });
}

/** Окно «Заезда дня»: o — { profile, day, online, onGo } */
export function showDailyPop(o) {
    document.querySelectorAll('.daily-modal').forEach(function(n) { n.remove(); });
    const rule = ruleOf(o.day), st = dailyState(o.profile, o.day);
    const box = document.createElement('div');
    box.className = 'daily-modal';
    box.innerHTML = '<div class="daily-card" role="dialog" aria-label="Заезд дня">'
        + '<div class="dl-title">📅 ЗАЕЗД ДНЯ</div>'
        + '<div class="dl-sub">Одна попытка · у всех одна трасса · без бустов и второго шанса</div>'
        + '<div class="dl-rule"><i>' + rule.icon + '</i><b>' + esc(rule.name) + '</b><span>' + esc(rule.desc) + '</span></div>'
        + '<div class="dl-board"><div class="dl-bt">🏆 Сегодня</div><ol class="dl-list"><li class="dl-empty">Пока никого — будь первым!</li></ol></div>'
        + (st.started ? '<div class="dl-done">' + (st.dist ? 'Твой результат: <b>' + m(st.dist) + ' м</b>' : 'Попытка уже потрачена') + ' — новая завтра</div>'
            : '<button type="button" class="dl-go">▶ ПОЕХАЛИ — 1 попытка</button>')
        + '<button type="button" class="dl-close">Закрыть</button></div>';
    document.body.appendChild(box);
    const close = function() { box.remove(); };
    box.querySelector('.dl-close').onclick = close;
    box.addEventListener('click', function(e) { if (e.target === box) close(); });
    const go = box.querySelector('.dl-go');
    if (go) go.onclick = function() { close(); o.onGo(); };
    withOnline(o, function(rows, online) {
        const top = dayTop(rows, o.profile.name).slice(0, 10), ol = box.querySelector('.dl-list');
        if (!ol || !top.length) return;
        ol.innerHTML = top.map(function(r, i) { return '<li class="' + (r.me ? 'me' : '') + '"><em>' + (i + 1) + '</em><span>' + esc(r.name) + '</span><b>' + m(r.score) + ' м</b></li>'; }).join('');
        const bt = box.querySelector('.dl-bt'); if (bt) bt.textContent = online ? '🌍 Сегодня в мире' : '🏆 Сегодня';
    });
    return box;
}

/** Итог «Заезда дня»: записать результат и вернуть строку для итогов. o — { profile, day, dist, car, online, submit } */
export function dailyFinishHtml(o) {
    const rule = ruleOf(o.day);
    finishDaily(o.profile, o.day, o.dist, o.dist);
    const row = { mode: 'inf', day: o.day, name: o.profile.name, score: Math.round(o.dist), car: o.car };
    if (row.score > 0) { addLocal(row); if (o.submit) submitDaily(row); }
    cache = null;
    setTimeout(function() {
        withOnline(o, function(rows, online) {
            const el = document.getElementById('fin-daily-place');
            const top = dayTop(rows, o.profile.name), pl = placeOf(top, o.profile.name);
            if (el && pl) el.textContent = ' · место #' + pl + ' из ' + top.length + (online ? ' в мире' : '');
        });
    }, o.submit ? 1200 : 0);
    return '<div class="fin-daily">📅 Заезд дня «' + esc(rule.name) + '»: <b>' + m(o.dist) + ' м</b><span id="fin-daily-place"></span><small>Следующая попытка — завтра, условие будет другое</small></div>';
}

/** Итог вызова друга в бесконечной трассе: c — { name, score (метры) } */
export function challengeFinishHtml(c, dist) {
    const d = Math.round(dist || 0), win = d > c.score;
    return '<div class="fin-daily">⚔ Вызов от ' + esc(c.name) + ' (' + m(c.score) + ' м): <b>' + (win ? 'побит! 🎉' : d === c.score ? 'ничья' : 'не хватило ' + m(c.score - d) + ' м') + '</b></div>';
}
