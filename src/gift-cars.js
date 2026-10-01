/**
 * Машины в подарок — за постоянство, а не за «Е»:
 *   🔥 «Трайк» — 7 дней подряд (серия дней, src/streak.js);
 *   👑 «Призрачный патруль» — закончил неделю первым в таблице «Неделя» (src/leaderboard.js, устройство + соперники из лора).
 * В витрине их не купить — только заслужить (там видно, сколько осталось). Если машина уже есть — вместо неё GIFT_DUP_VHS кассет.
 * О подарке — плашка в главном меню перед заездом (src/ui/gift-car-pop.js), как о новых машинах.
 * profile.giftCars = { got: { carId: время }, pending: [{ car, reason, dup }], weekDone: 'ГГГГ-ММ-ДД' (понедельник проверенной недели) }
 * Логика — чистая (с тестами).
 */
import { weekKey, topRuns, rankOf } from './leaderboard.js';

export const STREAK_DAYS = 7;
export const GIFT_DUP_VHS = 5;
export const GIFT_CARS = {
    trike: { reason: 'streak7', icon: '🔥', title: '7 дней подряд', how: 'Заходи в игру 7 дней подряд' },
    ghostcar: { reason: 'weekTop', icon: '👑', title: 'Король недели', how: 'Закончи неделю первым в таблице рекордов «Неделя»' }
};

export function isGiftCar(id) { return !!GIFT_CARS[id]; }
export function giftCarFor(reason) {
    return Object.keys(GIFT_CARS).find(function(id) { return GIFT_CARS[id].reason === reason; }) || null;
}

function state(profile) {
    const g = profile.giftCars = Object.assign({ got: {}, pending: [], weekDone: null }, profile.giftCars);
    if (!g.got || typeof g.got !== 'object') g.got = {};
    if (!Array.isArray(g.pending)) g.pending = [];
    return g;
}

/** Выдать машину за reason (один раз): уже есть — кассеты. Возвращает подарок или null (уже выдавали) */
export function grantGiftCar(profile, reason, now) {
    const car = giftCarFor(reason);
    const g = state(profile);
    if (!car || g.got[car]) return null;
    g.got[car] = now != null ? now : Date.now();
    if (!Array.isArray(profile.unlockedCars)) profile.unlockedCars = ['cheburashka'];
    const dup = profile.unlockedCars.indexOf(car) >= 0;
    if (dup) { profile.season = profile.season || {}; profile.season.vhs = (profile.season.vhs || 0) + GIFT_DUP_VHS; }
    else profile.unlockedCars.push(car);
    const gift = { car: car, reason: reason, dup: dup };
    g.pending.push(gift);
    return gift;
}

/** Была ли прошлая неделя за игроком: он катался на ней и стоит первым в недельной таблице */
export function wonWeek(board, name, prevWeekTime) {
    const rows = topRuns(board, 'week', prevWeekTime, name);
    const mine = rows.find(function(r) { return r.name === name; });
    return !!mine && !mine.rival && rankOf(rows, name) === 1;
}

/**
 * Проверить подарки (при входе в меню): серия дней и итог прошлой недели. o: { now, board }.
 * Возвращает новые подарки (они же — в profile.giftCars.pending, пока плашка не показана).
 */
export function checkGiftCars(profile, o) {
    const out = [];
    const now = o && o.now != null ? o.now : Date.now();
    const g = state(profile);
    if (profile.streak && (profile.streak.count || 0) >= STREAK_DAYS) {
        const x = grantGiftCar(profile, 'streak7', now);
        if (x) out.push(x);
    }
    const prev = now - 7 * 86400000, wk = weekKey(prev);
    if (g.weekDone !== wk) {
        g.weekDone = wk;
        if (profile.name && wonWeek((o && o.board) || [], profile.name, prev)) {
            const x = grantGiftCar(profile, 'weekTop', now);
            if (x) out.push(x);
        }
    }
    return out;
}

/** Подарок показан — убрать из очереди */
export function takeGiftPending(profile) {
    const g = state(profile);
    return g.pending.shift() || null;
}

/** Строка для витрины: как получить и сколько осталось. { title, how, left } */
export function giftProgress(profile, id, o) {
    const gc = GIFT_CARS[id];
    if (!gc) return null;
    if (gc.reason === 'streak7') {
        const n = Math.min(STREAK_DAYS, (profile.streak && profile.streak.count) || 0);
        return { icon: gc.icon, title: gc.title, how: gc.how, left: 'У тебя ' + n + ' из ' + STREAK_DAYS + ' дней' };
    }
    const rows = topRuns((o && o.board) || [], 'week', o && o.now != null ? o.now : Date.now(), profile.name);
    const r = rankOf(rows, profile.name), top = rows[0];
    const mine = rows.find(function(x) { return x.name === profile.name; });
    return { icon: gc.icon, title: gc.title, how: gc.how,
        left: mine && !mine.rival && r === 1 ? 'Сейчас ты первый — продержись до понедельника!' : ('Первый на неделе: ' + (top ? top.name + ' — ' + top.dist + ' м' : '—') + (r ? ' · ты #' + r : '')) };
}
