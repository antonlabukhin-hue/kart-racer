/**
 * Тюнинг в сундуке дня: иногда вместо одних «Е» внутри деталь тюнинга или уровень прокачки машины, на которой ездишь.
 * Шанс растёт к концу недели серии, в 7-й день — всегда. Деталь — из ещё не купленных (сияет золотом в гараже),
 * прокачка — +1 уровень случайного не доведённого до максимума улучшения. Всё есть — ничего (хватит и «Е»).
 * Логика — чистая (с тестами).
 */
import { CAR_PARTS } from './content.js';
import { UPGRADES, MAX_UPGRADE_LEVEL, normalizeLevels } from './upgrades.js';
import { addNewGift } from './ui/gift-garage.js';

/** Шанс тюнинга по дню серии 1..7 */
export const LOOT_CHANCE = [0.15, 0.2, 0.35, 0.2, 0.35, 0.45, 1];

export function lootChance(day) { return LOOT_CHANCE[(Math.max(1, day) - 1) % LOOT_CHANCE.length]; }

/** Что можно выдать: детали, которых нет, и улучшения ниже максимума (для машины carId) */
export function lootPool(profile, carId) {
    const lo = profile.carLoadout || {};
    const have = (lo.ownedParts || []).concat(lo.parts || []);
    const parts = CAR_PARTS.filter(function(p) { return have.indexOf(p.id) < 0 && !(carId === 'kirpich' && p.id === 'roof_rack'); });
    const lv = normalizeLevels((profile.upgrades || {})[carId]);
    const ups = UPGRADES.filter(function(u) { return lv[u.id] < MAX_UPGRADE_LEVEL; });
    return { parts: parts, ups: ups, levels: lv };
}

/**
 * Бросить и выдать тюнинг (мутирует profile). day — день серии.
 * Возвращает { kind: 'part', id, name } | { kind: 'upgrade', car, id, name, icon, level } | null
 */
export function rollChestLoot(profile, day, rnd) {
    const r = rnd || Math.random;
    if (r() >= lootChance(day)) return null;
    const car = profile.preferredCar || 'cheburashka';
    const pool = lootPool(profile, car);
    const wantPart = r() < 0.5;
    const kind = (wantPart && pool.parts.length) || !pool.ups.length ? 'part' : 'upgrade';
    if (kind === 'part') {
        if (!pool.parts.length) return null;
        const p = pool.parts[Math.floor(r() * pool.parts.length) % pool.parts.length];
        const lo = profile.carLoadout = profile.carLoadout || { parts: [] };
        if (!Array.isArray(lo.ownedParts)) lo.ownedParts = [];
        lo.ownedParts.push(p.id);
        addNewGift(lo, 'part', p.id);
        return { kind: 'part', id: p.id, name: p.name };
    }
    const u = pool.ups[Math.floor(r() * pool.ups.length) % pool.ups.length];
    const lv = pool.levels;
    lv[u.id]++;
    profile.upgrades = profile.upgrades && typeof profile.upgrades === 'object' ? profile.upgrades : {};
    profile.upgrades[car] = lv;
    return { kind: 'upgrade', car: car, id: u.id, name: u.name, icon: u.icon, level: lv[u.id] };
}

/** Строка в окне сундука */
export function lootText(loot, carName) {
    if (!loot) return '';
    return loot.kind === 'part' ? '🛠 Деталь «' + loot.name + '» — уже в гараже!'
        : loot.icon + ' ' + loot.name + ' → ур. ' + loot.level + (carName ? ' для «' + carName + '»' : '') + ' — бесплатно!';
}
