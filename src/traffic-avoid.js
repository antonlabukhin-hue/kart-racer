/**
 * Попутки не едут сквозь трамплины, ремонт и разломы: заранее перестраиваются, а разлом перепрыгивают с трамплина.
 * Дёшево: на машину — проход по нескольким спискам (их на трассе единицы), без физики. Логика — чистая (с тестами).
 * z уменьшается по ходу движения; полосы 0..2 (src/traffic-lanes.js laneOf).
 */
import { laneOf } from './traffic-lanes.js';

export const LOOK = 40;      // за сколько единиц до помехи машина начинает перестраиваться
export const JUMP_H = 1.3;   // высота прыжка через разлом

/** Свободная соседняя полоса, не busy (средняя — к любой стороне) */
function otherLane(lane, busy) {
    const opts = lane === 1 ? [0, 2] : [1];
    return opts.find(function(l) { return busy.indexOf(l) < 0; });
}

/**
 * Что делать машине на полосе lane в точке z: { lane — в какую перестроиться (или null), y — высота над дорогой }.
 * h — { gaps: [{ zNear, zFar, lanes }], ramps: [{ x, z, gapRamp }], works: [{ type, z0, z1, x }] }
 */
export function trafficPlan(z, lane, h) {
    let target = null, y = 0;
    (h.gaps || []).forEach(function(g) {
        if (!(z < g.zNear + LOOK && z > g.zFar - 2)) return;
        const rl = g.lanes && g.lanes.length ? g.lanes[0] : 1;
        if (lane !== rl && z > g.zNear + 6) target = rl; // к трамплину
        const a = g.zNear + 3, b = g.zFar - 1;            // от трамплина — через разлом
        if (z <= a && z >= b) y = Math.sin((a - z) / (a - b) * Math.PI) * JUMP_H;
    });
    if (target == null) (h.works || []).forEach(function(w) {
        if (w.type !== 'roadworks' || !(z < w.z0 + LOOK && z > w.z1 - 2)) return;
        if (laneOf(w.x) === lane) { const l = otherLane(lane, [laneOf(w.x)]); if (l != null) target = l; }
    });
    if (target == null) (h.ramps || []).forEach(function(r) {
        if (r.gapRamp || !(z < r.z + 25 && z > r.z - 2)) return;
        if (laneOf(r.x) === lane) { const l = otherLane(lane, [laneOf(r.x)]); if (l != null) target = l; }
    });
    return { lane: target, y: y };
}
