/**
 * Диорамы из моделей игры: небо, свет, трасса и обочины карты, машины, боссы, звери, разлом,
 * трамплин, переезд с поездом, щиты 90-х, бонусы. Один стиль для живого фона меню (menu-bg.js)
 * и для всех картинок игры (tools/art — рендер в файлы).
 *
 * Координаты как в заезде: дорога вдоль z, машины едут к −z (к камере), полосы x = −1.5 / 0 / 1.5.
 */
import * as THREE from 'three';
import { buildShowroomCar, addNitroFlames } from './cars.js';
import { CAR_PAINTS } from './content.js';
import { CAMPAIGN_BOSSES, createArcadeBossMesh } from './boss.js';
import { createSmashBoard } from './smash.js';
import { createGapMesh, gapStyle, rampTexture } from './setpieces.js';
import { createMapEvent } from './mapevents.js';

export const ROAD_W = 6;
export const LANES = [-1.5, 0, 1.5];

export const TIMES = {
    sunset: { top: 0x2b2345, mid: 0xd9785a, bottom: 0xffc27a, fog: 0xe8a070, sky: 0xffe2c4, gnd: 0x4a3a2a, hemi: 1.0, sun: 0xffb27a, sunI: 2.2, sunPos: [-6, 5, 30], fill: 0x8fa8ff, exp: 1.05, near: 26, far: 120 },
    day: { top: 0x3f7cc4, mid: 0x9cc6e8, bottom: 0xf4dfb4, fog: 0xe6d8bc, sky: 0xfff2dc, gnd: 0x5a4a38, hemi: 1.15, sun: 0xfff0d6, sunI: 2.4, sunPos: [10, 16, 4], fill: 0xbfd4ff, exp: 1.0, near: 40, far: 170 },
    night: { top: 0x060a1a, mid: 0x1c2852, bottom: 0x3e4478, fog: 0x232b52, sky: 0x8a9ad0, gnd: 0x1a1a28, hemi: 1.15, sun: 0x9fb2ff, sunI: 1.6, sunPos: [-5, 9, 12], fill: 0x6677bb, exp: 1.4, near: 22, far: 110, stars: true, lights: true },
    rain: { top: 0x2e3844, mid: 0x5d6a78, bottom: 0x93a0ac, fog: 0x76818e, sky: 0xc8d4e0, gnd: 0x3a3a40, hemi: 1.05, sun: 0xd0dae4, sunI: 1.2, sunPos: [4, 12, 8], fill: 0x9fb0c4, exp: 1.1, near: 16, far: 90, rain: true, lights: true }
};
const MAPS = {
    arsenev: { ground: 0x9a7a55, deco: 'forest' },
    promzona: { ground: 0x5f6452, deco: 'factory' },
    svalka: { ground: 0x5d5236, deco: 'junk' }
};

function rng(seed) {
    let s = (seed || 1) >>> 0;
    return function() { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

// ---------------------------------------------------------------- небо, земля, дорога
function skyDome(t) {
    const mat = new THREE.ShaderMaterial({
        side: THREE.BackSide, depthWrite: false, fog: false,
        uniforms: { top: { value: new THREE.Color(t.top) }, mid: { value: new THREE.Color(t.mid) }, bottom: { value: new THREE.Color(t.bottom) } },
        vertexShader: 'varying float h; void main(){ h = normalize(position).y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader: 'uniform vec3 top; uniform vec3 mid; uniform vec3 bottom; varying float h;'
            + 'void main(){ vec3 c = h > 0.1 ? mix(mid, top, smoothstep(0.1, 0.6, h)) : mix(bottom, mid, smoothstep(-0.05, 0.1, h)); gl_FragColor = vec4(c, 1.0); }'
    });
    const m = new THREE.Mesh(new THREE.SphereGeometry(300, 24, 12), mat);
    m.renderOrder = -1;
    return m;
}

const _roadTex = {};
export function roadTexture(snow) {
    const key = snow ? 's' : 'a';
    if (_roadTex[key]) return _roadTex[key];
    const cv = document.createElement('canvas');
    cv.width = 256; cv.height = 256;
    const cx = cv.getContext('2d');
    const r = rng(7);
    cx.fillStyle = snow ? '#8d949e' : '#3b3a40'; cx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 900; i++) {
        const v = (snow ? 150 : 50) + r() * 30 | 0;
        cx.fillStyle = 'rgba(' + v + ',' + v + ',' + (v + 6) + ',0.55)';
        cx.fillRect(r() * 256, r() * 256, 2, 2);
    }
    cx.fillStyle = '#f2efe6';
    [85, 171].forEach(function(x) { cx.fillRect(x - 3, 20, 6, 110); });
    for (let y = 0; y < 256; y += 64) {
        cx.fillStyle = '#d8261b'; cx.fillRect(0, y, 10, 32); cx.fillRect(246, y, 10, 32);
        cx.fillStyle = '#f4f1ea'; cx.fillRect(0, y + 32, 10, 32); cx.fillRect(246, y + 32, 10, 32);
    }
    const tex = new THREE.CanvasTexture(cv);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 30);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    _roadTex[key] = tex;
    return tex;
}

// ---------------------------------------------------------------- обочины
const M = {};
function mat(key, color, extra) {
    if (!M[key]) M[key] = new THREE.MeshLambertMaterial(Object.assign({ color: color }, extra || {}));
    return M[key];
}
function tree(kind, snow) {
    const g = new THREE.Group();
    if (kind === 'pine') {
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.13, 1.6, 6), mat('trunk', 0x8a4a22));
        trunk.position.y = 0.8; g.add(trunk);
        for (let i = 0; i < 4; i++) {
            const c = new THREE.Mesh(new THREE.ConeGeometry(0.75 - i * 0.14, 0.8 - i * 0.1, 8), snow && i % 2 ? mat('snowcap', 0xeef6ff) : mat('pine', 0x24522c));
            c.position.y = 1.3 + i * 0.45; g.add(c);
        }
    } else {
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 2.0, 6), mat('birch', 0xe8e4d8));
        trunk.position.y = 1.0; g.add(trunk);
        [[0, 2.3, 0, 0.7], [0.3, 2.0, 0.1, 0.5], [-0.28, 2.05, -0.1, 0.5]].forEach(function(c) {
            const m = new THREE.Mesh(new THREE.IcosahedronGeometry(c[3], 0), snow ? mat('snowleaf', 0xdfe8ef) : mat('leaf', 0x5a8a34));
            m.position.set(c[0], c[1], c[2]); g.add(m);
        });
    }
    return g;
}
function factory(r) {
    const g = new THREE.Group();
    const w = 3 + r() * 5, h = 2 + r() * 4, d = 3 + r() * 4;
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat('fac' + (r() * 3 | 0), [0x6a6e74, 0x7a6a58, 0x5a6268][r() * 3 | 0]));
    body.position.y = h / 2; g.add(body);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 0.2, 0.25, d + 0.2), mat('roof', 0x3a3a40));
    roof.position.y = h + 0.12; g.add(roof);
    for (let i = 0; i < 1 + (r() * 2 | 0); i++) {
        const ch = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.42, 5 + r() * 4, 10), mat('chimney', 0x8a4a32));
        ch.position.set((r() - 0.5) * w * 0.7, h + 2.5, (r() - 0.5) * d * 0.6); g.add(ch);
        const band = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.35, 10), mat('band', 0xeeeeee));
        band.position.set(ch.position.x, h + 4.2, ch.position.z); g.add(band);
    }
    for (let i = 0; i < 3; i++) { // окна с тёплым светом
        const win = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.5), new THREE.MeshBasicMaterial({ color: 0xffc46a }));
        win.position.set(-w / 2 + 0.8 + i * 1.1, h * 0.55, d / 2 + 0.01); g.add(win);
    }
    return g;
}
function junk(r) {
    const g = new THREE.Group();
    const cols = [0x6a4a32, 0x7a3a22, 0x3a3a40, 0x4a6a8a, 0x8a7a3a];
    for (let k = 0; k < 7; k++) {
        const j = new THREE.Mesh(new THREE.BoxGeometry(0.6 + r() * 1.2, 0.4 + r() * 1.0, 0.6 + r() * 1.2), mat('junk' + (k % 5), cols[k % 5]));
        j.position.set((r() - 0.5) * 2.4, 0.3 + r() * 0.9, (r() - 0.5) * 2.4);
        j.rotation.set(r() * 0.6, r() * 3, r() * 0.6);
        g.add(j);
    }
    for (let k = 0; k < 2; k++) {
        const t = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.17, 8, 14), mat('tire', 0x151515));
        t.rotation.set(Math.PI / 2 + r() * 0.4, 0, r());
        t.position.set((r() - 0.5) * 2, 0.2 + k * 0.3, (r() - 0.5) * 2);
        g.add(t);
    }
    return g;
}

// ---------------------------------------------------------------- тени, холмы, облака
let _blobTex = null;
function blobTex() {
    if (_blobTex) return _blobTex;
    const cv = document.createElement('canvas'); cv.width = cv.height = 128;
    const cx = cv.getContext('2d');
    const gr = cx.createRadialGradient(64, 64, 6, 64, 64, 64);
    gr.addColorStop(0, 'rgba(0,0,0,0.6)'); gr.addColorStop(0.6, 'rgba(0,0,0,0.3)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    cx.fillStyle = gr; cx.fillRect(0, 0, 128, 128);
    _blobTex = new THREE.CanvasTexture(cv);
    return _blobTex;
}
/** Мягкая тень-пятно под объектом (по его габаритам) */
export function blobShadow(obj, k) {
    const box = new THREE.Box3().setFromObject(obj);
    const sz = box.getSize(new THREE.Vector3());
    const m = new THREE.Mesh(new THREE.PlaneGeometry(Math.max(0.6, sz.x * (k || 1.25)), Math.max(0.6, sz.z * (k || 1.25))),
        new THREE.MeshBasicMaterial({ map: blobTex(), transparent: true, depthWrite: false, fog: false }));
    m.rotation.x = -Math.PI / 2;
    m.position.set((box.min.x + box.max.x) / 2, 0.015, (box.min.z + box.max.z) / 2);
    m.renderOrder = 1;
    return m;
}
function hills(scene, t, r, snow) {
    const col = new THREE.Color(t.fog).lerp(new THREE.Color(snow ? 0xdfe6ee : 0x3a3448), 0.35);
    const hm = new THREE.MeshLambertMaterial({ color: col, flatShading: true });
    for (let i = 0; i < 22; i++) {
        const a = -0.9 + (i / 21) * 1.8; // дуга впереди камеры (к +z)
        const R = 150 + r() * 60;
        const h = 12 + r() * 26;
        const c = new THREE.Mesh(new THREE.ConeGeometry(18 + r() * 22, h, 6 + (r() * 3 | 0)), hm);
        c.position.set(Math.sin(a) * R, h / 2 - 2, 30 + Math.cos(a) * R);
        c.rotation.y = r() * 3;
        scene.add(c);
    }
}
function clouds(scene, t, r) {
    const cm = new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true, fog: false, emissive: new THREE.Color(t.bottom), emissiveIntensity: 0.25 });
    for (let i = 0; i < 9; i++) {
        const g = new THREE.Group();
        for (let k = 0; k < 4; k++) {
            const b = new THREE.Mesh(new THREE.IcosahedronGeometry(4 + r() * 4, 1), cm);
            b.position.set(k * 5 - 8 + r() * 3, r() * 2, r() * 3);
            b.scale.y = 0.45;
            g.add(b);
        }
        g.position.set((r() - 0.5) * 220, 38 + r() * 30, 90 + r() * 170);
        scene.add(g);
    }
}

// ---------------------------------------------------------------- бонусы
export function star() {
    const s = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
        const a = i / 10 * Math.PI * 2 - Math.PI / 2, rr = i % 2 ? 0.2 : 0.46;
        if (i) s.lineTo(Math.cos(a) * rr, -Math.sin(a) * rr); else s.moveTo(Math.cos(a) * rr, -Math.sin(a) * rr);
    }
    const m = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.12, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 2 }),
        new THREE.MeshStandardMaterial({ color: 0xffd23c, emissive: 0xffa000, emissiveIntensity: 0.55, metalness: 0.4, roughness: 0.35 }));
    m.geometry.center();
    return m;
}
export function heartGum() {
    const s = new THREE.Shape();
    s.moveTo(0, -0.35);
    s.bezierCurveTo(-0.55, 0.05, -0.3, 0.45, 0, 0.2);
    s.bezierCurveTo(0.3, 0.45, 0.55, 0.05, 0, -0.35);
    const m = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.16, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 3 }),
        new THREE.MeshStandardMaterial({ color: 0xff5a9a, emissive: 0xff2266, emissiveIntensity: 0.35, roughness: 0.4 }));
    m.geometry.center();
    return m;
}
export function nitroArrows() {
    const g = new THREE.Group();
    const mt = new THREE.MeshStandardMaterial({ color: 0x3dff7a, emissive: 0x19c24a, emissiveIntensity: 0.7, roughness: 0.4 });
    for (let i = 0; i < 3; i++) {
        const s = new THREE.Shape();
        s.moveTo(-0.4, 0); s.lineTo(0, 0.28); s.lineTo(0.4, 0); s.lineTo(0.4, 0.12); s.lineTo(0, 0.4); s.lineTo(-0.4, 0.12);
        const a = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.06, bevelEnabled: false }), mt);
        a.rotation.x = -Math.PI / 2;
        a.position.set(0, 0.05, -i * 0.42);
        g.add(a);
    }
    return g;
}

export function paintHex(id) {
    const p = id && CAR_PAINTS.find(function(x) { return x.id === id; });
    return p && p.color != null ? p.color : null;
}

// ---------------------------------------------------------------- диорама
/**
 * spec: { map, time, snow, seed, car, cars, boss, animals, gap, ramp, train, boards, pickups, camera, decoCount }
 *  car/cars: { id, x, y, z, rotY, tilt, paint, nitro, scale }
 *  boss: { idx, x, z, rotY }   animals: [{ kind, x, z, rotY, leg }]
 *  gap: { z, len }   ramp: { x, z }   train: { z, x }   pickups: [{ type: 'star'|'gum'|'nitro', x, y, z }]
 * Возвращает { scene, camera, deco, cars, boss, roadTex, apply(renderer) }.
 */
export function createDiorama(spec) {
    const s = spec || {};
    const t = TIMES[s.time || 'sunset'];
    const mp = MAPS[s.map || 'arsenev'] || MAPS.arsenev;
    const snow = !!s.snow;
    const r = rng(s.seed || 3);
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(t.fog, t.near, t.far);
    scene.add(skyDome(t));
    scene.add(new THREE.HemisphereLight(t.sky, t.gnd, t.hemi));
    const sun = new THREE.DirectionalLight(t.sun, t.sunI);
    sun.position.set(t.sunPos[0], t.sunPos[1], t.sunPos[2]);
    scene.add(sun);
    const fill = new THREE.DirectionalLight(t.fill, 0.5);
    fill.position.set(6, 4, -10);
    scene.add(fill);
    if (t.stars) {
        const pts = [];
        for (let i = 0; i < 500; i++) {
            const a = r() * Math.PI * 2, e = 0.08 + r() * 1.3;
            pts.push(Math.cos(a) * Math.cos(e) * 280, Math.sin(e) * 280, Math.sin(a) * Math.cos(e) * 280);
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
        scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xdfe6ff, size: 1.1, sizeAttenuation: false, fog: false })));
    }

    hills(scene, t, r, snow);
    if (!t.stars && !t.rain && s.clouds !== false) clouds(scene, t, r);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(420, 420), new THREE.MeshLambertMaterial({ color: snow ? 0xe6edf3 : mp.ground }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, -0.01, 100);
    scene.add(ground);
    const roadTex = roadTexture(snow).clone();
    roadTex.needsUpdate = true;
    const road = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_W, 240), new THREE.MeshLambertMaterial({ map: roadTex }));
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0, 100);
    scene.add(road);

    // обочины по карте
    const deco = [];
    const n = s.decoCount != null ? s.decoCount : 46;
    for (let i = 0; i < n; i++) {
        const side = i % 2 ? 1 : -1;
        let o;
        if (mp.deco === 'factory' && i % 3 === 0) { o = factory(r); o.position.set(side * (ROAD_W / 2 + 9 + r() * 18), 0, -10 + r() * 150); }
        else if (mp.deco === 'junk' && i % 2 === 0) { o = junk(r); o.scale.setScalar(0.9 + r() * 0.8); o.position.set(side * (ROAD_W / 2 + 2.5 + r() * 14), 0, -10 + r() * 150); }
        else {
            o = tree(r() < 0.62 ? 'pine' : 'birch', snow);
            o.scale.setScalar(0.9 + r() * 0.9);
            o.position.set(side * (ROAD_W / 2 + 3 + r() * 16), 0, -12 + r() * 150);
            o.rotation.y = r() * 6.28;
            if (mp.deco !== 'forest' && !snow) o.scale.multiplyScalar(0.8);
        }
        scene.add(o);
        deco.push(o);
    }
    for (let i = 0; i < 10; i++) {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 3.2, 6), mat('pole', 0x5b5b62));
        pole.position.set((i % 2 ? 1 : -1) * (ROAD_W / 2 + 1.1), 1.6, -12 + i * 15);
        scene.add(pole);
        deco.push(pole);
    }
    (s.boards || []).forEach(function(b, i) {
        const bb = createSmashBoard(0, 0, b.ad != null ? b.ad : i * 2);
        bb.group.scale.setScalar(b.scale || 1.6);
        bb.group.rotation.y = b.rotY != null ? b.rotY : Math.PI;
        bb.group.position.set(b.x, 0, b.z);
        scene.add(bb.group);
        deco.push(bb.group);
    });

    // машины
    const cars = [];
    [].concat(s.car ? [s.car] : [], s.cars || []).forEach(function(c) {
        const built = buildShowroomCar(c.id || 'cheburashka');
        const hex = c.paint ? paintHex(c.paint) : null;
        if (hex != null && built.bodyMat) built.bodyMat.color.setHex(hex);
        const g = built.group;
        g.scale.setScalar(c.scale || 1);
        g.position.set(c.x || 0, c.y || 0, c.z || 0);
        g.rotation.set(c.tiltX || 0, c.rotY || 0, c.tilt || 0);
        if (c.nitro) addNitroFlames(g).update(0.3, true);
        if (t.lights) { // фары светят вперёд (у модели перед — к −z)
            const hl = new THREE.PointLight(0xffe2a8, 22, 16, 1.6);
            hl.position.set(0, 0.7, -3.2);
            g.add(hl);
        }
        scene.add(g);
        if (!c.y || c.y < 0.3) scene.add(blobShadow(g));
        cars.push({ group: g, wheels: (built.upgrades && built.upgrades.wheels) || [] });
    });

    // босс
    let boss = null;
    if (s.boss) {
        const def = s.boss.def || CAMPAIGN_BOSSES[(s.boss.idx || 0) % CAMPAIGN_BOSSES.length];
        boss = createArcadeBossMesh(def);
        boss.position.set(s.boss.x || 0, s.boss.y || 0, s.boss.z != null ? s.boss.z : 12);
        boss.rotation.y = s.boss.rotY || 0;
        // в заезде машина в 0.62 от модели витрины — в диораме машина 1:1, босса увеличиваем в той же пропорции
        boss.scale.multiplyScalar(s.boss.scale || 1.5);
        scene.add(boss);
        scene.add(blobShadow(boss, 0.9));
        if (t.lights) { // подсветка снизу — силуэт босса читается ночью
            const bl = new THREE.PointLight(0xff7a4a, 30, 14, 1.5);
            bl.position.set(boss.position.x, 1.2, boss.position.z - 3);
            scene.add(bl);
        }
    }

    // звери (модели игры — window.createAnimalMesh из main.js)
    const mk = typeof window !== 'undefined' && window.createAnimalMesh;
    (s.animals || []).forEach(function(a) {
        if (!mk) return;
        try {
            const m = mk(a.kind);
            m.visible = true;
            m.scale.setScalar(a.scale || 1.1);
            m.rotation.y = a.rotY != null ? a.rotY : Math.PI / 2;
            m.position.set(a.x, a.y || 0, a.z);
            m.traverse(function(o) { if (o.userData && o.userData.isLeg) o.rotation.x = Math.sin((a.leg || 0) + (o.userData.legIndex === 0 || o.userData.legIndex === 3 ? 0 : Math.PI)) * 0.55; });
            scene.add(m);
            scene.add(blobShadow(m, 1.1));
        } catch (e) {}
    });

    // разлом и трамплин
    if (s.gap) {
        const len = s.gap.len || 5.5;
        scene.add(createGapMesh(ROAD_W, s.gap.z + len, len, gapStyle(s.map || 'arsenev', snow)));
    }
    if (s.ramp) {
        const tex = rampTexture(snow ? 'snow' : (s.map || 'arsenev'));
        const rg = new THREE.Group();
        const plate = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.18, 4.2), new THREE.MeshLambertMaterial({ map: tex }));
        plate.rotation.x = Math.atan2(0.85, 4);
        plate.position.y = 0.42;
        rg.add(plate);
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.22, 0.2, 0.3), new THREE.MeshLambertMaterial({ color: 0xffcc00 }));
        stripe.position.set(0, 0.86, -1.95);
        rg.add(stripe);
        rg.position.set(s.ramp.x || 0, 0, s.ramp.z);
        scene.add(rg);
    }
    if (s.train) {
        const ev = createMapEvent('arsenev', ROAD_W, s.train.z, LANES);
        const c = ev.debug.crossing;
        c.train.visible = true;
        c.train.position.x = s.train.x != null ? s.train.x : 4;
        c.lights.forEach(function(l) { l.mesh.material.color.setHex(l.phase ? 0x440000 : 0xff2020); });
        c.gates.forEach(function(g) { g.arm.rotation.z = 0; });
        scene.add(ev.group);
    }
    if (s.finish) { // финишная арка с клетчатым баннером
        const cv = document.createElement('canvas'); cv.width = 512; cv.height = 96;
        const cx = cv.getContext('2d');
        for (let x = 0; x < 512; x += 24) for (let y = 0; y < 96; y += 24) { cx.fillStyle = ((x + y) / 24) % 2 ? '#111' : '#f4f4f4'; cx.fillRect(x, y, 24, 24); }
        cx.fillStyle = 'rgba(255,210,40,0.92)'; cx.fillRect(120, 14, 272, 68);
        cx.fillStyle = '#1a1000'; cx.font = '900 52px Arial, sans-serif'; cx.textAlign = 'center'; cx.textBaseline = 'middle';
        cx.fillText('ФИНИШ', 256, 50);
        const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
        const g = new THREE.Group();
        [-1, 1].forEach(function(side) {
            const post = new THREE.Mesh(new THREE.BoxGeometry(0.35, 4.2, 0.35), mat('finpost', 0xd8261b));
            post.position.set(side * (ROAD_W / 2 + 0.5), 2.1, 0); g.add(post);
        });
        const banner = new THREE.Mesh(new THREE.BoxGeometry(ROAD_W + 1.4, 1.1, 0.15), [mat('fb', 0x222222), mat('fb', 0x222222), mat('fb', 0x222222), mat('fb', 0x222222), new THREE.MeshLambertMaterial({ map: tex }), new THREE.MeshLambertMaterial({ map: tex })]);
        banner.position.y = 3.8; g.add(banner);
        const line = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_W, 0.8), new THREE.MeshLambertMaterial({ map: tex }));
        line.rotation.x = -Math.PI / 2; line.position.y = 0.02; g.add(line);
        g.position.z = s.finish.z;
        scene.add(g);
    }
    (s.smoke || []).forEach(function(sm, i) { // дым после аварии
        const m = new THREE.Mesh(new THREE.IcosahedronGeometry(sm.r || 0.5, 1), new THREE.MeshLambertMaterial({ color: sm.color || 0x5a5a60, transparent: true, opacity: sm.o != null ? sm.o : 0.55, depthWrite: false }));
        m.position.set(sm.x, sm.y, sm.z);
        m.rotation.set(i, i * 2, 0);
        scene.add(m);
    });
    (s.pickups || []).forEach(function(p) {
        const m = p.type === 'star' ? star() : p.type === 'nitro' ? nitroArrows() : heartGum();
        m.position.set(p.x || 0, p.y != null ? p.y : 1, p.z);
        if (p.rotY) m.rotation.y = p.rotY;
        if (p.scale) m.scale.setScalar(p.scale);
        scene.add(m);
    });

    const camera = new THREE.PerspectiveCamera((s.camera && s.camera.fov) || 42, 16 / 9, 0.1, 400);
    if (s.camera) {
        camera.position.set(s.camera.pos[0], s.camera.pos[1], s.camera.pos[2]);
        camera.lookAt(s.camera.look[0], s.camera.look[1], s.camera.look[2]);
    }
    return {
        scene: scene, camera: camera, deco: deco, cars: cars, boss: boss, roadTex: roadTex,
        /** настройки рендерера под время суток */
        apply: function(renderer) {
            renderer.outputColorSpace = THREE.SRGBColorSpace;
            renderer.toneMapping = THREE.ACESFilmicToneMapping;
            renderer.toneMappingExposure = t.exp;
        }
    };
}

/** Кадр диорамы в PNG/JPEG (dataURL) — для tools/art */
export function renderDiorama(spec, w, h, type) {
    const d = createDiorama(spec);
    const r = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
    r.setPixelRatio(1);
    r.setSize(w, h, false);
    d.apply(r);
    d.camera.aspect = w / h;
    d.camera.updateProjectionMatrix();
    r.render(d.scene, d.camera);
    const url = r.domElement.toDataURL(type || 'image/jpeg', 0.86);
    r.dispose();
    r.forceContextLoss();
    return url;
}
