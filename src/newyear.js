/**
 * «Новогодний Арсеньев» (сезонная зона, src/infinite.js NEWYEAR): наряженные ёлки у дороги, гирлянды поперёк трассы
 * с мигающими лампочками, снеговики и Дед Мороз на «буханке» (сценка — src/moments.js).
 * Лампочки мигают сменой цвета трёх общих материалов (garlandTick) — дёшево; ёлки и гирлянды склеиваются с участком.
 */
import * as THREE from 'three';
import { mergeCarParts } from './merge-static.js';

const mats = {};
function M(hex, o) { const k = hex + (o ? JSON.stringify(o) : ''); return mats[k] || (mats[k] = new THREE.MeshStandardMaterial(Object.assign({ color: hex, roughness: 0.7 }, o || {}))); }
const BULB_COLORS = [0xff3a4a, 0xffd23c, 0x3aa8ff];
const bulbs = BULB_COLORS.map(function(c) { const m = new THREE.MeshBasicMaterial({ color: c }); m.userData.noShare = true; return m; });
const OFF = new THREE.Color(0x3a3a44);

/** Мигание: в каждый момент одна из трёх групп лампочек притушена (бегущие огни) */
export function bulbOn(group, t) { return Math.floor(t * 2.5) % 3 !== group; }
export function garlandTick(now) {
    const t = now / 1000;
    bulbs.forEach(function(m, i) { m.color.setHex(BULB_COLORS[i]); if (!bulbOn(i, t)) m.color.lerp(OFF, 0.75); });
}

/** Наряженная ёлка: ярусы, шары, звезда (основание — y = 0) */
export function createNyTree(s) {
    const g = new THREE.Group(), green = M(0x1e5a2e), r = function() { return Math.random(); };
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.6, 7), M(0x5a3a1e)); trunk.position.y = 0.3; g.add(trunk);
    [[1.6, 1.4, 1.1], [1.25, 1.2, 2.0], [0.9, 1.0, 2.8], [0.55, 0.85, 3.5]].forEach(function(t) { const c = new THREE.Mesh(new THREE.ConeGeometry(t[0], t[1], 8), green); c.position.y = t[2]; g.add(c); });
    for (let k = 0; k < 14; k++) { // шары на ветках
        const h = 0.9 + r() * 2.7, rad = (1.6 - (h - 0.9) * 0.4) * 0.92, a = r() * Math.PI * 2;
        const b = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), M([0xd81e2a, 0xf0c030, 0x2a7ad8, 0xe8e8f0][k % 4], { metalness: 0.5, roughness: 0.25 }));
        b.position.set(Math.cos(a) * rad, h - 0.15, Math.sin(a) * rad); g.add(b);
    }
    const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.3), M(0xffd23c, { emissive: 0xffb000, emissiveIntensity: 0.6 })); star.position.y = 4.1; g.add(star);
    const snow = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.7, 0.14, 12), M(0xf4f8fc)); snow.position.y = 0.05; g.add(snow);
    g.scale.setScalar(s || 1);
    try { mergeCarParts(g, { all: true }); } catch (e) {}
    return g;
}

/** Гирлянда поперёк дороги на высоте ~5: два столба и провисающий провод с лампочками (z — где) */
export function createGarland(W, z) {
    const g = new THREE.Group(), pole = M(0x4a4a52), wire = M(0x1a1a1a), x0 = W / 2 + 1.6, top = 5.6, sag = 0.9, n = 22;
    [-1, 1].forEach(function(s) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, top, 7), pole); p.position.set(s * x0, top / 2, z); g.add(p); });
    let prev = null;
    for (let k = 0; k <= n; k++) {
        const u = k / n, x = -x0 + u * 2 * x0, y = top - 0.2 - sag * 4 * u * (1 - u);
        if (prev) { // кусок провода
            const dx = x - prev[0], dy = y - prev[1], len = Math.hypot(dx, dy);
            const w = new THREE.Mesh(new THREE.BoxGeometry(len, 0.03, 0.03), wire); w.position.set((x + prev[0]) / 2, (y + prev[1]) / 2, z); w.rotation.z = Math.atan2(dy, dx); g.add(w);
        }
        if (k > 0 && k < n) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 5), bulbs[k % 3]); b.position.set(x, y - 0.1, z); g.add(b); }
        prev = [x, y];
    }
    return g;
}

/** Дед Мороз на крыше «буханки»: красная шуба, борода, мешок; машет рукой (arm в userData) */
export function createDedMoroz(van) {
    const g = new THREE.Group(); g.add(van);
    const d = new THREE.Group();
    const coat = M(0xc81e2a), white = M(0xf4f4f4);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.34, 0.75, 10), coat); body.position.y = 0.38; d.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), M(0xf0c0a0)); head.position.y = 0.88; d.add(head);
    const beard = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.3, 8), white); beard.position.set(0, 0.74, -0.08); beard.rotation.x = Math.PI; d.add(beard);
    const hat = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.32, 8), coat); hat.position.y = 1.08; d.add(hat);
    const pom = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 5), white); pom.position.y = 1.24; d.add(pom);
    const arm = new THREE.Group(); const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.4, 6), coat); sleeve.position.y = 0.2; arm.add(sleeve);
    arm.position.set(0.24, 0.6, 0); d.add(arm);
    const sack = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), M(0x8a5a2a)); sack.position.set(-0.35, 0.25, 0.25); sack.scale.y = 1.2; d.add(sack);
    d.position.set(0, 0.9, 0.1); d.scale.setScalar(0.55); d.rotation.y = Math.PI; // на крыше «буханки», в масштабе машины; лицом назад — к игроку, которого обгоняет
    g.add(d);
    g.userData.arm = arm;
    return g;
}
