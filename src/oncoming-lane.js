/**
 * «Встречка ×2» (бесконечная трасса): левая полоса на участке становится встречной — как обгон по встречке на наших дорогах.
 *   табличка «ВСТРЕЧКА ×2» за 70 м, красная разметка со стрелками по полосе, встречные машины моргают фарами;
 *   едешь по встречке — очки риска капают и рисковые действия дают вдвое больше, по полосе — цепочка «Е»;
 *   разъехался впритирку — «на волоске» (src/near-miss.js); лоб в лоб — авария. Обычные попутки уходят из этой полосы
 *   (src/traffic-avoid.js: участок type 'oncoming').
 * Участки — по дистанции, без случайности (одинаковы в «Заезде дня» и вызове): первый на ONC_FROM, дальше каждые ONC_EVERY.
 * Чистая логика (план, «в полосе ли») — с тестами; меши (машины-коробки, разметка, табличка) — здесь же.
 */
import * as THREE from 'three';

export const ONC_FROM = 1100;   // м: первая встречка — когда уже освоился
export const ONC_EVERY = 1500;  // м между началами участков
export const ONC_LEN = 230;     // м — длина участка
export const ONC_SIGN = 70;     // м — табличка до начала
export const ONC_V = 13;        // ед./с — скорость встречных (к игроку, +z)
export const ONC_POINTS = 30;   // очков риска в секунду на встречке (× множитель)
export const ONC_LANE = 0;      // левая полоса

/** Участок с номером k: { k, d0, d1, cars: [смещения машин от начала, м] } — машины расставлены детерминированно */
export function oncSection(k) {
    const d0 = ONC_FROM + k * ONC_EVERY;
    const h = function(i) { const x = Math.sin((k + 1) * 91.7 + i * 12.9898) * 43758.5453; return x - Math.floor(x); };
    const cars = [];
    for (let dz = 60 + h(0) * 30, i = 1; dz < ONC_LEN + 140; dz += 55 + h(i) * 35, i++) cars.push(Math.round(dz));
    return { k: k, d0: d0, d1: d0 + ONC_LEN, cars: cars };
}
/** Номер участка, который надо поставить, когда проехано dist (заранее на ahead м) */
export function oncIndexAt(dist, ahead) {
    const d = (dist || 0) + (ahead || 0) - ONC_FROM + ONC_SIGN;
    return d < 0 ? -1 : Math.floor(d / ONC_EVERY);
}
/** Игрок на встречке: x — в левой полосе, z — внутри участка (z0 > z > z1, трасса к −z) */
export function inOncoming(x, z, sec, laneX) {
    return !!sec && z <= sec.z0 && z >= sec.z1 && Math.abs(x - laneX) < 1;
}

function box(g, color, x, y, z, w, h, l, basic) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, l), basic ? new THREE.MeshBasicMaterial({ color: color }) : new THREE.MeshStandardMaterial({ color: color, roughness: 0.6 }));
    m.position.set(x, y, z); g.add(m); return m;
}
const COLORS = [0x2a5ad0, 0xe0e0d8, 0x3a8a3a, 0xc8a020, 0x6a2a8a, 0x9a1a1a];
function oncomingCar(i) { // жигули-коробка мордой к игроку (+z), с моргающими фарами
    const g = new THREE.Group(), c = COLORS[i % COLORS.length];
    box(g, c, 0, 0.42, 0, 1.15, 0.38, 2.2); box(g, c, 0, 0.78, -0.1, 1.0, 0.36, 1.1);
    box(g, 0x223040, 0, 0.8, 0.46, 0.95, 0.26, 0.04);
    const lights = [box(g, 0xfff4c0, -0.38, 0.45, 1.11, 0.26, 0.14, 0.03, true), box(g, 0xfff4c0, 0.38, 0.45, 1.11, 0.26, 0.14, 0.03, true)];
    [[-0.55, 0.7], [0.55, 0.7], [-0.55, -0.7], [0.55, -0.7]].forEach(function(q) { box(g, 0x151515, q[0], 0.2, q[1], 0.12, 0.38, 0.38); });
    g.userData.lights = lights; g.userData.dynamic = true;
    g.traverse(function(o) { o.userData.dynamic = true; });
    return g;
}
let _arrowTex = null;
function arrowTexture() {
    if (_arrowTex || typeof document === 'undefined') return _arrowTex;
    const c = document.createElement('canvas'); c.width = 64; c.height = 256;
    const x = c.getContext('2d');
    x.fillStyle = 'rgba(220,40,30,0.5)'; x.fillRect(0, 0, 64, 256);
    x.fillStyle = 'rgba(255,240,230,0.85)';
    for (let k = 0; k < 2; k++) { const y = 40 + k * 128; x.beginPath(); x.moveTo(32, y + 50); x.lineTo(12, y + 10); x.lineTo(24, y + 10); x.lineTo(24, y - 30); x.lineTo(40, y - 30); x.lineTo(40, y + 10); x.lineTo(52, y + 10); x.closePath(); x.fill(); } // стрелки к игроку
    _arrowTex = new THREE.CanvasTexture(c); _arrowTex.wrapT = THREE.RepeatWrapping; _arrowTex.userData.keep = true;
    return _arrowTex;
}
function signBoard() {
    const c = document.createElement('canvas'); c.width = 256; c.height = 128;
    const x = c.getContext('2d');
    x.fillStyle = '#d8281e'; x.fillRect(0, 0, 256, 128); x.fillStyle = '#fff'; x.fillRect(8, 8, 240, 112); x.fillStyle = '#d8281e';
    x.font = 'bold 40px Arial'; x.textAlign = 'center'; x.fillText('ВСТРЕЧКА', 128, 58); x.font = 'bold 44px Arial'; x.fillText('×2', 128, 106);
    const g = new THREE.Group(), t = new THREE.CanvasTexture(c);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(2, 1), new THREE.MeshBasicMaterial({ map: t }));
    m.position.y = 2.3; g.add(m);
    box(g, 0x555555, 0, 1.0, -0.03, 0.08, 2.0, 0.08);
    g.userData.dispose = function() { t.dispose(); };
    return g;
}

/**
 * o: { scene, laneX (x центров полос), works (список участков дороги — туда кладём { type: 'oncoming', z0, z1, x }), lite }
 * → { spawn(k, z0), update(dt, x, z) → { hit: car|null, near: [{ car, dx, dz }], inLane, sec }, cars, active, dispose() }
 */
export function createOncomingLane(o) {
    const scene = o.scene, lx = o.laneX[ONC_LANE];
    const pool = [];
    for (let i = 0; i < 6; i++) { const m = oncomingCar(i); m.visible = false; scene.add(m); pool.push({ mesh: m, x: lx, z: 0, on: false, hitCooldown: 0, hitW: 0.9, kind: 'oncoming' }); }
    // разметка и табличка — создаются сразу, вместе со сценой (добавленное в сцену посреди заезда не рисовалось), на участке — переставляются
    const tex = arrowTexture(), TILE = 11.5, tiles = [];
    const overlay = new THREE.Group(); overlay.userData.dynamic = true; overlay.visible = false;
    if (tex) {
        const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }), geo = new THREE.PlaneGeometry(1.7, TILE, 1, 4); // сегменты — «кривой мир» гнёт по вершинам
        geo.rotateX(-Math.PI / 2);
        for (let d = TILE / 2; d < ONC_LEN; d += TILE) { const m = new THREE.Mesh(geo, mat); m.userData.dynamic = true; m.userData.d = d; m.renderOrder = 1; overlay.add(m); tiles.push(m); }
    }
    scene.add(overlay);
    const sign = typeof document !== 'undefined' ? signBoard() : null;
    if (sign) { sign.visible = false; sign.traverse(function(q) { q.userData.dynamic = true; }); scene.add(sign); }
    let sec = null, t = 0;
    const clear = function() {
        overlay.visible = false; if (sign) sign.visible = false;
        if (sec && o.works) { const i = o.works.indexOf(sec.work); if (i >= 0) o.works.splice(i, 1); }
        sec = null;
    };
    return {
        get active() { return sec; },
        cars: pool,
        /** Поставить участок k: z0 — где начинается (трасса к −z) */
        spawn: function(k, z0) {
            clear();
            const s = oncSection(k);
            sec = { k: k, z0: z0, z1: z0 - ONC_LEN };
            sec.work = { type: 'oncoming', z0: z0 + 30, z1: sec.z1 - 140, x: lx }; // попутки уходят из полосы заранее
            if (o.works) o.works.push(sec.work);
            tiles.forEach(function(m) { m.position.set(lx, 0.045, z0 - m.userData.d); });
            overlay.visible = tiles.length > 0;
            if (sign) { sign.position.set(lx - 2.6, 0, z0 + ONC_SIGN); sign.visible = true; }
            pool.forEach(function(c, i) {
                c.on = i < s.cars.length; c.mesh.visible = c.on; c.hitCooldown = 0; c._nm = false; c._thr = null;
                if (c.on) { c.z = z0 - s.cars[i]; c.mesh.position.set(lx, 0.05, c.z); }
            });
            return sec;
        },
        update: function(dt, x, z) {
            t += dt;
            const out = { hit: null, near: [], inLane: inOncoming(x, z, sec, lx), sec: sec };
            if (!sec) return out;
            const flash = Math.floor(t * 5) % 2 === 0;
            pool.forEach(function(c) {
                if (!c.on) return;
                if (c.hitCooldown > 0) c.hitCooldown -= dt;
                if (z - c.z < 140) c.z += ONC_V * dt; // трогаются, когда игрок близко
                c.mesh.position.z = c.z;
                c.mesh.userData.lights.forEach(function(l) { l.visible = flash; });
                const dx = x - c.x, dz = z - c.z;
                out.near.push({ car: c, dx: dx, dz: dz });
                if (c.hitCooldown <= 0 && Math.abs(dx) < c.hitW * 0.55 && Math.abs(dz) < 1.6) { c.hitCooldown = 1.5; out.hit = c; }
                if (c.z > z + 30) { c.on = false; c.mesh.visible = false; }
            });
            if (z < sec.z1 - 160) clear(); // проехал участок — убрать
            return out;
        },
        dispose: function() { clear(); pool.forEach(function(c) { scene.remove(c.mesh); }); scene.remove(overlay); if (sign) { scene.remove(sign); if (sign.userData.dispose) sign.userData.dispose(); } }
    };
}
