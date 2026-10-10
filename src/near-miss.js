/**
 * «На волоске» — уворот в последний момент: помеха была на твоей полосе впереди (ближе THREAT_AHEAD),
 * ты ушёл в соседнюю, и она прошла рядом. Раньше считалось только «впритирку сбоку» (< ~1.2 м по x) —
 * а по центру соседней полосы зазор 2 м, и со свайпами «на волоске» почти не срабатывал.
 * Старое правило тоже работает: проскочил совсем близко — засчитано.
 * o — попутка или зверь (сюда пишутся _thr и _nm); dx = x игрока − x помехи; dz = z игрока − z помехи
 * (> 0 — помеха впереди); hw — полуширина столкновения; now — время заезда, с.
 */
export const THREAT_AHEAD = 14;
export const THREAT_MEMORY = 0.9;
export const ADJ_LANE = 2.6;

export function nearMissStep(o, dx, dz, hw, now) {
    if (dz > 6) o._nm = false; // попутку переставили вперёд — снова может дать «на волоске»
    if (dz > 0.5 && dz < THREAT_AHEAD && Math.abs(dx) < hw + 0.35) o._thr = now; // на твоей полосе, впереди
    if (o._nm || !(dz < -0.6 && dz > -3)) return false;
    const close = Math.abs(dx) < hw + 0.75;
    const dodged = o._thr != null && now - o._thr < THREAT_MEMORY && Math.abs(dx) < ADJ_LANE;
    if (close || dodged) { o._nm = true; return true; }
    return false;
}
