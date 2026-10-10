/**
 * Крючки удержания в интерфейсе: секретные краски в гараже (src/secret-paints.js), тест-драйвы за вехи (src/test-drive.js) —
 * кружки красок, плашки на итогах, кнопка билета в меню и окно «Тест-драйвы».
 */
import { SECRET_PAINTS, hasSecretPaint, paintProgress } from '../secret-paints.js';
import { ladder, tickets } from '../test-drive.js';
import { weekState, addWeekDist, WEEK_GOAL } from '../week-car.js';
import { PLATE_DAYS, plateText } from '../name-plate.js';
import { claimComeback } from '../comeback.js';
import { weekKey } from '../leaderboard.js';

const esc = function(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function(c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
const hex = function(c) { return '#' + (c >>> 0).toString(16).padStart(6, '0'); };

/** Кружки секретных красок: заработанные — с эффектом, остальные — «?» с условием и прогрессом */
export function secretSwatchesHtml(profile, current, today) {
    return SECRET_PAINTS.map(function(sp) {
        if (hasSecretPaint(profile, sp.id)) return '<div class="color-swatch secret fx-' + sp.fx + (current === sp.id ? ' active' : '') + '" data-paint="' + sp.id + '" style="--c:' + hex(sp.color) + '" title="' + sp.icon + ' ' + esc(sp.name) + ' — секретная, твоя"></div>';
        const pr = paintProgress(profile, sp, today);
        return '<div class="secret-lock" data-secret="' + sp.id + '" title="Секретная краска: ' + esc(sp.how) + ' (' + pr[0] + '/' + pr[1] + ')"><b>?</b><small>' + pr[0] + '/' + pr[1] + '</small></div>';
    }).join('');
}

/** Текст подсказки для «?» */
export function secretHint(profile, id, today) {
    const sp = SECRET_PAINTS.find(function(x) { return x.id === id; });
    if (!sp) return null;
    const pr = paintProgress(profile, sp, today);
    return { title: '🔒 Секретная краска', text: sp.how + ' — сейчас ' + pr[0] + ' из ' + pr[1] + '. Какая — узнаешь, когда получишь!' };
}

/** Плашки на итогах: новые секретные краски и билеты тест-драйва */
export function hooksFinishHtml(paints, tks, names) {
    let h = '';
    (paints || []).forEach(function(sp) {
        h += '<div class="fin-hook fin-paint" role="button" tabindex="0" data-go="paint"><i class="hook-swatch fx-' + sp.fx + '" style="--c:' + hex(sp.color) + '"></i><div><b>Секретная краска «' + esc(sp.name) + '»!</b><small>' + esc(sp.how) + ' — бесплатно для всех твоих машин, в гараже сияет</small></div></div>';
    });
    (tks || []).forEach(function(k) {
        h += '<div class="fin-hook fin-td" role="button" tabindex="0" data-go="td"><i>🎟</i><div><b>Тест-драйв: «' + esc(names(k.car)) + '»!</b><small>' + k.icon + ' ' + esc(k.why) + ' · один заезд — в меню кнопка «Тест-драйв»</small></div></div>';
    });
    return h;
}

/** Кнопка билета в меню (#mm-td): есть билет — «🎟 Тест-драйв: Машина», нет — прогресс ближайшей вехи */
export function renderTdButton(profile, s, names, onOpen, presets) {
    const btn = document.getElementById('mm-td'), t = document.getElementById('mm-td-text');
    if (!btn || !t || !profile) return;
    const tk = tickets(profile);
    btn.classList.toggle('has', tk.length > 0);
    btn.onclick = onOpen;
    if (tk.length) { t.textContent = '🎟 «' + names(tk[0].car) + '»' + (tk.length > 1 ? ' +' + (tk.length - 1) : ''); return; }
    const next = ladder(profile, s, presets).filter(function(m) { return !m.done && !m.locked && m.prog; })
        .sort(function(a, b) { return b.prog[0] / b.prog[1] - a.prog[0] / a.prog[1]; })[0];
    t.textContent = next ? next.icon + ' ' + Math.round(next.prog[0] / next.prog[1] * 100) + '% до билета' : 'новые машины — на 1 заезд';
}

/** Окно «Тест-драйвы»: билеты (поехать) и лестница вех. o — { profile, stats, names(id), onGo(car) } */
export function showTdPop(o) {
    document.querySelectorAll('.td-modal').forEach(function(n) { n.remove(); });
    const tk = tickets(o.profile), lad = ladder(o.profile, o.stats, o.presets);
    const m = document.createElement('div');
    m.className = 'td-modal';
    const fmt = function(n) { return Math.round(n).toLocaleString('ru-RU'); };
    m.innerHTML = '<div class="td-card" role="dialog" aria-label="Тест-драйвы">'
        + '<div class="td-h">🎟 ТЕСТ-ДРАЙВЫ</div>'
        + '<div class="td-sub">Выполни задание — прокатись <b>один заезд</b> на машине или мотоцикле, которых у тебя ещё нет. Понравится — купишь со скидкой прямо на финише.</div>'
        + (tk.length ? '<div class="td-tickets">' + tk.map(function(k) {
            return '<button type="button" class="td-ticket" data-car="' + esc(k.car) + '"><i>🎟</i><span><b>' + esc(o.names(k.car)) + '</b><small>' + k.icon + ' ' + esc(k.why) + '</small></span><em>▶ ПОЕХАЛИ</em></button>';
        }).join('') + '</div>' : '')
        + '<ol class="td-ladder">' + lad.map(function(s) {
            const pct = s.prog ? Math.round(s.prog[0] / s.prog[1] * 100) : 0;
            return '<li class="' + (s.done ? 'done' : s.locked ? 'locked' : '') + '"><i>' + (s.done ? '✅' : s.locked ? '🔒' : s.icon) + '</i><span><b>' + esc(s.text) + '</b><small>'
                + (s.done ? 'получено' : s.locked ? 'сначала — 4 000 м' : 'тест-драйв «' + esc(o.names(s.car)) + '»' + (s.prog ? ' · ' + fmt(s.prog[0]) + ' / ' + fmt(s.prog[1]) : ''))
                + '</small>' + (!s.done && !s.locked && s.prog ? '<u><s style="width:' + pct + '%"></s></u>' : '') + '</span></li>';
        }).join('') + '<li class="more"><i>🔁</i><span><b>Дальше — каждый +1 000 м к рекорду</b><small>новый тест-драйв машины, которой у тебя нет</small></span></li></ol>'
        + '<button type="button" class="td-close">Понятно</button></div>';
    document.body.appendChild(m);
    const close = function() { m.remove(); };
    m.querySelector('.td-close').onclick = close;
    m.addEventListener('click', function(e) { if (e.target === m) close(); });
    m.querySelectorAll('.td-ticket').forEach(function(b) { b.onclick = function() { close(); o.onGo(b.dataset.car); }; });
    return m;
}

// новые краски, билеты и прочие награды копятся между заездами (волны «Звериного часа» без итогов) и показываются на ближайших итогах
let pending = { paints: [], tickets: [], extra: [], queued: [] };
/** extra — [{ icon, title, text, cls }] — машина недели, дружеский сундук */
export function addHooks(paints, tks, extra) { pending.paints = pending.paints.concat(paints || []); pending.tickets = pending.tickets.concat(tks || []); pending.queued = pending.queued.concat((tks && tks.queued) || []); pending.extra = pending.extra.concat((extra || []).filter(Boolean)); }
export function takeHooksHtml(names) {
    const p = pending; pending = { paints: [], tickets: [], extra: [], queued: [] };
    const q = p.queued.map(function(k) { return '<div class="fin-hook fin-td"><i>🎟</i><div><b>Веха выполнена: ' + esc(k.why) + '!</b><small>' + (k.car ? 'Тест-драйв «' + esc(names(k.car)) + '» придёт' : 'Билет придёт') + ' через ' + k.inDays + ' дн. — билеты не чаще раза в 3 дня</small></div></div>'; }).join('');
    return q + p.extra.map(function(x) { return '<div class="fin-hook ' + (x.cls || '') + '"><i>' + x.icon + '</i><div><b>' + esc(x.title) + '</b><small>' + esc(x.text) + '</small></div></div>'; }).join('') + hooksFinishHtml(p.paints, p.tickets, names);
}

/** Строка «Сегодня для тебя»: ближайшая к получению секретная краска или null */
export function secretNextText(profile, today) {
    const left = SECRET_PAINTS.filter(function(sp) { return !hasSecretPaint(profile, sp.id); })
        .map(function(sp) { const pr = paintProgress(profile, sp, today); return { sp: sp, pr: pr, k: pr[0] / pr[1] }; })
        .sort(function(a, b) { return b.k - a.k; })[0];
    return left ? 'Секретная краска: ' + left.sp.how + ' — ' + left.pr[0] + ' / ' + left.pr[1] : null;
}

// ---- машина недели, именной номер, подарок за возвращение, сундук за вызов друга ----
const m = function(n) { return Math.round(n || 0).toLocaleString('ru-RU'); };
const goalOf = function(w) { return (w && w.goal) || WEEK_GOAL; };

/** После заезда по бесконечной: прибавить метры к машине недели; плашка — награда или прогресс */
export function weekRaceExtra(profile, dist, presets, isGift, names, now) {
    const wk = weekKey(now || new Date());
    const before = weekState(profile, wk, presets, isGift);
    if (before.done || !before.car) return null;
    const r = addWeekDist(profile, wk, dist, presets, isGift);
    if (r && r.car) return { icon: '🚗', title: 'Машина недели «' + names(r.car) + '» — твоя!', text: m(goalOf(profile.weekCar)) + ' м за неделю — она уже в гараже', cls: 'fin-week' };
    if (r && r.vhs) return { icon: '📼', title: 'Машина недели: +' + r.vhs + ' кассеты', text: 'Все машины уже твои — вместо машины кассеты', cls: 'fin-week' };
    const w = profile.weekCar;
    return { icon: '🚗', title: 'Машина недели «' + names(w.car) + '»: ' + m(w.dist) + ' / ' + m(goalOf(w)) + ' м', text: 'Ещё ' + m(goalOf(w) - w.dist) + ' м в бесконечной до воскресенья — и машина твоя навсегда, без «Е»', cls: 'fin-week-prog' };
}

/** Плашка дружеского сундука (g — из grantFriendChest) */
export function friendExtra(g, name) {
    if (!g) return null;
    return { icon: '⚔', title: (g.win ? 'Вызов побит — богатый сундук!' : 'Дружеский сундук за вызов') + ' +' + g.chips + ' Е' + (g.vhs ? ' · +' + g.vhs + ' 📼' : ''), text: 'Вызов от ' + name + ' · за каждого друга — раз в день', cls: 'fin-friend' };
}

/** Строки «Сегодня для тебя»: машина недели и именной номер */
export function moreForYou(profile, presets, isGift, names, now) {
    const rows = [];
    const w = weekState(profile, weekKey(now || new Date()), presets, isGift);
    if (w.car && !w.done) rows.push({ icon: '🚗', text: 'Машина недели «' + names(w.car) + '»: ' + m(w.dist) + ' / ' + m(goalOf(w)) + ' м', act: 'week' });
    if (!(profile.namePlate && profile.namePlate.got)) {
        const c = (profile.streak && profile.streak.count) || 0;
        if (c >= 2) rows.push({ icon: '🏷', text: 'Именной номер: ' + c + ' / ' + PLATE_DAYS + ' дней подряд' });
    }
    return rows;
}

/** Подарки сверху окна «Привет»: за возвращение (забрать), именной номер (только что получен) */
export function helloGifts(profile, onClaim) {
    const plateNew = !!(profile.namePlate && profile.namePlate.fresh);
    if (plateNew) delete profile.namePlate.fresh;
    const out = [];
    const c = profile.comeback && profile.comeback.pending;
    if (c) out.push({ icon: '🎁', title: 'С возвращением! Подарок', text: 'Тебя не было ' + c.days + ' ' + (c.days % 10 === 1 && c.days % 100 !== 11 ? 'день' : c.days % 10 >= 2 && c.days % 10 <= 4 && (c.days % 100 < 12 || c.days % 100 > 14) ? 'дня' : 'дней') + ' — держи +' + c.chips + ' Е и +' + c.vhs + ' 📼',
        btn: 'Забрать', claim: function() { const g = claimComeback(profile); if (onClaim) onClaim(); return g ? '+' + g.chips + ' Е · +' + g.vhs + ' 📼 ✓' : '✓'; } });
    if (plateNew) out.push({ icon: '🏷', title: 'Именной номер — твой!', text: PLATE_DAYS + ' дней подряд: золотой номер «' + plateText(profile.name) + '» теперь на всех твоих машинах', act: 'garage', btn: 'Посмотреть' });
    return out;
}
