/**
 * «Режиссёр» участков: крупные события (разлом, трамплин, ремонт, тоннель, ворота, постановочные сцены, падающий груз)
 * записываются в busy — список занятых отрезков [zLo, zHi]. Правило раннеров: у каждой угрозы один понятный ответ,
 * поэтому рядом с крупным событием не ставится другое крупное (MAJOR_GAP), преграда для прыжка — не ближе HURDLE_GAP,
 * а звери не выбегают, пока крупное событие впереди ближе CALM_AHEAD.
 */
export const MAJOR_GAP = 45;
export const HURDLE_GAP = 22;
export const CALM_AHEAD = 70;

/** Отрезок [lo, hi] свободен с запасом pad от всех занятых */
export function zoneFree(busy, lo, hi, pad) {
    const p = pad || 0;
    return !(busy || []).some(function(b) { return hi + p > b[0] && lo - p < b[1]; });
}
/** Впереди машины (машина едет к −z) ближе ahead — или под ней — крупное событие */
export function calmAhead(busy, z, ahead) {
    const a = ahead == null ? CALM_AHEAD : ahead;
    return (busy || []).some(function(b) { return b[1] > z - a && b[0] < z + 5; });
}
