/**
 * Правило провала бесконечной трассы — A/B (какое держит лучше, решают данные run_events, docs/METRICS.md §4):
 *   'hearts' — как было: пять сердец (у «Рафика» шесть), ГАИ — только за столкновение с машиной;
 *   'chase'  — как в Subway Surfers: ошибка сажает ГАИ на хвост, ошибка во время погони — конец.
 *              Два сердца: первая авария (любая — машина, зверь, яма) — погоня CHASE_AB с; ушёл от ГАИ — сердце вернулось.
 * Вариант выпадает устройству один раз (50/50) и хранится; ?fail=hearts|chase — принудительно (проверка, e2e).
 * «Заезд дня» и вызов другу — всегда 'hearts': там игроки сравнивают результаты между собой.
 * Логика — чистая (с тестами).
 */

export const AB_KEY = 'road_racing_ab_fail';
export const VARIANTS = ['hearts', 'chase'];
export const CHASE_AB = 8;      // с погони в варианте 'chase' (в 'hearts' — CHASE_TIME из src/police-chase.js)
export const CHASE_HEARTS = 2;  // сердец в варианте 'chase'

/**
 * Вариант устройства: из адреса (?fail=), из хранилища или новый (rnd — генератор [0,1)).
 * fallback — вместо жребия (тестовая сборка и автотесты: всегда 'hearts', если адрес не просит другое; ничего не сохраняется)
 */
export function abVariant(storage, rnd, search, fallback) {
    const m = /[?&]fail=(hearts|chase)\b/.exec(search || '');
    if (m) return m[1];
    if (fallback) return fallback;
    let v = null;
    try { v = storage.getItem(AB_KEY); } catch (e) {}
    if (VARIANTS.indexOf(v) >= 0) return v;
    v = (rnd || Math.random)() < 0.5 ? 'hearts' : 'chase';
    try { storage.setItem(AB_KEY, v); } catch (e) {}
    return v;
}

/**
 * Правила забега. o: { variant, fair (день / вызов), ruleStrikes (условие «Заезда дня»), medic (у «Рафика» +1 сердце) }
 * → { variant, maxStrikes, chaseAll (погоня за любую аварию), chaseTime (с), refill (ушёл от ГАИ — сердца снова полные) }
 */
export function failRules(o) {
    const variant = o && !o.fair && o.variant === 'chase' ? 'chase' : 'hearts';
    const medic = o && o.medic ? 1 : 0;
    if (o && o.ruleStrikes) return { variant: 'hearts', maxStrikes: o.ruleStrikes, chaseAll: false, chaseTime: 0, refill: false };
    if (variant === 'chase') return { variant: variant, maxStrikes: CHASE_HEARTS + medic, chaseAll: true, chaseTime: CHASE_AB, refill: true };
    return { variant: variant, maxStrikes: 5 + medic, chaseAll: false, chaseTime: 0, refill: false };
}
