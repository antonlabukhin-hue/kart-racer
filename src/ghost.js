/**
 * Призрак лучшего заезда: запись траектории (x, z, y) раз в GHOST_STEP секунд чистого хода
 * и воспроизведение с интерполяцией. Хранится в localStorage на профиль + трассу + сложность.
 */
export const GHOST_STEP = 0.1;
const MAX_SAMPLES = 2400; // 4 минуты — с запасом на 90-секундный лимит
const r2 = function(v) { return Math.round(v * 100) / 100; };

export function ghostKey(profileId, trackKey, difficulty) {
    return 'road_racing_ghost_v1_' + (profileId || 'p') + '_' + trackKey + '_' + difficulty;
}

export function createGhostRecorder() {
    // точки строго через GHOST_STEP секунд: между кадрами — интерполяция (долгий кадр не сжимает время)
    const xs = [], zs = [], ys = [];
    let t = 0, nextT = 0, prev = null;
    return {
        update: function(dt, x, z, y) {
            const t0 = t;
            t += Math.max(0, dt || 0);
            if (!prev) prev = { x: x, z: z, y: y };
            while (nextT <= t && xs.length < MAX_SAMPLES) {
                const k = t > t0 ? Math.max(0, Math.min(1, (nextT - t0) / (t - t0))) : 1;
                xs.push(r2(prev.x + (x - prev.x) * k));
                zs.push(r2(prev.z + (z - prev.z) * k));
                ys.push(r2(prev.y + (y - prev.y) * k));
                nextT += GHOST_STEP;
            }
            prev.x = x; prev.z = z; prev.y = y;
        },
        get length() { return xs.length; },
        finish: function(time, car) {
            return { v: 1, step: GHOST_STEP, time: time, car: car, x: xs.slice(), z: zs.slice(), y: ys.slice() };
        }
    };
}

/** Проверка сохранённых данных — битые/чужие не воспроизводим */
export function isValidGhost(g) {
    return !!(g && g.v === 1 && Array.isArray(g.x) && g.x.length >= 2
        && g.x.length === g.z.length && g.x.length === g.y.length && g.step > 0 && typeof g.time === 'number');
}

/** Позиция призрака на момент t (секунды хода); null — призрак доехал */
export function sampleGhost(g, t) {
    const f = t / g.step;
    const i = Math.floor(f);
    if (i < 0) return { x: g.x[0], z: g.z[0], y: g.y[0], dx: 0 };
    if (i >= g.x.length - 1) return null;
    const k = f - i;
    return {
        x: g.x[i] + (g.x[i + 1] - g.x[i]) * k,
        z: g.z[i] + (g.z[i + 1] - g.z[i]) * k,
        y: g.y[i] + (g.y[i + 1] - g.y[i]) * k,
        dx: (g.x[i + 1] - g.x[i]) / g.step
    };
}

/** Сохранять ли новый заезд как призрак */
export function isBetterGhost(prev, time) {
    return !isValidGhost(prev) || time < prev.time;
}

/**
 * Живое отставание от призрака: сколько секунд назад призрак был там, где машина сейчас.
 * Возвращает функцию (z, t) → секунды: > 0 — отстаёшь от рекорда, < 0 — впереди;
 * null — до старта записи или призрак уже финишировал. Курсор двигается вместе с машиной (O(1) на кадр).
 */
export function createGhostDelta(g) {
    if (!isValidGhost(g)) return function() { return null; };
    const zs = g.z, n = zs.length;
    let i = 0;
    return function(z, t) {
        if (z > zs[0]) return null;
        while (i < n - 1 && zs[i + 1] >= z) i++;
        while (i > 0 && zs[i] < z) i--;
        if (i >= n - 1) return null;
        const z0 = zs[i], z1 = zs[i + 1];
        const k = z0 !== z1 ? Math.max(0, Math.min(1, (z0 - z) / (z0 - z1))) : 0;
        return t - (i + k) * g.step;
    };
}

/** Подпись для HUD: «−0.8 с» / «+1.2 с» (одна цифра после запятой) */
export function formatGhostDelta(d) {
    const v = Math.round(d * 10) / 10;
    return (v <= 0 ? '−' : '+') + Math.abs(v).toFixed(1) + ' с';
}

/**
 * Сравнение с рекордом трассы на финише (рекорд — время сохранённого призрака этой трассы и сложности).
 * prevTime — прежний рекорд или null (первый финиш). Возвращает { kind: 'first'|'best'|'behind', text, delta }.
 */
export function recordCompare(prevTime, time) {
    if (!(prevTime > 0)) return { kind: 'first', delta: null, text: '🏁 Первый рекорд трассы записан' };
    const d = Math.round((time - prevTime) * 10) / 10;
    if (d < 0) return { kind: 'best', delta: d, text: '🎉 Новый рекорд трассы: −' + Math.abs(d).toFixed(1) + ' с' };
    return { kind: 'behind', delta: d, text: 'До рекорда трассы: +' + d.toFixed(1) + ' с' };
}
