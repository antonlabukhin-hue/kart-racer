/**
 * Безумный транспорт на 10 секунд (как механический дракон в Jetpack Joyride): редкий жетон 🚜 на трассе —
 * машина игрока на время становится трактором-тараном, самосвалом или «кукурузником».
 *   трактор  — сносит попутки и препятствия, звенит «Е» за каждый снос;
 *   самосвал — то же, а за каждый снос из кузова вылетает ещё «Е»;
 *   кукурузник — летит над дорогой: аварий нет, «Е» в воздухе собираются.
 * Аварий в это время нет (как «В УДАРЕ»). Чистая логика (выбор, таймер, награды) — с тестами; модели — коробки.
 */
import * as THREE from 'three';
import { mergeCarParts } from './merge-static.js';

export const RIDE_TIME = 10;
export const RIDE_EVERY = [1400, 2200]; // ед. между жетонами в бесконечной трассе
export const RIDES = {
    tractor: { icon: '🚜', name: 'ТРАКТОР-ТАРАН', sub: 'Сноси всё на пути!', ramE: 3 },
    dumper: { icon: '🚛', name: 'САМОСВАЛ', sub: 'Сносишь — из кузова сыплются «Е»', ramE: 6 },
    plane: { icon: '✈', name: 'КУКУРУЗНИК', sub: 'Летишь над пробками', ramE: 0, fly: true }
};
export const RIDE_IDS = Object.keys(RIDES);

export function pickRide(rnd, prev) {
    const r = rnd || Math.random, list = RIDE_IDS.filter(function(id) { return id !== prev; });
    return list[Math.floor(r() * list.length) % list.length];
}
/** Состояние: { id, t } — t секунд осталось */
export function createRideState() { return { id: null, t: 0, last: null }; }
export function startRide(st, id) { st.id = id; st.t = RIDE_TIME; st.last = id; return RIDES[id]; }
/** Шаг: вернёт true в момент окончания */
export function tickRide(st, dt) {
    if (!st.id) return false;
    st.t -= dt;
    if (st.t <= 0) { st.id = null; st.t = 0; return true; }
    return false;
}
export function rideOn(st) { return !!(st && st.id); }
/** Высота полёта «кукурузника»: взлёт и посадка по 0.8 с */
export function rideLift(st) {
    if (!st || !st.id || !RIDES[st.id].fly) return 0;
    const up = Math.min(1, (RIDE_TIME - st.t) / 0.8), down = Math.min(1, st.t / 0.8);
    return 1.4 * Math.min(up, down); // ниже моста (src/railway.js DECK_Y) — пролетает под ним
}

/* ---------- модели (перёд — к −z, в масштабе машины игрока до уменьшения) ---------- */
const mats = {};
function M(hex, o) { const k = hex + (o ? JSON.stringify(o) : ''); return mats[k] || (mats[k] = new THREE.MeshStandardMaterial(Object.assign({ color: hex, roughness: 0.6 }, o || {}))); }
function box(g, w, h, d, m, x, y, z) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); g.add(b); return b; }
function wheel(g, r, w, x, y, z, hub) {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(r, r, w, 14), M(0x161616, { roughness: 0.95 })); t.rotation.z = Math.PI / 2; t.position.set(x, y, z); g.add(t);
    const h = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.5, r * 0.5, w + 0.02, 10), M(hub)); h.rotation.z = Math.PI / 2; h.position.set(x, y, z); g.add(h);
}

function tractor() {
    const g = new THREE.Group(), body = M(0xd83a2a), dark = M(0x222428), glass = M(0x1c2a36, { roughness: 0.2 });
    box(g, 0.75, 0.55, 1.6, body, 0, 0.95, -0.35);
    box(g, 1.1, 1.1, 1.0, body, 0, 1.55, 0.6); box(g, 1.12, 0.7, 0.85, glass, 0, 1.7, 0.6); box(g, 1.2, 0.08, 1.1, body, 0, 2.15, 0.6);
    box(g, 0.1, 0.8, 0.1, dark, 0.25, 1.6, -0.75);
    box(g, 2.0, 0.7, 0.18, M(0xe8c040, { metalness: 0.5, roughness: 0.4 }), 0, 0.55, -1.45); // отвал-таран
    [-0.8, 0.8].forEach(function(x) { box(g, 0.1, 0.1, 0.5, dark, x * 0.6, 0.6, -1.15); });
    wheel(g, 0.75, 0.45, -0.8, 0.75, 0.55, 0xe8c040); wheel(g, 0.75, 0.45, 0.8, 0.75, 0.55, 0xe8c040);
    wheel(g, 0.42, 0.3, -0.6, 0.42, -0.8, 0xe8c040); wheel(g, 0.42, 0.3, 0.6, 0.42, -0.8, 0xe8c040);
    box(g, 0.6, 0.15, 0.04, M(0xff1a10), 0, 1.2, 1.12);
    return g;
}
function dumper() {
    const g = new THREE.Group(), cab = M(0xf0a020), dark = M(0x2a2a2e), glass = M(0x1c2a36, { roughness: 0.2 });
    box(g, 1.3, 1.1, 1.1, cab, 0, 1.25, -1.2); box(g, 1.32, 0.5, 0.9, glass, 0, 1.45, -1.2); box(g, 1.1, 0.25, 0.05, dark, 0, 0.95, -1.76);
    box(g, 1.4, 0.3, 3.4, dark, 0, 0.6, 0);
    box(g, 1.5, 0.9, 2.2, M(0x7a6a5a), 0, 1.25, 0.65); // кузов
    box(g, 1.4, 0.25, 2.0, M(0xffd23c, { emissive: 0xb88a10, emissiveIntensity: 0.4 }), 0, 1.75, 0.65); // гора «Е»-золота
    [[-1.3], [0.2], [1.2]].forEach(function(z) { wheel(g, 0.5, 0.35, -0.75, 0.5, z[0], 0x8a8a90); wheel(g, 0.5, 0.35, 0.75, 0.5, z[0], 0x8a8a90); });
    box(g, 1.5, 0.1, 0.1, M(0xc8ccd2), 0, 0.45, -1.8);
    [-0.5, 0.5].forEach(function(x) { box(g, 0.2, 0.1, 0.04, M(0xff1a10), x, 0.7, 1.76); });
    return g;
}
function plane() {
    const g = new THREE.Group(), body = M(0x3a8a5a), wing = M(0xd8d0b0), dark = M(0x2a2a2a);
    box(g, 0.7, 0.75, 3.0, body, 0, 1.0, 0);
    box(g, 0.5, 0.45, 0.9, M(0x1c2a36, { roughness: 0.2 }), 0, 1.5, -0.2);
    box(g, 4.6, 0.08, 0.9, wing, 0, 1.55, -0.4); box(g, 4.0, 0.08, 0.8, wing, 0, 0.65, -0.4); // биплан
    [-1.6, 1.6].forEach(function(x) { box(g, 0.05, 0.9, 0.05, dark, x, 1.1, -0.4); });
    box(g, 1.6, 0.06, 0.5, wing, 0, 1.1, 1.35); box(g, 0.06, 0.6, 0.5, body, 0, 1.4, 1.35); // хвост
    const prop = box(g, 1.3, 0.12, 0.04, dark, 0, 1.0, -1.55); prop.userData.noMerge = true;
    wheel(g, 0.22, 0.12, -0.55, 0.22, -0.6, 0xc8ccd2); wheel(g, 0.22, 0.12, 0.55, 0.22, -0.6, 0xc8ccd2);
    g.userData.prop = prop;
    return g;
}
export function createRideModel(id) {
    const g = id === 'tractor' ? tractor() : id === 'dumper' ? dumper() : plane();
    try { mergeCarParts(g); } catch (e) {}
    g.userData.ride = id;
    return g;
}

/** Жетон 🚜 на трассе: светящийся круг с иконкой (как усиления) */
let tokenMat = null;
export function createRideToken() {
    if (!tokenMat) {
        const cv = document.createElement('canvas'); cv.width = cv.height = 128;
        const c = cv.getContext('2d');
        const gr = c.createRadialGradient(64, 64, 10, 64, 64, 64);
        gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(0.65, 'rgba(255,120,60,0.7)'); gr.addColorStop(1, 'rgba(255,90,40,0)');
        c.fillStyle = gr; c.fillRect(0, 0, 128, 128);
        c.lineWidth = 8; c.strokeStyle = '#ff5a2a'; c.beginPath(); c.arc(64, 64, 46, 0, Math.PI * 2); c.stroke();
        c.font = '58px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('🚜', 64, 68);
        const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.userData.keep = true;
        tokenMat = new THREE.SpriteMaterial({ map: t, depthWrite: false });
    }
    const grp = new THREE.Group(); const s = new THREE.Sprite(tokenMat); s.scale.set(1.6, 1.6, 1); grp.add(s);
    return grp;
}
