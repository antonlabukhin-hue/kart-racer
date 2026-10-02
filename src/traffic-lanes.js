/**
 * Полосы попуток: три полосы по центрам −2, 0, +2 (как полосы игрока). Раньше считались со сдвигом влево
 * (−2.5, −0.5, +1.5) — у правой обочины оставался «коридор», где машины не доставали никогда.
 * Попутки в крайних полосах часто идут вплотную к обочине (hug) — прижаться к краю и ехать без риска не выйдет.
 */
export const LANE_STEP = 2;
export const EDGE_HUG = [0.3, 0.5]; // насколько крайняя попутка жмётся к обочине (игрок ездит до ±2.5)
export const HUG_CHANCE = 0.6;

/** x центра полосы 0 | 1 | 2 */
export function laneX(lane) { return (lane - 1) * LANE_STEP; }

/** полоса по x (ближайшая) */
export function laneOf(x) { return Math.max(0, Math.min(2, Math.round(x / LANE_STEP + 1))); }

/** Сдвиг попутки к обочине в своей полосе (0 — по центру); rnd — [0,1) */
export function hugFor(lane, rnd) {
    const r = rnd || Math.random;
    if (lane === 1 || r() >= HUG_CHANCE) return 0;
    const v = EDGE_HUG[0] + r() * (EDGE_HUG[1] - EDGE_HUG[0]);
    return lane === 0 ? -v : v;
}

/** x попутки: центр полосы + прижим к обочине */
export function carX(lane, hug) { return laneX(lane) + (hug || 0); }
