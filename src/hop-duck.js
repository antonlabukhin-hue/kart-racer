/**
 * Прыжок и подныр — ещё два действия, как в Subway Surfers (свайп вверх / вниз, на ПК — пробел / Shift):
 *   прыжок — машина подскакивает на подвеске (~1 с в воздухе): перелетает трубу поперёк полосы, ямы, шипы, масло;
 *   подныр — машина «приседает» на 0.9 с и проскальзывает под шлагбаумом или низким щитом.
 * Препятствия: 'lowbar' — жёлто-чёрная труба поперёк полос (перепрыгнуть или объехать),
 *              'highbar' — шлагбаум / низкий щит (поднырнуть или объехать; прыжком не перелетишь).
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

/** Столкновение с препятствием: kind, высота машины y, в подныре ли → 'hit' | 'over' | 'under' */
export function hurdleHit(kind, y, isDucking) {
    if (kind === 'lowbar') return y > LOWBAR_H ? 'over' : 'hit';
    if (kind === 'highbar') return isDucking && y < 0.3 ? 'under' : 'hit';
    return 'hit';
}

/**
 * Где на участке [d0, d1) поставить препятствия: [{ d, kind, lanes }] — lanes: занятые полосы (0..2).
 * До FULL_FROM — одна-две полосы (можно объехать), дальше иногда все три (только прыжком или подныром).
 */
export function planHurdles(d0, d1, rnd) {
    const r = rnd || Math.random, out = [];
    for (let d = Math.max(d0, HURDLE_FROM) + r() * 80; d < d1; d += HURDLE_EVERY[0] + r() * (HURDLE_EVERY[1] - HURDLE_EVERY[0])) {
        const kind = r() < 0.5 ? 'lowbar' : 'highbar';
        let lanes;
        if (d > FULL_FROM && r() < 0.35) lanes = [0, 1, 2];
        else { const free = Math.floor(r() * 3); lanes = [0, 1, 2].filter(function(l) { return l !== free && (r() < 0.6 || l === (free + 1) % 3); }); }
        out.push({ d: Math.round(d), kind: kind, lanes: lanes });
    }
    return out;
}

/* ---------- меши (перёд машины — к −z; препятствие поперёк полосы) ---------- */
const mats = {};
function M(hex, o) { const k = hex + (o ? JSON.stringify(o) : ''); return mats[k] || (mats[k] = new THREE.MeshStandardMaterial(Object.assign({ color: hex, roughness: 0.5, metalness: 0.2 }, o || {}))); }
let stripeMat = null;
function STRIPE(dark) {
    if (stripeMat && !dark) return stripeMat;
    if (typeof document === 'undefined') return M(0xf2c81a);
    const cv = document.createElement('canvas'); cv.width = 128; cv.height = 16;
    const c = cv.getContext('2d'); c.fillStyle = '#f2c81a'; c.fillRect(0, 0, 128, 16); c.fillStyle = '#1a1a1a';
    for (let x = 0; x < 128; x += 32) c.fillRect(x, 0, 16, 16);
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping;
    stripeMat = new THREE.MeshStandardMaterial({ map: t, roughness: 0.45, metalness: 0.2, emissive: 0x332200, emissiveIntensity: 0.4 });
    return stripeMat;
}
let redWhite = null;
function RW() {
    if (redWhite) return redWhite;
    if (typeof document === 'undefined') return M(0xd8281e);
    const cv = document.createElement('canvas'); cv.width = 128; cv.height = 16;
    const c = cv.getContext('2d'); c.fillStyle = '#f2f2f2'; c.fillRect(0, 0, 128, 16); c.fillStyle = '#d8281e';
    for (let x = 0; x < 128; x += 32) c.fillRect(x, 0, 16, 16);
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
    redWhite = new THREE.MeshStandardMaterial({ map: t, roughness: 0.4, emissive: 0x220000, emissiveIntensity: 0.4 });
    return redWhite;
}
function box(g, w, h, d, m, x, y, z) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); g.add(b); return b; }

/**
 * Препятствие поперёк полос lanes (центры laneXs) в точке z.
 * lowbar — толстая полосатая труба на опорах (верх ~0.4), highbar — шлагбаум на стойках (низ ~0.62) с мигалками.
 */
export function createHurdle(kind, lanes, laneXs, z, laneW) {
    const g = new THREE.Group(), w = laneW || 2;
    const xs = lanes.map(function(l) { return laneXs[l]; }), x0 = Math.min.apply(null, xs) - w / 2 + 0.1, x1 = Math.max.apply(null, xs) + w / 2 - 0.1;
    const span = x1 - x0, cx = (x0 + x1) / 2;
    const lamps = [];
    if (kind === 'lowbar') {
        const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, span, 16), STRIPE()); pipe.rotation.z = Math.PI / 2; pipe.position.set(cx, 0.3, z); g.add(pipe);
        for (let x = x0 + 0.2; x <= x1 - 0.1; x += Math.max(0.9, span / Math.max(2, Math.round(span / 1.6)))) { box(g, 0.12, 0.22, 0.35, M(0x3a3a40), x, 0.11, z); box(g, 0.5, 0.05, 0.5, M(0x2a2a2e), x, 0.03, z); }
        box(g, span, 0.03, 0.05, M(0x1a1a1a), cx, 0.48, z);                   // кромка
    } else {
        [x0 - 0.15, x1 + 0.15].forEach(function(x) {
            box(g, 0.16, 1.5, 0.16, M(0x5a5a62), x, 0.75, z);                 // стойки
            box(g, 0.3, 0.3, 0.3, M(0x3a3a40), x, 0.15, z);
            const lm = new THREE.MeshStandardMaterial({ color: 0xff2a1a, emissive: 0xff2a1a, emissiveIntensity: 1.5 });
            const l = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), lm); l.position.set(x, 1.6, z); g.add(l); lamps.push(lm);
        });
        box(g, span + 0.3, 0.2, 0.12, RW(), cx, 0.85, z);                      // планка шлагбаума
        box(g, span + 0.3, 0.42, 0.04, M(0xf2f2ee), cx, 1.2, z - 0.02);        // табличка над планкой
        for (let k = 0; k < Math.floor(span / 0.9); k++) box(g, 0.05, 0.3, 0.05, M(0xd8281e), cx - span / 2 + 0.45 + k * 0.9, 0.62, z); // бахрома
    }
    g.userData = { hurdle: kind, lamps: lamps, x0: x0, x1: x1 };
    return g;
}
/** Мигалки шлагбаума */
export function blinkHurdle(g, t) {
    (g.userData.lamps || []).forEach(function(m, i) { m.emissiveIntensity = Math.sin(t * 9 + i * Math.PI) > 0 ? 1.8 : 0.15; });
}
