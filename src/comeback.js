/**
 * Подарок за возвращение: не заходил COMEBACK_DAYS+ дней — в окне «Привет» ждёт подарок (чем дольше не было, тем больше, с потолком).
 * Не чаще раза в COOLDOWN_DAYS дней. Проверять ДО touchStreak (по дате прошлого захода).
 * profile.comeback = { pending: { chips, vhs, days } | null, last: 'ГГГГ-ММ-ДД' }. Логика — чистая (с тестами).
 */
import { daysBetween } from './streak.js';

export const COMEBACK_DAYS = 3;
export const COOLDOWN_DAYS = 7;

/** Подарок за gap дней отсутствия */
export function comebackGift(gap) {
    return { chips: Math.min(1000, 150 + gap * 50), vhs: gap >= 7 ? 2 : 1, days: gap };
}

/** При входе: вернулся после долгого перерыва — подарок ждёт. Возвращает подарок или null */
export function checkComeback(profile, today) {
    const last = profile.streak && profile.streak.last;
    if (!last) return null;
    const gap = daysBetween(last, today);
    const c = profile.comeback = Object.assign({ pending: null, last: null }, profile.comeback);
    if (gap < COMEBACK_DAYS || c.pending || (c.last && daysBetween(c.last, today) < COOLDOWN_DAYS)) return null;
    c.pending = comebackGift(gap);
    c.last = today;
    return c.pending;
}

/** Забрать подарок: начисляет и возвращает его (или null) */
export function claimComeback(profile) {
    const c = profile.comeback;
    if (!c || !c.pending) return null;
    const g = c.pending;
    profile.season = profile.season || {};
    profile.season.chips = (profile.season.chips || 0) + g.chips;
    profile.season.vhs = (profile.season.vhs || 0) + g.vhs;
    c.pending = null;
    return g;
}
