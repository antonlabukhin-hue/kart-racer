/**
 * Попутки не едут сквозь трамплины и ремонт — заранее перестраиваются; разлом перелетают прыжком из своей полосы
 * (в полосу трамплина не лезут — она для игрока).
 * Дёшево: на машину — проход по нескольким спискам (их на трассе единицы), без физики. Логика — чистая (с тестами).
 * z уменьшается по ходу движения; полосы 0..2 (src/traffic-lanes.js laneOf).
 */
import { laneOf } from './traffic-lanes.js';

export const LOOK = 40;      // за сколько единиц до помехи машина начинает перестраиваться
export const JUMP_H = 1.3;   // высота прыжка через разлом
export const RAMP_START = 5; // прыжок начинается от начала трамплина перед разломом (он стоит на zNear+0.8…+4.8), а не внутри него

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
        // полоса трамплина — только для игрока: из неё заранее уходим (иначе машины толпятся на трамплине и проезда нет),
        // в неё не перестраиваемся (laneBlocked); остальные полосы разлом перелетают прыжком
        const ramps = g.lanes || [];
        if (target == null && ramps.indexOf(lane) >= 0) { const l = [lane - 1, lane + 1, lane - 2, lane + 2].find(function(x) { return x >= 0 && x <= 2 && ramps.indexOf(x) < 0; }); if (l != null) target = l; }
        const a = g.zNear + RAMP_START, b = g.zFar - 1;   // от начала трамплина — через разлом: дуга всё время над плитой
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

/**
 * Куда поставить попутку, которую переносят вперёд (z уменьшается по ходу): не над разломом и не на трамплин в её полосе —
 * иначе она стоит над провалом или внутри плиты и на следующем кадре «взлетает». Сдвигаем дальше по дороге.
 */
export function freeZ(z, lane, h) {
    for (let guard = 0; guard < 8; guard++) {
        let moved = false;
        (h.gaps || []).forEach(function(g) { if (z <= g.zNear + RAMP_START + 1 && z >= g.zFar - 2) { z = g.zFar - 3; moved = true; } });
        (h.ramps || []).forEach(function(r) { if (laneOf(r.x) === lane && z <= r.z + 3 && z >= r.z - 3) { z = r.z - 4; moved = true; } });
        if (!moved) break;
    }
    return z;
}

/** Полоса lane занята трамплином или ремонтом впереди — перестраиваться в неё нельзя */
export function laneBlocked(z, lane, h) {
    return trafficPlan(z, lane, h).lane != null;
}
