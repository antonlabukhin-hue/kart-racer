/**
 * Узоры бесконечной трассы (как «куски» в Subway Surfers): заранее придуманные связки препятствий и «Е»
 * с читаемым решением — цепочка «Е» всегда ведёт по свободному пути. planStretch (src/infinite.js) ставит их
 * между случайными одиночками; чем дальше, тем чаще и тем сложнее узоры.
 *
 * Узор: { id, len, minT — с какой сложности (rampAt.t), w — вес, spikes — нужны шипы (только после SPIKES_FROM), items }.
 * items — { dz (вперёд от начала узора), lane 0..2, kind: 'block' (type) | 'echip' | 'crate' }.
 * 'block' перекрывает полосу: шипы — одной лентой, яма/кочка/скользкое пятно — парой (одно пятно узкое, его объедешь в полосе).
 * Логика — чистая (с тестами).
 */

const E = function(lane, from, to) { // цепочка «Е» по полосе от from до to (шаг 2.2)
    const out = [];
    for (let dz = from; dz <= to + 0.01; dz += 2.2) out.push({ dz: dz, lane: lane, kind: 'echip' });
    return out;
};
const B = function(lane, dz, type) { return { dz: dz, lane: lane, kind: 'block', type: type }; };

export const PATTERNS = [
    // коридор: ямы по краям, «Е» — по центру
    { id: 'corridor', len: 30, minT: 0, w: 3, items: [].concat(
        B(0, 0, 'pothole'), B(2, 0, 'pothole'), B(0, 22, 'bump'), B(2, 22, 'bump'), E(1, -6, 26)) },
    // приманка: «Е» ведут в ящик «?», по бокам кочки
    { id: 'bait', len: 16, minT: 0, w: 2, items: [].concat(
        E(1, -4, 8), { dz: 12, lane: 1, kind: 'crate' }, B(0, 12, 'bump'), B(2, 12, 'bump')) },
    // слалом: свободна то одна крайняя полоса, то другая
    { id: 'slalom', len: 50, minT: 0.05, w: 3, items: [].concat(
        B(0, 0, 'slide'), B(1, 0, 'slide'), B(1, 25, 'slide'), B(2, 25, 'slide'), B(0, 50, 'slide'), B(1, 50, 'slide'),
        E(2, -6, 4), E(0, 19, 29), E(2, 44, 54)) },
    // выбор: слева «Е», но в конце масло; справа — ящик; посередине — пусто
    { id: 'choice', len: 20, minT: 0.15, w: 2, items: [].concat(
        E(0, 0, 13), B(0, 18, 'slide'), { dz: 10, lane: 2, kind: 'crate' }) },
    // шлагбаум: шипы в двух полосах, в третьей — «Е» и ящик-награда
    { id: 'gate', len: 16, minT: 0.1, w: 3, spikes: true, items: [].concat(
        B(0, 0, 'spikes'), B(1, 0, 'spikes'), E(2, -10, 6), { dz: 16, lane: 2, kind: 'crate' }) },
    // шикана: короткий перескок из края в край
    { id: 'chicane', len: 18, minT: 0.25, w: 2, items: [].concat(
        B(1, 0, 'pothole'), B(2, 0, 'pothole'), B(0, 18, 'pothole'), B(1, 18, 'pothole'), E(0, -8, 4), E(2, 12, 24)) },
    // шахматка из шипов: центр → край → центр
    { id: 'checker', len: 30, minT: 0.4, w: 2, spikes: true, items: [].concat(
        B(0, 0, 'spikes'), B(2, 0, 'spikes'), B(1, 15, 'spikes'), B(0, 30, 'spikes'), B(2, 30, 'spikes'),
        E(1, -8, 6), E(2, 11, 19), E(1, 24, 36)) },
    // минное поле: ямы в шахматном порядке по всем полосам — проходишь змейкой по «Е»
    { id: 'minefield', len: 40, minT: 0.55, w: 1, items: [].concat(
        B(0, 0, 'pothole'), B(1, 0, 'pothole'), B(2, 13, 'pothole'), B(1, 13, 'pothole'),
        B(0, 26, 'pothole'), B(1, 26, 'pothole'), B(2, 40, 'pothole'), B(1, 40, 'pothole'),
        E(2, -4, 6), E(0, 9, 19), E(2, 22, 32), E(0, 35, 45)) }
];

/** Шаг между узорами: на старте — раз в ~220 м, на потолке сложности — раз в ~100 м */
export const PATTERN_GAP = [220, 100];
export function patternGap(t) {
    const k = Math.max(0, Math.min(1, t || 0));
    return PATTERN_GAP[0] + (PATTERN_GAP[1] - PATTERN_GAP[0]) * k;
}

/** Выбрать узор по сложности t (0..1); spikesOk — шипы уже разрешены. rnd — [0,1) */
export function pickPattern(t, spikesOk, rnd) {
    const r = rnd || Math.random;
    const pool = PATTERNS.filter(function(p) { return p.minT <= (t || 0) && (!p.spikes || spikesOk); });
    const total = pool.reduce(function(s, p) { return s + p.w; }, 0);
    let x = r() * total;
    for (let i = 0; i < pool.length; i++) { x -= pool[i].w; if (x < 0) return pool[i]; }
    return pool[pool.length - 1];
}

/** Ширина «блока» по типу: сколько предметов и где в полосе (смещение от центра полосы) */
const BLOCK_DX = { spikes: [0], pothole: [-0.45, 0.45], bump: [-0.45, 0.45], slide: [-0.5, 0.5] };

/**
 * Разложить узор в предметы плана: d0 — где начинается, mirror — зеркально по полосам, laneX — x центров полос.
 * Возвращает [{ kind, d, lane, x?, type? }] — те же виды, что у planStretch ('obstacle', 'spikes', 'echip', 'crate').
 */
export function expandPattern(p, d0, mirror, laneX) {
    const LX = laneX || [-2, 0, 2];
    const out = [];
    p.items.forEach(function(it) {
        const lane = mirror ? 2 - it.lane : it.lane;
        const d = d0 + it.dz;
        if (it.kind === 'echip') out.push({ kind: 'echip', d: d, lane: lane, y: 0.6 });
        else if (it.kind === 'crate') out.push({ kind: 'crate', d: d, lane: lane });
        else if (it.type === 'spikes') out.push({ kind: 'spikes', d: d, lane: lane });
        // у первого из пары — конус по центру полосы (cone — его x от предмета): издалека видно, что полоса закрыта
        else (BLOCK_DX[it.type] || [0]).forEach(function(dx, k) { out.push({ kind: 'obstacle', d: d, lane: lane, x: LX[lane] + dx, type: it.type, cone: k ? undefined : -dx }); });
    });
    return out;
}

/** Пределы узора по дистанции [от, до] — с учётом «Е» до начала (dz < 0) */
export function patternSpan(p) {
    let lo = 0, hi = p.len;
    p.items.forEach(function(it) { lo = Math.min(lo, it.dz); hi = Math.max(hi, it.dz); });
    return [lo, hi];
}

/**
 * Убрать из плана всё, что попало в занятые места (busy(d) — true), а узор — целиком, если задет хоть один его предмет:
 * обрезанный узор теряет свободный путь.
 */
export function dropBusy(items, busy) {
    const cut = new Set();
    items.forEach(function(it) { if (it.pat && busy(it.d)) cut.add(it.pat); });
    return items.filter(function(it) { return !busy(it.d) && !cut.has(it.pat); });
}

/**
 * Узоры для главы кампании: на участке [from, to] трассы (доли длины len), до босса — с шагом gap (ед.), сложность t (0..1).
 * free(d0, d1) — свободен ли участок трассы (нет разлома, арки, события): узор ищет свободное окно, шагая по 8 ед.
 * Возвращает предметы плана (как planStretch) — их ставит src/plan-place.js. Шипы — только если spikesOk.
 */
export const CHAPTER_T = { easy: 0.1, medium: 0.35, hard: 0.6 };
export function chapterPatterns(len, rnd, o) {
    const r = rnd || Math.random, opt = o || {};
    const from = len * (opt.from != null ? opt.from : 0.07), to = len * (opt.to != null ? opt.to : 0.4), gap = opt.gap || 160;
    const free = opt.free || function() { return true; };
    const out = [];
    let id = opt.patId || 0;
    for (let d = from + r() * 30; d < to; ) {
        const pat = pickPattern(opt.t || 0, !!opt.spikesOk, r), sp = patternSpan(pat);
        while (d + sp[1] + 3 <= to && !free(d + sp[0] - 8, d + sp[1] + 11)) d += 8; // не на разломе, арке, событии
        if (d + sp[1] + 3 > to) break;
        id++;
        expandPattern(pat, d, r() < 0.5).forEach(function(it) { it.pat = id; out.push(it); });
        out.push({ kind: 'patEnd', d: d + pat.len + 3, pat: id, name: pat.id });
        d += sp[1] + gap * (0.8 + r() * 0.4);
    }
    return out;
}
