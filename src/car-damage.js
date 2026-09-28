/**
 * Как машина «помнит» аварии: вмятины и дым из-под капота растут с числом аварий.
 * Чистая логика (с тестами); меши меняет main.js.
 */

/** Сколько дыма и насколько он тёмный: 0–1 авария — чисто, дальше — гуще и темнее */
export function damageLook(strikes, maxStrikes) {
    const s = Math.max(0, strikes || 0), max = Math.max(1, maxStrikes || 5);
    if (s < 2) return { smokeRate: 0, smokeDark: 0 };
    const k = Math.min(1, (s - 1) / Math.max(1, max - 2));
    return { smokeRate: 3 + k * 9, smokeDark: 0.25 + k * 0.6 };
}

/**
 * Вмятина: небольшой поворот и сдвиг панели кузова плюс потемнение краски.
 * rnd — генератор [0,1). Возвращает { rx, rz, dy, darken }.
 */
export function dentFor(rnd) {
    const r = rnd || Math.random;
    const sign = function() { return r() < 0.5 ? -1 : 1; };
    return {
        rx: sign() * (0.03 + r() * 0.05),
        rz: sign() * (0.03 + r() * 0.05),
        dy: -(0.01 + r() * 0.025),
        darken: 0.8 + r() * 0.1
    };
}

/** Наклон корпуса вперёд-назад: газ — нос вверх, тормоз и удар — нос вниз (радианы) */
export function pitchFor(accel, maxAccel) {
    const k = Math.max(-1, Math.min(1, (accel || 0) / Math.max(1e-6, maxAccel || 1)));
    return k * 0.035; // rotation.x > 0 поднимает перёд (перёд модели — к −z)
}
