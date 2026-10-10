/**
 * Второй слой деталей машин «из кино» и фантазийных — как у безумного транспорта (src/ride-models.js):
 *   диски — у каждой свой узнаваемый рисунок (WHEEL_STYLE), обод с хромовой кромкой, колпак и болты;
 *   кузов — тёмные арки над колёсами, нижний пояс-порог и фирменные мелочи каждой машины (bodyExtras).
 * Колёсные детали — внутри ступицы (userData.isWheel), поэтому крутятся с колесом и не уезжают с кузовом
 * при высокой подвеске (src/suspension.js).
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** Рисунок дисков по машине */
export const WHEEL_STYLE = {
    thief: 'slots5',     // «Угонщик» — тёмные диски с пятью прорезями, как у маслкаров 60-х
    neon: 'mesh',        // «Неон» — тонкие спицы-сетка
    bull: 'dial',        // «Бычок» — «телефонный диск» 80-х: пять круглых отверстий
    avenger: 'blades',   // «Ночной мститель» — золотые лопатки
    ghostcar: 'whitewall', // «Призрачный патруль» — белые боковины и колпак-купол
    timecar: 'louver',   // «Машина времени» — плоские диски с радиальными щелями
    cyborg: 'wire', trike: 'wire', moped: 'wire' // мотоциклы — спицы, как у настоящих
};

const mc = {};
function M(hex, o) { const k = hex + (o ? JSON.stringify(o) : ''); return mc[k] || (mc[k] = new THREE.MeshStandardMaterial(Object.assign({ color: hex, roughness: 0.4, metalness: 0.5 }, o || {}))); }

/** Добавить на ступицу hub (ось — x) детали диска стиля style; r — радиус шины, w — ширина */
export function dressWheel(hub, r, w, style, m) {
    const tmp = new THREE.Group(); // детали собираются здесь и склеиваются по материалу: колесо — несколько мешей, а не десятки
    const add = function(mesh) { tmp.add(mesh); return mesh; };
    const faces = [-1, 1];
    const atFace = function(s, extra) { return s * (w / 2 + 0.012 + (extra || 0)); };
    const disc = function(rr, th, mat, x) { const c = new THREE.Mesh(new THREE.CylinderGeometry(rr, rr, th, 20), mat); c.rotation.z = Math.PI / 2; c.position.x = x; return add(c); };
    const ring = function(rr, tube, mat, x) { const t = new THREE.Mesh(new THREE.TorusGeometry(rr, tube, 6, 28), mat); t.rotation.y = Math.PI / 2; t.position.x = x; return add(t); };
    const hole = function(mat, x, a, rad, size, th) { const c = new THREE.Mesh(new THREE.CylinderGeometry(size, size, th || 0.02, 10), mat); c.rotation.z = Math.PI / 2; c.position.set(x, Math.sin(a) * rad, Math.cos(a) * rad); return add(c); };
    const dark = M(0x101012, { metalness: 0.2, roughness: 0.7 });
    // боковина шины — чуть светлее протектора, кромка обода — хром
    faces.forEach(function(s) { ring(r * 0.8, r * 0.07, M(0x1c1c1e, { metalness: 0, roughness: 0.9 }), atFace(s, -0.006)); ring(r * 0.63, r * 0.035, m.chrome, atFace(s)); });
    if (style === 'slots5') faces.forEach(function(s) {
        for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2, b = new THREE.Mesh(new THREE.BoxGeometry(0.02, r * 0.14, r * 0.3), dark); b.position.set(atFace(s), Math.sin(a) * r * 0.38, Math.cos(a) * r * 0.38); b.rotation.x = -a; add(b); }
        disc(r * 0.17, 0.03, m.chrome, atFace(s, 0.004));
    });
    else if (style === 'mesh') faces.forEach(function(s) {
        disc(r * 0.6, 0.012, dark, atFace(s, -0.002)); // тёмная основа — спицы видны
        for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2, b = new THREE.Mesh(new THREE.BoxGeometry(0.02, r * 0.045, r * 1.12), m.chrome); b.position.x = atFace(s, 0.002); b.rotation.x = a; add(b); }
        disc(r * 0.14, 0.03, M(0xd02020, { metalness: 0.6, roughness: 0.3 }), atFace(s, 0.006));
    });
    else if (style === 'dial') faces.forEach(function(s) {
        disc(r * 0.58, 0.012, M(0xb8bcc4, { metalness: 0.75, roughness: 0.25 }), atFace(s, -0.002));
        for (let i = 0; i < 5; i++) hole(dark, atFace(s, 0.003), i / 5 * Math.PI * 2 + 0.3, r * 0.36, r * 0.12);
        disc(r * 0.12, 0.03, m.chrome, atFace(s, 0.006));
    });
    else if (style === 'blades') faces.forEach(function(s) {
        const gold = M(0xe8c020, { metalness: 0.65, roughness: 0.3 });
        for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2, b = new THREE.Mesh(new THREE.BoxGeometry(0.02, r * 0.09, r * 0.5), gold); b.position.set(atFace(s, 0.002), Math.sin(a) * r * 0.27, Math.cos(a) * r * 0.27); b.rotation.x = -a + 0.5; add(b); }
        disc(r * 0.13, 0.03, gold, atFace(s, 0.006));
    });
    else if (style === 'whitewall') faces.forEach(function(s) {
        ring(r * 0.77, r * 0.1, M(0xf2f2ee, { metalness: 0, roughness: 0.6 }), atFace(s, -0.002));
        const dome = new THREE.Mesh(new THREE.SphereGeometry(r * 0.42, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), m.chrome);
        dome.rotation.z = -s * Math.PI / 2; dome.scale.set(1, 0.35, 1); dome.position.x = atFace(s); add(dome);
    });
    else if (style === 'louver') faces.forEach(function(s) {
        disc(r * 0.6, 0.012, M(0xc8ccd2, { metalness: 0.7, roughness: 0.3 }), atFace(s, -0.002));
        for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, b = new THREE.Mesh(new THREE.BoxGeometry(0.02, r * 0.035, r * 0.26), dark); b.position.set(atFace(s, 0.003), Math.sin(a) * r * 0.38, Math.cos(a) * r * 0.38); b.rotation.x = -a; add(b); }
        disc(r * 0.13, 0.03, M(0x2a2c30, { metalness: 0.4, roughness: 0.5 }), atFace(s, 0.006));
    });
    else if (style === 'wire') faces.forEach(function(s) {
        for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, b = new THREE.Mesh(new THREE.BoxGeometry(0.008, r * 0.02, r * 1.2), m.chrome); b.position.x = s * (i % 2 ? 0.02 : 0.045); b.rotation.x = a + (i % 2 ? 0.12 : -0.12); add(b); }
        disc(r * 0.16, w + 0.04, m.chrome, 0);
    });
    // пять болтов вокруг колпака
    if (style && style !== 'mesh' && style !== 'wire') faces.forEach(function(s) { for (let i = 0; i < 5; i++) hole(m.chrome, atFace(s, 0.008), i / 5 * Math.PI * 2, r * 0.2, r * 0.03, 0.025); });
    mergeInto(hub, tmp);
}

/** Склеить детали tmp по материалу и положить в hub */
function mergeInto(hub, tmp) {
    const by = new Map();
    tmp.children.forEach(function(o) {
        o.updateMatrix();
        let g = o.geometry.clone().applyMatrix4(o.matrix);
        if (g.index) g = g.toNonIndexed();
        if (!by.has(o.material)) by.set(o.material, []);
        by.get(o.material).push(g);
        o.geometry.dispose();
    });
    by.forEach(function(list, mat) {
        const g = mergeGeometries(list, false);
        list.forEach(function(x) { x.dispose(); });
        if (g) hub.add(new THREE.Mesh(g, mat));
    });
}

/** Дуга-арка над колесом на боку кузова: x — плоскость борта, y/z — центр колеса */
function arch(group, mat, x, y, z, r) {
    const t = new THREE.Mesh(new THREE.TorusGeometry(r, r * 0.12, 6, 20, Math.PI), mat);
    t.rotation.y = Math.PI / 2; t.position.set(x, y, z); t.scale.set(1, 1, 0.5); group.add(t); return t;
}

const ARCHES = { thief: 1, neon: 1, bull: 1, ghostcar: 1, timecar: 1 };

/** Детали кузова поверх сборщика: k — kit, m — материалы, d — габариты сборщика { W, wheels } */
export function bodyExtras(k, m, group, carId, d) {
    const W = d.W, wheels = d.wheels || [];
    if (ARCHES[carId]) wheels.forEach(function(w) { arch(group, m.matte, Math.sign(w[0]) * (W / 2 + 0.01), w[1], w[2], w[3] + 0.06); });
    const paint = { bodyPaint: true }, LIGHT = { isLight: true };
    const accent = M(0x26e0ff, { emissive: 0x0aa8d0, emissiveIntensity: 0.6, metalness: 0.3, roughness: 0.3 });
    if (carId === 'thief') {
        // «утиный хвост» на крышке багажника, хромовая рамка решётки с планками, жабры перед задними колёсами, крышка бензобака
        k.box(m.body, W * 0.92, 0.05, 0.16, 0, 0.725, 1.2, -0.32, paint);
        [0.42, 0.5].forEach(function(y) { k.box(m.chrome, W * 0.7, 0.012, 0.02, 0, y, -1.335); });
        [-1, 1].forEach(function(s) {
            for (let i = 0; i < 3; i++) k.box(m.matte, 0.012, 0.025, 0.2, s * (W / 2 + 0.006), 0.42 + i * 0.04, 0.38);
            k.cyl(m.chrome, 0.04, 0.012, s * (W / 2 + 0.006), 0.58, 1.0, 'x');
        });
        // круглые фонари по два в чёрной панели
        k.box(m.matte, W * 0.86, 0.13, 0.016, 0, 0.55, 1.318);
        [-0.42, -0.26, 0.26, 0.42].forEach(function(x) { k.cyl(m.chrome, 0.06, 0.012, x, 0.55, 1.326, 'z'); k.cyl(m.tail, 0.048, 0.02, x, 0.55, 1.33, 'z', LIGHT); });
    } else if (carId === 'neon') {
        // пороги в цвет кузова, сплиттер, вентиляция на капоте, янтарные «углы», винил цвета неона
        [-1, 1].forEach(function(s) {
            k.box(m.body, 0.05, 0.08, 1.05, s * (W / 2 + 0.012), 0.25, 0.01, 0, paint);
            k.box(m.hl, 0.06, 0.04, 0.03, s * 0.56, 0.42, -1.18, 0, LIGHT);
            [0, 1, 2].forEach(function(i) { const b = k.box(accent, 0.012, 0.035, 0.9 - i * 0.22, s * (W / 2 + 0.008), 0.43 + i * 0.05, 0.1 + i * 0.12); b.rotation.x = -0.18; });
        });
        k.box(m.black, W * 1.02, 0.025, 0.2, 0, 0.2, -1.2);
        [-0.18, 0.18].forEach(function(x) { for (let i = 0; i < 4; i++) k.box(m.matte, 0.18, 0.012, 0.022, x, 0.61 - i * 0.008, -0.62 - i * 0.05, -0.12); });
        k.box(m.black, 0.36, 0.06, 0.26, 0, 0.9, 0.25, 0); // воздухозаборник на крыше
    } else if (carId === 'bull') {
        // расширенные задние крылья, чёрная губа и пороги, решётки воздухозаборников
        [-1, 1].forEach(function(s) {
            k.box(m.body, 0.09, 0.2, 0.78, s * (W / 2 + 0.03), 0.44, 0.78, 0, paint);
            k.box(m.matte, 0.02, 0.1, 0.5, s * (W / 2 + 0.076), 0.44, 0.8);
            for (let i = 0; i < 4; i++) k.box(m.chrome, 0.012, 0.012, 0.48, s * (W / 2 + 0.088), 0.4 + i * 0.026, 0.8);
            k.box(m.black, 0.03, 0.07, 1.0, s * (W / 2 + 0.012), 0.23, -0.02);
        });
        k.box(m.black, W * 0.96, 0.04, 0.16, 0, 0.2, -1.18);
    } else if (carId === 'avenger') {
        // рамка фонаря кабины, лопатки турбины, светящиеся щели воздухозаборников, губа
        const glowO = M(0xff7a1a, { emissive: 0xff5a00, emissiveIntensity: 1.1, roughness: 0.4 });
        [-0.25, 0.25].forEach(function(z) { k.rod(m.black, 0.018, [-0.38, 0.72, z], [0.38, 0.72, z]); });
        for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2, b = k.box(m.chrome, 0.02, 0.03, 0.14, Math.cos(a) * 0.1, 0.4 + Math.sin(a) * 0.1, -1.57); b.rotation.z = a; b.rotation.y = 0.5; }
        k.cyl(glowO, 0.03, 0.02, 0, 0.4, -1.585, 'z', LIGHT);
        [-1, 1].forEach(function(s) { k.box(glowO, 0.014, 0.03, 0.42, s * (W / 2 + 0.008), 0.44, 0.35, 0, LIGHT); });
        k.box(m.black, W * 0.9, 0.04, 0.2, 0, 0.21, -1.42);
        [-1, 1].forEach(function(s) { k.box(M(0x5a5e6a, { metalness: 0.85, roughness: 0.25 }), 0.012, 0.02, 2.7, s * (W / 2 + 0.012), 0.27, 0); }); // хромовая линия по низу борта (выше её закрывают обтекатели колёс) — чёрный силуэт читается
    } else if (carId === 'timecar') {
        // «реактор» подсвечен, у порогов — светящиеся вставки времени
        [-1, 1].forEach(function(s) { k.box(M(0x66ccff, { emissive: 0x3aa8ff, emissiveIntensity: 1.2 }), 0.012, 0.02, 1.4, s * (W / 2 + 0.014), 0.27, 0, 0, LIGHT); });
    }
}
