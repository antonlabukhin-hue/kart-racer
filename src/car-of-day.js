/**
 * «Машина дня» — чтобы игрок увидел способности машин в деле, а не только на витрине:
 * раз в день витрина выбирает одну не купленную машину за «Е» (у каждого игрока свою, весь день одну и ту же),
 * её можно один раз бесплатно прокатить (тест-драйв, бесконечная трасса) и весь день купить на DISCOUNT дешевле.
 * profile.carDay = { day: 'ГГГГ-ММ-ДД', tried: bool }. Логика — чистая (с тестами).
 */
import { daysBetween } from './streak.js';

export const DISCOUNT = 0.3;
export const TRY_EVERY_DAYS = 3; // бесплатный тест-драйв машины дня — раз в 3 дня

function hash(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
}

/**
 * Машина дня: order — порядок витрины, presets — CAR_PRESETS, isGift(id) — подарочная (не продаётся).
 * Только за «Е» (не за кассеты), не подарочная, ещё не купленная. null — покупать нечего.
 * Машины идут по кругу (сдвиг — от имени игрока): в соседние дни — разные, пока есть из чего выбирать.
 */
export function carOfDay(profile, day, order, presets, isGift) {
    const owned = (profile && profile.unlockedCars) || [];
    const list = (order || []).filter(function(id) {
        const p = presets[id];
        return p && p.priceChips > 0 && !p.priceVhs && !(isGift && isGift(id)) && owned.indexOf(id) < 0;
    });
    if (!list.length) return null;
    const dayN = Math.round(Date.parse(day + 'T12:00:00Z') / 86400000);
    return list[(dayN + hash((profile && profile.name) || '')) % list.length];
}

/** Цена со скидкой, круглая (до 50 «Е») */
export function dayPrice(price) {
    return Math.max(50, Math.round(price * (1 - DISCOUNT) / 50) * 50);
}

/** Можно ли сегодня прокатиться бесплатно: раз в TRY_EVERY_DAYS дня */
export function canTestDrive(profile, day) {
    const c = profile && profile.carDay;
    return !(c && c.tried && daysBetween(c.day, day) < TRY_EVERY_DAYS);
}
/** Тест-драйв начат (дальше — через TRY_EVERY_DAYS дня) */
export function markTestDrive(profile, day) {
    profile.carDay = { day: day, tried: true };
}

/** Купить машину дня со скидкой: { ok, cost } | { ok: false, reason: 'no_chips' | 'owned', cost } */
export function buyCarOfDay(profile, id, price) {
    const cost = dayPrice(price);
    if ((profile.unlockedCars || []).indexOf(id) >= 0) return { ok: false, reason: 'owned', cost: cost };
    if ((profile.season.chips || 0) < cost) return { ok: false, reason: 'no_chips', cost: cost };
    profile.season.chips -= cost;
    profile.unlockedCars.push(id);
    profile.preferredCar = id;
    return { ok: true, cost: cost };
}

/** Блок на итогах тест-драйва */
export function testDriveHtml(o) {
    const esc = function(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function(c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
    return '<div class="fin-testdrive"><div class="td-title">🚗 Тест-драйв: «' + esc(o.name) + '»</div>'
        + (o.ability ? '<div class="td-ab">★ ' + esc(o.ability.name) + ' — ' + esc(o.ability.desc || '') + '</div>' : '')
        + '<div class="td-res">Проехал ' + Math.round(o.dist).toLocaleString('ru-RU') + ' м' + (o.myBest ? ' · твой рекорд ' + Math.round(o.myBest).toLocaleString('ru-RU') + ' м' : '') + '</div>'
        + (o.price ? '<button type="button" id="finish-buy-car" class="td-buy">🔥 Купить сегодня за ' + o.cost.toLocaleString('ru-RU') + ' Е <s>' + o.price.toLocaleString('ru-RU') + '</s></button>'
            : '<div class="td-how">🎁 Её не купить — только заслужить: ' + esc(o.how ? o.how.charAt(0).toLowerCase() + o.how.slice(1) : 'подарок') + '</div>') + '</div>';
}
