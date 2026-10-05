/**
 * Раздел «🎁 Подарки» (бывший «Сезон»): первая вкладка — всё, что ждёт и к чему идёшь, в одном месте;
 * вторая — награды сезона, третья — события. Окно «Привет» после заставки — короткая версия этой вкладки.
 *   Ждут тебя: подарок за возвращение, сундук дня, билеты тест-драйва, награды сезона.
 *   Прогресс: машина недели, тест-драйвы, секретные краски, именной номер, машины в подарок.
 *   Новости: всё, что появилось в игре (новое — золотом; открыл вкладку — прочитано).
 * Кнопка в меню сияет, пока есть что забрать или прочитать (giftsBadge).
 */
import { NEWS, unseenNews, markSeen } from './hello-news.js';
import { tickets, ladder } from '../test-drive.js';
import { SECRET_PAINTS, hasSecretPaint, paintProgress } from '../secret-paints.js';
import { weekState, WEEK_GOAL } from '../week-car.js';
import { PLATE_DAYS, plateText } from '../name-plate.js';
import { claimComeback } from '../comeback.js';
import { GIFT_CARS, giftProgress } from '../gift-cars.js';
import { weekKey } from '../leaderboard.js';

const esc = function(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function(c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
const m = function(n) { return Math.round(n || 0).toLocaleString('ru-RU'); };
const bar = function(a, b) { return '<u class="gf-bar"><s style="width:' + Math.max(0, Math.min(100, Math.round(a / Math.max(1, b) * 100))) + '%"></s></u>'; };

/** Сколько «есть что забрать или прочитать» — счётчик и сияние кнопки в меню */
export function giftsBadge(profile, o) {
    if (!profile) return 0;
    const c = profile.comeback && profile.comeback.pending ? 1 : 0;
    return unseenNews(profile).length + c + tickets(profile).length + ((o && o.seasonCount) || 0);
}

/**
 * Разметка вкладки. o — { profile, today, presets, isGift(id), names(id), stats (для тест-драйвов), canChest, seasonCount, board, now }
 */
export function giftsHtml(o) {
    const p = o.profile, waits = [], prog = [];
    const card = function(icon, title, text, act, btn, extra, cls) {
        return '<div class="gf-card' + (cls ? ' ' + cls : '') + (act ? ' gf-tap' : '') + '"' + (act ? ' data-card-act="' + act + '"' : '') + '><i>' + icon + '</i><div><b>' + esc(title) + '</b>' + (text ? '<span>' + esc(text) + '</span>' : '') + (extra || '') + '</div>'
            + (act ? '<button type="button" class="gf-act" data-act="' + act + '">' + esc(btn) + '</button>' : '') + '</div>';
    };
    // ждут тебя
    const cb = p.comeback && p.comeback.pending;
    if (cb) waits.push(card('🎁', 'Подарок за возвращение', '+' + cb.chips + ' Е и +' + cb.vhs + ' 📼', 'comeback', 'Забрать', '', 'hot'));
    if (o.canChest) waits.push(card('📦', 'Сундук дня', 'Серия ' + ((p.streak && p.streak.count) || 1) + ' дн. · иногда внутри тюнинг', 'chest', 'Открыть', '', 'hot'));
    tickets(p).forEach(function(k) { waits.push(card('🎟', 'Тест-драйв «' + o.names(k.car) + '»', k.icon + ' ' + k.why + ' · один заезд', 'ride:' + k.car, '▶ Поехали', '', 'hot')); });
    if (o.seasonCount) waits.push(card('🏆', 'Награды сезона', 'Можно забрать: ' + o.seasonCount, 'season', 'Забрать', '', 'hot'));
    // прогресс
    const w = weekState(p, weekKey(o.now ? new Date(o.now) : new Date()), o.presets, o.isGift);
    if (w.car) prog.push(w.done ? card('🚗', 'Машина недели «' + o.names(w.car) + '» — твоя!', 'Новая — в понедельник', 'week', 'Смотреть')
        : card('🚗', 'Машина недели «' + o.names(w.car) + '»', m(w.dist) + ' / ' + m(w.goal || WEEK_GOAL) + ' м до воскресенья · навсегда, без «Е»', 'week', 'Смотреть', bar(w.dist, w.goal || WEEK_GOAL)));
    const next = ladder(p, o.stats).filter(function(s) { return !s.done && !s.locked && s.prog; })
        .sort(function(a, b) { return b.prog[0] / b.prog[1] - a.prog[0] / a.prog[1]; })[0];
    prog.push(card('🎟', 'Тест-драйвы', next ? next.icon + ' ' + next.text + ' — «' + o.names(next.car) + '» на 1 заезд' : 'Каждые +1 000 м к рекорду — новая машина на 1 заезд', 'td', 'Все задания', next ? bar(next.prog[0], next.prog[1]) : ''));
    const paints = SECRET_PAINTS.map(function(sp) {
        if (hasSecretPaint(p, sp.id)) return '<li class="got"><i class="sw fx-' + sp.fx + '" style="--c:#' + (sp.color >>> 0).toString(16).padStart(6, '0') + '"></i><span>' + sp.icon + ' ' + esc(sp.name) + ' — твоя</span></li>';
        const pr = paintProgress(p, sp, o.today);
        return '<li><i class="sw lock">?</i><span>' + esc(sp.how) + ' · ' + pr[0] + '/' + pr[1] + '</span>' + bar(pr[0], pr[1]) + '</li>';
    }).join('');
    prog.push(card('🎨', 'Секретные краски', 'В гараже их не купить — только заслужить', 'garage', 'В гараж', '<ul class="gf-paints">' + paints + '</ul>'));
    const st = (p.streak && p.streak.count) || 0;
    prog.push(p.namePlate && p.namePlate.got ? card('🏷', 'Именной номер «' + plateText(p.name) + '»', 'Золотой номер — на всех твоих машинах')
        : card('🏷', 'Именной номер', Math.min(st, PLATE_DAYS) + ' / ' + PLATE_DAYS + ' дней подряд в игре', null, null, bar(st, PLATE_DAYS)));
    Object.keys(GIFT_CARS).forEach(function(id) {
        const got = p.giftCars && p.giftCars.got && p.giftCars.got[id];
        const g = giftProgress(p, id, { board: o.board || [], now: o.now });
        if (!g) return;
        prog.push(got ? card(g.icon, '«' + o.names(id) + '» — твоя', 'Машина в подарок', 'shop:' + id, 'Смотреть')
            : card(g.icon, 'Машина в подарок «' + o.names(id) + '»', g.how + ' · ' + g.left, 'shop:' + id, 'Смотреть', GIFT_CARS[id].reason === 'streak7' ? bar(Math.min(7, st), 7) : ''));
    });
    // новости
    const fresh = unseenNews(p);
    const news = NEWS.map(function(x) { const isNew = fresh.indexOf(x) >= 0; return '<div class="gf-news' + (isNew ? ' new' : '') + '"><i>' + x.icon + '</i><div><b>' + esc(x.title) + (isNew ? '<em>НОВОЕ</em>' : '') + '</b><span>' + esc(x.text) + '</span></div></div>'; }).join('');
    return (waits.length ? '<div class="gf-h">⭐ Ждут тебя</div>' + waits.join('') : '')
        + '<div class="gf-h">📈 К чему идёшь</div>' + prog.join('')
        + '<div class="gf-h">📰 Новости игры</div>' + news;
}

/** Показать вкладку: o — как giftsHtml + { onAct(act), save() }. Новости отмечаются прочитанными */
export function renderGifts(el, o) {
    if (!el) return;
    el.innerHTML = giftsHtml(o);
    NEWS.forEach(function(x) { markSeen(o.profile, x.id); });
    if (o.save) o.save();
    // вся карточка нажимается, не только кнопка справа (нажимали на светящуюся строку — ничего не происходило)
    el.querySelectorAll('[data-card-act]').forEach(function(c) {
        c.addEventListener('click', function(ev) { if (ev.target.closest('[data-act]')) return; const btn = c.querySelector('[data-act]'); if (btn) btn.click(); });
    });
    el.querySelectorAll('[data-act]').forEach(function(b) {
        b.onclick = function() {
            const a = b.dataset.act;
            if (a === 'comeback') { const g = claimComeback(o.profile); if (o.save) o.save(); b.outerHTML = '<span class="gf-got">' + (g ? '+' + g.chips + ' Е · +' + g.vhs + ' 📼 ✓' : '✓') + '</span>'; if (o.onClaim) o.onClaim(); return; }
            if (o.onAct) o.onAct(a);
        };
    });
}
