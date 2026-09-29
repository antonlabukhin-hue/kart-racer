/**
 * Физика машины по высоте: трамплины, прыжок, полёт, приземление.
 * Чистые функции — main.js передаёт состояние и применяет результат; тесты — tests/unit/race-physics.test.js.
 * Машина едет в сторону уменьшения z: у трамплина zEnter (заезд, низ) > zExit (съезд, верх).
 */
export const GRAVITY = 9.5;
export const LAUNCH_EDGE = 0.9;       // доля длины трамплина, с которой машина взлетает
export const MIN_LAUNCH_SPEED = 0.12; // медленнее — просто скатывается
export const NITRO_JUMP = 1.6;
export const BOSS_RAMP_JUMP = 1.7;
export const GAP_RAMP_MIN_SPEED = 0.6; // доля MAX_SPEED: трамплин перед разломом всегда перебрасывает
export const LAND_BOOST = 1.14;
export const LAND_CAP = 1.08;          // доля MAX_SPEED

/**
 * Касание трамплина за кадр. zPrev — позиция до движения в этом кадре.
 * Возвращает null (не на трамплине) или { p: 0..1 — где на трамплине, crossed: пролетел кромку съезда за кадр }.
 * crossed нужен на высокой скорости: один кадр может пронести машину через всю зону взлёта.
 */
export function rampContact(x, z, zPrev, ramp) {
    if (!ramp || Math.abs(x - ramp.x) >= ramp.width * 0.55) return null;
    const inside = z <= ramp.zEnter && z >= ramp.zExit;
    const crossed = !inside && zPrev >= ramp.zExit && z <= ramp.zExit;
    if (!inside && !crossed) return null;
    const p = Math.max(0, Math.min(1, (ramp.zEnter - z) / Math.max(0.1, ramp.len)));
    return { p: p, crossed: crossed };
}

/** Вертикальная скорость взлёта: чем быстрее и выше трамплин — тем выше прыжок; нитро и трамплин тарана — выше */
export function launchVelocity(speed, ramp, nitro) {
    let v = (1.0 + speed * 2.4) * ramp.height;
    if (ramp.bossRamp) v *= BOSS_RAMP_JUMP;
    if (nitro) v *= NITRO_JUMP;
    return v;
}

/**
 * Трамплины за кадр (машина на земле). s — { x, z, zPrev, speed, nitro, maxSpeed }.
 * Возвращает { mode: 'none' } | { mode: 'ride', y, speed } | { mode: 'launch', y, airVel, speed, nitroJump }.
 */
export function stepRamps(s, ramps) {
    for (let i = 0; i < ramps.length; i++) {
        const rp = ramps[i];
        const c = rampContact(s.x, s.z, s.zPrev, rp);
        if (!c) continue;
        let speed = s.speed;
        if (rp.gapRamp && speed < s.maxSpeed * GAP_RAMP_MIN_SPEED) speed = s.maxSpeed * GAP_RAMP_MIN_SPEED;
        if ((c.crossed || c.p > LAUNCH_EDGE) && speed > MIN_LAUNCH_SPEED) {
            return { mode: 'launch', ramp: rp, y: rp.height, airVel: launchVelocity(speed, rp, s.nitro), speed: speed, nitroJump: !!s.nitro };
        }
        return { mode: 'ride', ramp: rp, y: rp.height * c.p, speed: speed };
    }
    return { mode: 'none' };
}

/** Полёт за кадр: { y, vel, landed } */
export function stepAir(y, vel, dt) {
    const v = vel - GRAVITY * dt;
    const ny = y + v * dt;
    if (ny <= 0) return { y: 0, vel: 0, landed: true };
    return { y: ny, vel: v, landed: false };
}

/** Сколько секунд до приземления (из высоты y с вертикальной скоростью vel) */
export function timeToLand(y, vel) {
    return (vel + Math.sqrt(Math.max(0, vel * vel + 2 * GRAVITY * Math.max(0, y)))) / GRAVITY;
}

/** Скорость после приземления: небольшой разгон, но не выше потолка. { speed, boosted } */
export function landingSpeed(speed, maxSpeed) {
    if (speed <= 0.08) return { speed: speed, boosted: false };
    return { speed: Math.min(speed * LAND_BOOST, maxSpeed * LAND_CAP), boosted: true };
}

/**
 * Оценка посадки после прыжка: чистая — долгий полёт (≥ 0.45 с) без удара в воздухе.
 * Награда за чистую — короткий рывок нитро (сек). Возвращает { clean, nitro }.
 */
export const CLEAN_LANDING_AIR = 0.45;
export function landingGrade(airTime, hitInAir) {
    const clean = !hitInAir && airTime >= CLEAN_LANDING_AIR;
    return { clean: clean, nitro: clean ? Math.min(1.2, 0.5 + airTime * 0.6) : 0 };
}
