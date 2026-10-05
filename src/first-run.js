/**
 * Первый заезд новичка — постановочный: за первые 20 секунд гарантированно трамплин, рекламный щит, нитро
 * и зверь поперёк дороги, а первые FIRST_SAFE_SEC секунд удары не считаются — игрок чувствует «я крутой», а не «я разбился».
 * Всё — в средней полосе: кто просто едет прямо, видит всё шоу. Расстояния — под скорость первых секунд (~19 м/с).
 * Только бесконечная трасса, только самый первый заезд профиля и не в честном заезде («Заезд дня», вызов другу — opts.fair).
 */
export const FIRST_SAFE_SEC = 30;

export const FIRST_RUN_SCRIPT = [
    { d: 95, kind: 'ramp' },    // ~5 с — трамплин и прыжок
    { d: 190, kind: 'board' },  // ~10 с — снести рекламный щит
    { d: 285, kind: 'nitro' },  // ~15 с — нитро
    { d: 380, kind: 'animal' }  // ~20 с — зверь перебегает: проскочить «на волоске»
];
export const FIRST_LANE = 1; // средняя полоса — там, где машина стартует

export function isFirstRun(profile, opts) {
    const o = opts || {};
    return !!profile && !o.fair && !(profile.infinite && profile.infinite.runs > 0);
}

/** Удары не считаются: первый заезд и ещё не прошло FIRST_SAFE_SEC секунд */
export function firstRunSafe(first, raceTime) {
    return !!first && raceTime < FIRST_SAFE_SEC;
}

/**
 * Поставить сценарий: env.clear(zHi, zLo) — убрать всё, что там стоит; env.ramp(z), env.board(z), env.nitro(z), env.animal(z).
 * startZ — z старта (по ходу z уменьшается).
 */
export function stageFirstRun(startZ, env) {
    FIRST_RUN_SCRIPT.forEach(function(s) {
        const z = startZ - s.d;
        env.clear(z + 18, z - 14);
        env[s.kind](z);
    });
}
