/**
 * «Машина недели»: каждую неделю (с понедельника) своя машина, которой у тебя нет, — проедь goal м
 * в бесконечной трассе за неделю (метры всех заездов складываются), и она твоя навсегда, без «Е». Всё есть — WEEK_DUP_VHS кассет.
 * Машина — из продающихся за «Е» от WEEK_MIN_PRICE до WEEK_MAX_PRICE (не подарочных), у каждого игрока своя, всю неделю одна и та же;
 * цель — M_PER_E метра за каждую «Е» цены (goalFor): машина за 15 000 Е — 60 км. profile.weekCar = { week, dist, car, goal, done }. Логика — чистая (с тестами).
 */
export const WEEK_GOAL = 15000;
export const WEEK_MIN_PRICE = 10000; // дешёвые — не машины недели
export const WEEK_MAX_PRICE = 15000;
/** Сколько метров за неделю нужно на машину ценой price */
export const M_PER_E = 4;
export function goalFor(price) { return Math.round(price * M_PER_E / 1000) * 1000; }
export const WEEK_DUP_VHS = 3;

function hash(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
}

/** Состояние недели (новая неделя — новая машина и счёт с нуля). isGift(id) — подарочная (не берём) */
export function weekState(profile, week, presets, isGift) {
    let w = profile.weekCar;
    if (!w || w.week !== week) {
        const own = profile.unlockedCars || [];
        const list = Object.keys(presets).filter(function(id) { const p = presets[id]; return own.indexOf(id) < 0 && p.priceChips >= WEEK_MIN_PRICE && p.priceChips <= WEEK_MAX_PRICE && !p.priceVhs && !(isGift && isGift(id)); }).sort();
        const car = list.length ? list[hash(week + '|' + (profile.name || '')) % list.length] : null;
        w = profile.weekCar = { week: week, dist: 0, car: car, goal: car ? goalFor(presets[car].priceChips) : WEEK_GOAL, done: false };
    }
    return w;
}

/** После заезда по бесконечной: прибавить метры. Цель достигнута — выдать. Возвращает { car | vhs } (награда) или null */
export function addWeekDist(profile, week, dist, presets, isGift) {
    const w = weekState(profile, week, presets, isGift);
    if (w.done || !(dist > 0)) return null;
    w.dist += Math.round(dist);
    if (w.dist < (w.goal || WEEK_GOAL)) return null;
    w.done = true;
    if (!Array.isArray(profile.unlockedCars)) profile.unlockedCars = ['cheburashka'];
    if (w.car && profile.unlockedCars.indexOf(w.car) < 0) { profile.unlockedCars.push(w.car); return { car: w.car }; }
    profile.season = profile.season || {};
    profile.season.vhs = (profile.season.vhs || 0) + WEEK_DUP_VHS;
    return { vhs: WEEK_DUP_VHS };
}
