/**
 * Прыжок и подныр — ещё два действия, как в Subway Surfers (свайп вверх / вниз, на ПК — пробел / Shift):
 *   прыжок — машина подскакивает на подвеске (~1 с в воздухе): перелетает трубу поперёк полосы, ямы, шипы, масло;
 *   подныр — машина «приседает» на 0.9 с и проскальзывает под шлагбаумом или низким щитом.
 * Препятствия — HURDLES ниже: для прыжка (труба, бревно, отбойник, покрышки) и для подныра (шлагбаум, габаритная рама, трубопровод).
 * Чистые функции (с тестами); меши — createHurdle; main.js — ввод, физика, столкновения.
 */
import * as THREE from 'three';

export const HOP_V = 4.6;        // вертикальная скорость прыжка: пик ~1.1 (GRAVITY 9.5 в src/race-physics.js)
export const DUCK_TIME = 0.9;    // сек подныра
export const DUCK_SCALE = 0.55;  // высота машины в подныре
export const LOWBAR_H = 0.45;    // выше — пролетел над трубой
export const HURDLE_FROM = 450;  // ед. от старта — раньше новичку не попадаются
export const HURDLE_EVERY = [170, 260];
export const FULL_FROM = 1200;   // дальше — бывают через всю дорогу (только действием)

export function createMoves() { return { duckT: 0, hop: false }; }
/** Подныр: можно всегда на земле; в воздухе — нет */
export function duck(st, airborne) { if (airborne) return false; st.duckT = DUCK_TIME; return true; }
/** Прыжок: только с земли и не в подныре — вернёт вертикальную скорость или 0 */
export function hop(st, onGround) { if (!onGround) return 0; st.duckT = 0; st.hop = true; return HOP_V; }
export function tickMoves(st, dt) { if (st.duckT > 0) st.duckT = Math.max(0, st.duckT - dt); }
export function ducking(st) { return st.duckT > 0; }
/** Высота машины в подныре (плавно: присела за 0.1 с, встала за 0.15 с) */
export function duckScale(st) {
    if (st.duckT <= 0) return 1;
    const inK = Math.min(1, (DUCK_TIME - st.duckT) / 0.1), outK = Math.min(1, st.duckT / 0.15);
    return 1 - (1 - DUCK_SCALE) * Math.min(inK, outK);
}

/**
 * Препятствия — каждое читается однозначно:
 *   ПРЫЖОК (act 'jump') — сплошное и низкое, от самой земли, над ним пусто: под ним не пролезть, а перелететь — легко;
 *   ПОДНЫР (act 'duck') — высокая конструкция (до 2.5 м) с просветом ТОЛЬКО внизу: перепрыгнуть нельзя, поднырнуть — да.
 */
export const HURDLES = {
    pipe: { act: 'jump', name: 'Труба' },
    log: { act: 'jump', name: 'Бревно' },
    jersey: { act: 'jump', name: 'Отбойник' },
    tires: { act: 'jump', name: 'Покрышки' },
    barrier: { act: 'duck', name: 'Шлагбаум' },
    gantry: { act: 'duck', name: 'Габаритная рама' },
    pipeline: { act: 'duck', name: 'Трубопровод' }
};
export const JUMP_KINDS = Object.keys(HURDLES).filter(function(k) { return HURDLES[k].act === 'jump'; });
export const DUCK_KINDS = Object.keys(HURDLES).filter(function(k) { return HURDLES[k].act === 'duck'; });
/** Что нужно сделать: 'jump' | 'duck' (старые имена lowbar/highbar — тоже) */
export function actOf(kind) { return kind === 'lowbar' ? 'jump' : kind === 'highbar' ? 'duck' : (HURDLES[kind] ? HURDLES[kind].act : 'jump'); }

/** Столкновение: высота машины y, в подныре ли → 'hit' | 'over' | 'under' */
export function hurdleHit(kind, y, isDucking) {
    if (actOf(kind) === 'jump') return y > LOWBAR_H ? 'over' : 'hit';
    return isDucking && y < 0.3 ? 'under' : 'hit';
}

/**
 * Где на участке [d0, d1) поставить препятствия: [{ d, kind, lanes }] — lanes: занятые полосы (0..2).
 * До FULL_FROM — одна-две полосы (можно объехать), дальше иногда все три (только прыжком или подныром).
 */
export function planHurdles(d0, d1, rnd) {
    const r = rnd || Math.random, out = [];
    for (let d = Math.max(d0, HURDLE_FROM) + r() * 80; d < d1; d += HURDLE_EVERY[0] + r() * (HURDLE_EVERY[1] - HURDLE_EVERY[0])) {
        const list = r() < 0.5 ? JUMP_KINDS : DUCK_KINDS, kind = list[Math.floor(r() * list.length) % list.length];
        let lanes;
        if (d > FULL_FROM && r() < 0.35) lanes = [0, 1, 2];
        else { const free = Math.floor(r() * 3); lanes = [0, 1, 2].filter(function(l) { return l !== free && (r() < 0.6 || l === (free + 1) % 3); }); }
        out.push({ d: Math.round(d), kind: kind, lanes: lanes });
    }
    return out;
}

/* ---------- меши (перёд машины — к −z; препятствие поперёк полос) ---------- */
const mats = {};
function M(hex, o) { const k = hex + (o ? JSON.stringify(o) : ''); return mats[k] || (mats[k] = new THREE.MeshStandardMaterial(Object.assign({ color: hex, roughness: 0.55, metalness: 0.15 }, o || {}))); }
const tex = {};
/** Полосатая текстура: цвета a/b, n полос */
function STRIPES(a, b, n, emissive) {
    const k = a + b + n;
    if (tex[k]) return tex[k];
    if (typeof document === 'undefined') return (tex[k] = M(parseInt(a.slice(1), 16)));
    const cv = document.createElement('canvas'); cv.width = 128; cv.height = 16;
    const c = cv.getContext('2d'); c.fillStyle = a; c.fillRect(0, 0, 128, 16); c.fillStyle = b;
    for (let i = 0; i < n; i++) c.fillRect(i * 128 / n, 0, 64 / n, 16);
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
    return (tex[k] = new THREE.MeshStandardMaterial({ map: t, roughness: 0.45, metalness: 0.15, emissive: emissive || 0x000000, emissiveIntensity: 0.35 }));
}
/** Табличка с текстом (белая, красная кайма) */
function SIGN(text, sub) {
    const k = 'sign' + text + sub;
    if (tex[k]) return tex[k];
    if (typeof document === 'undefined') return (tex[k] = M(0xf2f2ee));
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 128;
    const c = cv.getContext('2d'); c.fillStyle = '#f4f4ee'; c.fillRect(0, 0, 256, 128);
    c.strokeStyle = '#d8281e'; c.lineWidth = 14; c.strokeRect(7, 7, 242, 114);
    c.fillStyle = '#1a1a1a'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = 'bold 44px Arial'; c.fillText(text, 128, sub ? 50 : 66, 220);
    if (sub) { c.font = 'bold 26px Arial'; c.fillStyle = '#d8281e'; c.fillText(sub, 128, 94, 220); }
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
    return (tex[k] = new THREE.MeshStandardMaterial({ map: t, roughness: 0.5, emissive: 0x222222, emissiveIntensity: 0.3 }));
}
function box(g, w, h, d, m, x, y, z, rz) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); if (rz) b.rotation.z = rz; g.add(b); return b; }
function cylX(g, r, len, m, x, y, z, seg) { const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg || 14), m); c.rotation.z = Math.PI / 2; c.position.set(x, y, z); g.add(c); return c; }
function lamp(g, lamps, x, y, z, hex) {
    const lm = new THREE.MeshStandardMaterial({ color: hex || 0xff2a1a, emissive: hex || 0xff2a1a, emissiveIntensity: 1.5 });
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), lm); l.position.set(x, y, z); g.add(l); lamps.push(lm);
}

const BUILD = {
    // ---- прыжок: от земли, низко, над ним пусто ----
    pipe: function(g, x0, x1, z) {
        const span = x1 - x0, cx = (x0 + x1) / 2;
        cylX(g, 0.18, span, STRIPES('#f2c81a', '#1a1a1a', 4, 0x332200), cx, 0.22, z, 16);
        for (let x = x0 + 0.25; x < x1; x += Math.max(0.9, span / 3)) { box(g, 0.14, 0.12, 0.42, M(0x3a3a40), x, 0.06, z); }
    },
    log: function(g, x0, x1, z) {
        const span = x1 - x0, cx = (x0 + x1) / 2;
        cylX(g, 0.24, span, M(0x6a4a2a, { roughness: 0.9 }), cx, 0.24, z, 12);
        for (let k = 0; k < Math.floor(span / 0.7); k++) cylX(g, 0.25, 0.06, M(0x4a321a), x0 + 0.35 + k * 0.7, 0.24, z, 12); // кора-кольца
        [x0, x1].forEach(function(x) { cylX(g, 0.22, 0.02, M(0xd8b078), x, 0.24, z, 12); }); // светлые спилы
        box(g, 0.08, 0.3, 0.06, M(0x4a321a), cx + 0.6, 0.48, z - 0.05, 0.6);                   // сучок
    },
    jersey: function(g, x0, x1, z) {
        const span = x1 - x0;
        for (let x = x0; x < x1 - 0.1; x += 1.0) {
            const w = Math.min(0.96, x1 - x);
            box(g, w, 0.18, 0.55, M(0xc8c4bc, { roughness: 0.9 }), x + w / 2, 0.09, z);       // основание
            box(g, w, 0.24, 0.3, STRIPES('#d8281e', '#f2f2ee', 2), x + w / 2, 0.3, z);       // верх красно-белый
        }
    },
    tires: function(g, x0, x1, z) {
        for (let x = x0 + 0.3; x < x1 - 0.1; x += 0.55) {
            const t = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.1, 8, 16), M(0x1a1a1c, { roughness: 0.95 }));
            t.rotation.x = Math.PI / 2; t.position.set(x, 0.1, z); g.add(t);
            const t2 = t.clone(); t2.position.y = 0.3; t2.position.x += 0.04; g.add(t2);
            if (Math.round(x * 2) % 3 === 0) { const t3 = t.clone(); t3.position.y = 0.5; g.add(t3); }
        }
    },
    // ---- подныр: высокая конструкция, просвет только внизу ----
    barrier: function(g, x0, x1, z, lamps) {
        const span = x1 - x0, cx = (x0 + x1) / 2;
        [x0 - 0.2, x1 + 0.2].forEach(function(x) { box(g, 0.18, 2.6, 0.18, M(0x5a5a62), x, 1.3, z); box(g, 0.34, 0.3, 0.34, M(0x3a3a40), x, 0.15, z); lamp(g, lamps, x, 2.7, z); });
        box(g, span + 0.4, 0.22, 0.12, STRIPES('#f2f2f2', '#d8281e', 6, 0x220000), cx, 0.85, z);   // планка шлагбаума
        for (let k = 0; k < Math.floor(span / 0.6); k++) box(g, 0.05, 0.22, 0.04, M(0xd8281e), x0 + 0.3 + k * 0.6, 0.65, z); // бахрома
        box(g, span + 0.4, 1.35, 0.08, SIGN('СТОП', 'ПРОЕЗД ПОД ШЛАГБАУМОМ'), cx, 1.75, z - 0.02); // щит над планкой — сплошной до 2.4
    },
    gantry: function(g, x0, x1, z, lamps) {
        const span = x1 - x0, cx = (x0 + x1) / 2;
        [x0 - 0.2, x1 + 0.2].forEach(function(x) { box(g, 0.24, 2.6, 0.24, STRIPES('#f2c81a', '#1a1a1a', 6), x, 1.3, z); lamp(g, lamps, x, 2.7, z, 0xffa020); });
        box(g, span + 0.5, 0.3, 0.3, STRIPES('#f2c81a', '#1a1a1a', 8, 0x332200), cx, 0.95, z);  // нижняя балка
        box(g, span + 0.5, 1.2, 0.1, SIGN('ГАБАРИТ', '1,5 м'), cx, 1.75, z - 0.03);              // щит
        for (let k = 0; k < Math.floor(span / 0.35); k++) box(g, 0.03, 0.18, 0.03, M(0x8a8a90, { metalness: 0.6 }), x0 + 0.2 + k * 0.35, 0.72, z); // цепочки
    },
    pipeline: function(g, x0, x1, z, lamps) {
        const span = x1 - x0, cx = (x0 + x1) / 2;
        [x0 - 0.25, x1 + 0.25].forEach(function(x) { box(g, 0.3, 2.5, 0.5, M(0x8a8c90, { metalness: 0.4 }), x, 1.25, z); lamp(g, lamps, x, 2.6, z); });
        [[0.98, 0.2, 0x5a6a7a], [1.42, 0.24, 0x7a8a6a], [1.92, 0.26, 0x8a5a3a], [2.35, 0.17, 0x5a6a7a]].forEach(function(p, i) { cylX(g, p[1], span + 0.8, M(p[2], { metalness: 0.45, roughness: 0.4 }), cx, p[0], z + (i % 2 ? 0.08 : -0.08), 14); });
        box(g, span + 0.8, 0.12, 0.62, STRIPES('#f2c81a', '#1a1a1a', 8, 0x332200), cx, 0.78, z);  // жёлто-чёрная кромка снизу
        [-0.3, 0.3].forEach(function(dz) { box(g, span + 0.8, 0.05, 0.05, M(0x3a3a40), cx, 2.55, z + dz); });
    }
};

/** Препятствие kind поперёк полос lanes (центры laneXs) в точке z */
export function createHurdle(kind, lanes, laneXs, z, laneW) {
    const k = kind === 'lowbar' ? 'pipe' : kind === 'highbar' ? 'barrier' : (BUILD[kind] ? kind : 'pipe');
    const g = new THREE.Group(), w = laneW || 2, lamps = [];
    const xs = lanes.map(function(l) { return laneXs[l]; }), x0 = Math.min.apply(null, xs) - w / 2 + 0.1, x1 = Math.max.apply(null, xs) + w / 2 - 0.1;
    BUILD[k](g, x0, x1, z, lamps);
    g.userData = { hurdle: k, act: actOf(k), lamps: lamps, x0: x0, x1: x1 };
    return g;
}
/** Мигалки */
export function blinkHurdle(g, t) {
    (g.userData.lamps || []).forEach(function(m, i) { m.emissiveIntensity = Math.sin(t * 9 + i * Math.PI) > 0 ? 1.8 : 0.15; });
}

/**
 * Подсказка полосы (стрелки ← → в первых заездах): впереди на полосе игрока помеха — куда уйти.
 * threats — [{ x, z }] попутки и препятствия; машина едет к −z. Возвращает 'left' | 'right' | null.
 * Свободная соседняя полоса — без помех рядом; обе свободны — ближе к середине дороги.
 */
export function laneAdvice(x, z, threats, laneW) {
    const W = laneW || 2, ahead = function(t) { return z - t.z; };
    const inLane = function(lx, t, lo, hi) { const a = ahead(t); return Math.abs(t.x - lx) < W * 0.5 && a > lo && a < hi; };
    const blocked = threats.some(function(t) { return inLane(x, t, 6, 26); });
    if (!blocked) return null;
    const free = [-1, 1].filter(function(s) {
        const lx = x + s * W;
        return Math.abs(lx) <= W * 1.05 && !threats.some(function(t) { return inLane(lx, t, -3, 30); });
    });
    if (!free.length) return null;
    if (free.length === 2) return x > 0.1 ? 'left' : x < -0.1 ? 'right' : 'left';
    return free[0] < 0 ? 'left' : 'right';
}
