/**
 * Секретные краски — за постоянство, их нет в общем списке гаража, пока не заработаешь:
 *   💡 «Неон» — светящийся кузов: 10 заездов за 3 дня;
 *   🌈 «Радуга» — переливается всеми цветами: 30 заездов за 7 дней;
 *   🥇 «Золото» — 7 дней подряд хотя бы по заезду (серия заездов, не входов).
 * Заезд — любой режим (волна «Звериного часа» — тоже). profile.activity = { 'ГГГГ-ММ-ДД': заездов } (последние 10 дней),
 * profile.secretPaints = { got: { id: время } }. Получил — краска бесплатна для всех твоих машин и сияет в гараже.
 * Логика — чистая (с тестами); как краска выглядит — src/paint-fx.js.
 */
import { dayKey, daysBetween } from './streak.js';

export const SECRET_PAINTS = [
    { id: 'neon', name: 'Неон', icon: '💡', color: 0xff2bd6, fx: 'glow', races: 10, days: 3, how: '10 заездов за 3 дня' },
    { id: 'rainbow', name: 'Радуга', icon: '🌈', color: 0xff3030, fx: 'rainbow', races: 30, days: 7, how: '30 заездов за 7 дней' },
    { id: 'gold', name: 'Золото', icon: '🥇', color: 0xf2c033, fx: 'gold', streak: 7, how: '7 дней подряд хотя бы по заезду' }
];
const KEEP_DAYS = 10;

/** Отметить заезд (мутирует профиль) */
export function countRace(profile, today) {
    const a = profile.activity = Object.assign({}, profile.activity);
    a[today] = (a[today] || 0) + 1;
    Object.keys(a).forEach(function(k) { if (daysBetween(k, today) >= KEEP_DAYS) delete a[k]; });
}

/** Заездов за последние n дней (включая сегодня) */
export function racesIn(profile, today, n) {
    const a = profile.activity || {};
    return Object.keys(a).reduce(function(s, k) { const d = daysBetween(k, today); return d >= 0 && d < n ? s + a[k] : s; }, 0);
}

/** Дней подряд с заездом, по сегодня */
export function raceStreak(profile, today) {
    const a = profile.activity || {};
    let n = 0;
    const t = new Date(today + 'T12:00:00');
    while (n < KEEP_DAYS && a[dayKey(new Date(t.getTime() - n * 86400000))]) n++;
    return n;
}

/** Прогресс краски: [сколько, нужно] */
export function paintProgress(profile, sp, today) {
    return sp.streak ? [Math.min(sp.streak, raceStreak(profile, today)), sp.streak] : [Math.min(sp.races, racesIn(profile, today, sp.days)), sp.races];
}

export function hasSecretPaint(profile, id) { return !!(profile.secretPaints && profile.secretPaints.got && profile.secretPaints.got[id]); }

/** После заезда: отметить и выдать заслуженные краски. Возвращает новые [sp] */
export function checkSecretPaints(profile, today, now) {
    countRace(profile, today);
    const s = profile.secretPaints = Object.assign({ got: {} }, profile.secretPaints);
    const out = [];
    SECRET_PAINTS.forEach(function(sp) {
        if (s.got[sp.id]) return;
        const pr = paintProgress(profile, sp, today);
        if (pr[0] >= pr[1]) { s.got[sp.id] = now != null ? now : Date.now(); out.push(sp); }
    });
    return out;
}
