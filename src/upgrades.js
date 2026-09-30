/**
 * Прокачка машин за фишки: 5 улучшений × 3 уровня на каждую машину.
 * Главная петля «заехал → заработал → улучшил»: фишкам раньше почти некуда было тратиться.
 * Уровни хранятся в профиле: profile.upgrades[carId] = { engine: 0..3, ... }.
 */
export const MAX_UPGRADE_LEVEL = 3;

export const UPGRADES = [
    { id: 'engine', name: 'Двигатель', icon: '🔥', desc: 'макс. скорость', perLevel: '+4% скорости', cost: [600, 1000, 1500] },
    { id: 'gearbox', name: 'Коробка', icon: '⚙', desc: 'разгон', perLevel: '+9% разгона', cost: [500, 900, 1400] },
    { id: 'tires', name: 'Шины', icon: '🛞', desc: 'управление и масло', perLevel: '+8% руля, лучше на масле', cost: [500, 900, 1400] },
    { id: 'armor', name: 'Броня', icon: '🛡', desc: 'штраф за аварию', perLevel: '−8% штрафа времени', cost: [600, 1000, 1500] },
    { id: 'nitro', name: 'Нитро', icon: '💨', desc: 'длительность нитро', perLevel: '+0.5 с нитро', cost: [500, 900, 1400] }
];

export function emptyLevels() {
    const o = {};
    UPGRADES.forEach(function(u) { o[u.id] = 0; });
    return o;
}

export function normalizeLevels(raw) {
    const o = emptyLevels();
    if (raw && typeof raw === 'object') {
        UPGRADES.forEach(function(u) {
            const v = Math.floor(Number(raw[u.id]) || 0);
            o[u.id] = Math.max(0, Math.min(MAX_UPGRADE_LEVEL, v));
        });
    }
    return o;
}

/** Цена следующего уровня или null, если максимум */
export function nextCost(upgradeId, level) {
    const u = UPGRADES.find(function(x) { return x.id === upgradeId; });
    if (!u || level >= MAX_UPGRADE_LEVEL) return null;
    return u.cost[level];
}

/**
 * Итоговые характеристики машины с учётом прокачки.
 * preset — CAR_PRESETS[carId] (maxSpeed, accel, durability, oilGrip); nitroTime базовое 3.2 с.
 */
export function computeCarStats(preset, levels) {
    const L = normalizeLevels(levels);
    return {
        maxSpeed: preset.maxSpeed * (1 + 0.04 * L.engine),
        accel: preset.accel * (1 + 0.09 * L.gearbox),
        steerMul: 1 + 0.08 * L.tires,
        oilGrip: (preset.oilGrip || 1) * (1 + 0.1 * L.tires),
        durability: (preset.durability || 1) * (1 - 0.08 * L.armor),
        nitroTime: 3.2 + 0.5 * L.nitro
    };
}

/**
 * Полосы характеристик для гаража (0..1), чтобы сравнивать машины и видеть прирост.
 * Нормировка по «потолку» — лучшая машина с полной прокачкой.
 */
export function statBars(preset, levels) {
    const s = computeCarStats(preset, levels);
    const clamp = function(v) { return Math.max(0.05, Math.min(1, v)); };
    return [
        { id: 'speed', name: 'Скорость', v: clamp(s.maxSpeed / 0.56) },
        { id: 'accel', name: 'Разгон', v: clamp(s.accel / 0.037) },
        { id: 'handling', name: 'Управление', v: clamp((s.steerMul * s.oilGrip) / 1.7) },
        { id: 'armor', name: 'Прочность', v: clamp((1.3 - s.durability) / 0.85) },
        { id: 'nitro', name: 'Нитро', v: clamp(s.nitroTime / 4.7) }
    ];
}
