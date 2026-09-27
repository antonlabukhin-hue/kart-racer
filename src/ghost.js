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
