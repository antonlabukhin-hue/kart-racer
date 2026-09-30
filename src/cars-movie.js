/**
 * Машины «из кино 90-х» — узнаваемые силуэты под своими именами (без чужих марок и логотипов):
 *   thief   «Угонщик»        — фастбэк-маслкар 60-х с полосами и боковыми выхлопами;
 *   neon    «Неон»           — тюнингованный японец: пузатая крыша, большое антикрыло, неоновая подсветка;
 *   bull    «Бычок»          — клин-суперкар 80-х: низкий, широкий, воздухозаборники, V-антикрыло;
 *   cyborg  «Киборг»         — чоппер с байкером в кожанке и тёмных очках;
 *   avenger «Ночной мститель» — длинная чёрная реактивная машина: турбина спереди, плавники, сопло.
 * Кузов — выдавленный боковой профиль (как чертёж сбоку), детали — поверх. Контракт как у buildShowroomCar:
 * { group, parts, bodyMat, upgrades: { wheels, wheelR, byLevel } }, group.userData.dims.
 * Спереди машины — −Z, сзади — +Z.
 */
import * as THREE from 'three';

export const MOVIE_CARS = ['thief', 'neon', 'bull', 'cyborg', 'avenger'];

function mats(color, o) {
    const body = new THREE.MeshStandardMaterial({ color: color, metalness: o.metal != null ? o.metal : 0.45, roughness: o.rough != null ? o.rough : 0.3 });
    return {
        body: body,
        black: new THREE.MeshStandardMaterial({ color: 0x131315, metalness: 0.5, roughness: 0.45 }),
        matte: new THREE.MeshStandardMaterial({ color: 0x0c0c0e, metalness: 0.1, roughness: 0.85 }),
        chrome: new THREE.MeshStandardMaterial({ color: 0xd4d6de, metalness: 0.85, roughness: 0.18 }),
        glass: new THREE.MeshStandardMaterial({ color: 0x14263a, metalness: 0.6, roughness: 0.08, transparent: true, opacity: 0.85 }),
        rubber: new THREE.MeshStandardMaterial({ color: 0x0d0d0d, roughness: 0.92, metalness: 0.1 }),
        hl: new THREE.MeshStandardMaterial({ color: 0xfff8e0, emissive: 0xffcc66, emissiveIntensity: 0.95, roughness: 0.25 }),
        tail: new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 1.6, roughness: 0.4 })
    };
}

function kit(group) {
    const add = function(mesh, flags) { if (flags) Object.assign(mesh.userData, flags); group.add(mesh); return mesh; };
    return {
        /** Коробка: размер (w, h, l), центр (x, y, z), наклон rx */
        box: function(mat, w, h, l, x, y, z, rx, flags) {
            const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, l), mat);
            m.position.set(x, y, z); if (rx) m.rotation.x = rx;
            return add(m, flags);
        },
        /** Цилиндр вдоль оси: 'x' | 'y' | 'z' */
        cyl: function(mat, r, len, x, y, z, axis, flags, seg) {
            const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg || 16), mat);
            m.position.set(x, y, z);
            if (axis === 'x') m.rotation.z = Math.PI / 2; else if (axis === 'z') m.rotation.x = Math.PI / 2;
            return add(m, flags);
        },
        /** Цилиндр между двумя точками */
        rod: function(mat, r, a, b, flags) {
            const va = new THREE.Vector3(a[0], a[1], a[2]), vb = new THREE.Vector3(b[0], b[1], b[2]);
            const len = va.distanceTo(vb);
            const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 10), mat);
            m.position.copy(va).add(vb).multiplyScalar(0.5);
            m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.clone().sub(va).normalize());
            return add(m, flags);
        },
        /** Боковой профиль pts [[z, y], …], выдавленный на ширину w по центру x */
        profile: function(mat, pts, w, x, bevel, flags) {
            const bv = bevel != null ? bevel : 0.03;
            const sh = new THREE.Shape();
            pts.forEach(function(p, i) { if (i) sh.lineTo(-p[0], p[1]); else sh.moveTo(-p[0], p[1]); });
            const depth = Math.max(0.005, w - bv * 2);
            const g = new THREE.ExtrudeGeometry(sh, { depth: depth, bevelEnabled: bv > 0, bevelThickness: bv, bevelSize: bv, bevelSegments: 2, curveSegments: 6 });
            g.translate(0, 0, -depth / 2);
            g.rotateY(Math.PI / 2);
            const m = new THREE.Mesh(g, mat);
            m.position.x = x || 0;
            return add(m, flags);
        },
        sphere: function(mat, r, sx, sy, sz, x, y, z, flags) {
            const m = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), mat);
            m.scale.set(sx, sy, sz); m.position.set(x, y, z);
            return add(m, flags);
        }
    };
}

/** Стекло поверх кузова между двумя точками профиля (лобовое / заднее): ширина w */
function pane(k, mat, a, b, w, lift) {
    const dz = b[0] - a[0], dy = b[1] - a[1];
    const len = Math.sqrt(dz * dz + dy * dy);
    const m = k.box(mat, w, 0.02, len, 0, (a[1] + b[1]) / 2 + (lift || 0.012), (a[0] + b[0]) / 2);
    m.rotation.x = -Math.atan2(dy, dz);
    return m;
}

function wheelSet(group, m, list, rimMat, capMat) {
    const wheels = [];
    list.forEach(function(p) {
        const r = p[3], w = p[4] || 0.2;
        const hub = new THREE.Group();
        hub.userData.isWheel = true;
        hub.position.set(p[0], p[1], p[2]);
        group.add(hub);
        const tire = new THREE.Mesh(new THREE.CylinderGeometry(r, r, w, 20), m.rubber);
        tire.rotation.z = Math.PI / 2; hub.add(tire);
        const disc = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.62, r * 0.62, w + 0.02, 14), rimMat || m.chrome);
        disc.rotation.z = Math.PI / 2; hub.add(disc);
        // спицы — чтобы вращение было видно
        for (let i = 0; i < 5; i++) {
            const sp = new THREE.Mesh(new THREE.BoxGeometry(w + 0.03, r * 0.1, r * 1.05), capMat || m.chrome);
            sp.rotation.x = i * Math.PI / 5; hub.add(sp);
        }
        wheels.push({ tire: tire, disc: disc, hub: hub, x: p[0], y: p[1], z: p[2] });
    });
    return wheels;
}

function paintFlag() { return { bodyPaint: true }; }
const LIGHT = { isLight: true };

// ---------------- «Угонщик»: фастбэк 60-х ----------------
function buildThief(k, m, group) {
    const W = 1.28;
    k.profile(m.body, [[-1.2, 0.2], [-1.27, 0.26], [-1.28, 0.44], [-1.2, 0.58], [-0.3, 0.62], [-0.05, 0.635], [1.0, 0.66], [1.22, 0.71], [1.27, 0.62], [1.26, 0.26], [1.18, 0.2]], W, 0, 0.035, paintFlag());
    // крыша-фастбэк: лобовое, крыша, длинное заднее стекло до багажника
    const cab = [[-0.2, 0.62], [0.06, 0.94], [0.42, 0.96], [1.02, 0.665]];
    k.profile(m.body, cab.concat([[1.02, 0.62]]), 1.02, 0, 0.03, paintFlag());
    k.profile(m.glass, [[-0.1, 0.665], [0.08, 0.905], [0.4, 0.92], [0.78, 0.74], [0.78, 0.665]], 1.045, 0, 0);
    pane(k, m.glass, cab[0], cab[1], 0.92);
    pane(k, m.glass, cab[2], cab[3], 0.86);
    // две чёрные полосы по капоту, крыше и багажнику
    [-0.13, 0.13].forEach(function(x) {
        k.box(m.black, 0.1, 0.012, 0.92, x, 0.657, -0.74, -0.044);
        k.box(m.black, 0.1, 0.012, 0.36, x, 0.995, 0.24);
        k.box(m.black, 0.1, 0.012, 0.22, x, 0.725, 1.12, -0.2);
    });
    // воздухозаборник на капоте
    k.box(m.body, 0.34, 0.07, 0.4, 0, 0.68, -0.62, 0, paintFlag());
    k.box(m.matte, 0.28, 0.05, 0.02, 0, 0.69, -0.83);
    // перед: решётка, круглые фары, противотуманки в центре, хромовый бампер
    k.box(m.matte, W * 0.78, 0.16, 0.04, 0, 0.46, -1.31);
    [-0.46, 0.46].forEach(function(x) { k.cyl(m.chrome, 0.085, 0.04, x, 0.47, -1.305, 'z'); k.cyl(m.hl, 0.07, 0.05, x, 0.47, -1.31, 'z', LIGHT); });
    [-0.1, 0.1].forEach(function(x) { k.cyl(m.hl, 0.045, 0.05, x, 0.46, -1.325, 'z', LIGHT); });
    k.box(m.chrome, W * 0.98, 0.05, 0.06, 0, 0.3, -1.33);
    // зад: широкий стоп-сигнал и бампер
    k.box(m.tail, W * 0.82, 0.07, 0.02, 0, 0.55, 1.31, 0, LIGHT);
    k.box(m.chrome, W * 0.98, 0.05, 0.06, 0, 0.3, 1.32);
    // боковые выхлопы под дверями
    [-1, 1].forEach(function(s) { k.cyl(m.chrome, 0.045, 0.85, s * (W / 2 + 0.03), 0.23, 0.1, 'z'); });
    return { L: 2.55, W: W, Y: 0.44, wheels: [[-0.57, 0.27, -0.8, 0.27, 0.22], [0.57, 0.27, -0.8, 0.27, 0.22], [-0.57, 0.27, 0.8, 0.27, 0.24], [0.57, 0.27, 0.8, 0.27, 0.24]] };
}

// ---------------- «Неон»: тюнингованный японец ----------------
function buildNeon(k, m, group) {
    const W = 1.3;
    k.profile(m.body, [[-1.12, 0.2], [-1.19, 0.26], [-1.2, 0.36], [-1.12, 0.46], [-0.42, 0.575], [-0.12, 0.6], [1.0, 0.64], [1.17, 0.62], [1.18, 0.27], [1.1, 0.2]], W, 0, 0.05, paintFlag());
    const cab = [[-0.16, 0.595], [0.14, 0.87], [0.48, 0.89], [0.92, 0.645]];
    k.profile(m.body, cab.concat([[0.92, 0.6]]), 1.04, 0, 0.05, paintFlag());
    k.profile(m.glass, [[-0.06, 0.64], [0.16, 0.84], [0.46, 0.855], [0.74, 0.7], [0.74, 0.64]], 1.07, 0, 0);
    pane(k, m.glass, cab[0], cab[1], 0.94);
    pane(k, m.glass, cab[2], cab[3], 0.9);
    // большое антикрыло на стойках
    [-0.46, 0.46].forEach(function(x) { k.box(m.black, 0.05, 0.26, 0.1, x, 0.76, 1.04); });
    k.box(m.body, W * 1.02, 0.04, 0.3, 0, 0.9, 1.06, 0.06, paintFlag());
    [-1, 1].forEach(function(s) { k.box(m.black, 0.02, 0.14, 0.34, s * W * 0.51, 0.9, 1.06); });
    // раскосые фары, решётка-рот, губа
    [-1, 1].forEach(function(s) { k.box(m.hl, 0.3, 0.05, 0.14, s * 0.4, 0.49, -1.14, 0.35, LIGHT); });
    k.box(m.matte, 0.62, 0.1, 0.03, 0, 0.3, -1.245);
    k.box(m.black, W * 0.95, 0.03, 0.12, 0, 0.21, -1.16);
    // круглые задние фонари по два
    [-0.52, -0.36, 0.36, 0.52].forEach(function(x) { k.cyl(m.tail, 0.055, 0.03, x, 0.5, 1.235, 'z', LIGHT); });
    k.cyl(m.chrome, 0.06, 0.2, 0.36, 0.25, 1.2, 'z');
    // винил: косые полосы по бокам
    [-1, 1].forEach(function(s) {
        [0, 1].forEach(function(i) { const b = k.box(m.matte, 0.012, 0.05, 1.3 - i * 0.3, s * (W / 2 + 0.004), 0.36 + i * 0.08, 0.05 + i * 0.1); b.rotation.x = -0.12; });
    });
    // неоновая подсветка днища
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(W * 0.95, 2.1), new THREE.MeshBasicMaterial({ color: 0x39ff88, transparent: true, opacity: 0.55, depthWrite: false }));
    glow.rotation.x = -Math.PI / 2; glow.position.y = 0.03; glow.userData.isLight = true; group.add(glow);
    return { L: 2.36, W: W, Y: 0.42, wheels: [[-0.58, 0.25, -0.74, 0.25, 0.24], [0.58, 0.25, -0.74, 0.25, 0.24], [-0.58, 0.25, 0.76, 0.25, 0.26], [0.58, 0.25, 0.76, 0.25, 0.26]] };
}

// ---------------- «Бычок»: клин-суперкар ----------------
function buildBull(k, m, group) {
    const W = 1.44;
    k.profile(m.body, [[-1.12, 0.19], [-1.22, 0.26], [-1.22, 0.33], [-0.36, 0.555], [1.05, 0.62], [1.2, 0.6], [1.21, 0.25], [1.1, 0.19]], W, 0, 0.025, paintFlag());
    const cab = [[-0.42, 0.555], [0.04, 0.82], [0.5, 0.83], [1.0, 0.64]];
    k.profile(m.body, cab.concat([[1.0, 0.6]]), 1.02, 0, 0.02, paintFlag());
    k.profile(m.glass, [[-0.3, 0.6], [0.06, 0.79], [0.46, 0.8], [0.62, 0.72], [0.62, 0.6]], 1.045, 0, 0);
    pane(k, m.glass, cab[0], cab[1], 0.94);
    // решётки-жалюзи на моторном отсеке
    for (let i = 0; i < 5; i++) k.box(m.matte, 0.7, 0.012, 0.03, 0, 0.71 - i * 0.017, 0.62 + i * 0.075, -0.2);
    // «перископы»-воздухозаборники за дверями и NACA-выемки на боках
    [-1, 1].forEach(function(s) {
        k.box(m.body, 0.2, 0.15, 0.42, s * 0.6, 0.67, 0.58, 0, paintFlag());
        k.box(m.matte, 0.16, 0.1, 0.02, s * 0.6, 0.67, 0.365);
        const d = k.box(m.matte, 0.012, 0.1, 0.42, s * (W / 2 + 0.004), 0.46, 0.08); d.rotation.x = -0.18;
    });
    // V-антикрыло
    [-1, 1].forEach(function(s) { const u = k.box(m.body, 0.05, 0.26, 0.08, s * 0.3, 0.74, 1.06, 0, paintFlag()); u.rotation.z = -s * 0.35; });
    k.box(m.body, 1.34, 0.04, 0.32, 0, 0.87, 1.1, 0.08, paintFlag());
    // перед: закрытые фары-«ресницы», поворотники, габариты
    [-1, 1].forEach(function(s) {
        k.box(m.matte, 0.3, 0.012, 0.16, s * 0.42, 0.51, -0.52, -0.26);
        k.box(m.body, 0.3, 0.1, 0.16, s * 0.42, 0.56, -0.62, 0, paintFlag()); // поднятая фара
        k.box(m.hl, 0.26, 0.07, 0.02, s * 0.42, 0.56, -0.705, 0, LIGHT);
        k.box(m.hl, 0.18, 0.035, 0.03, s * 0.44, 0.3, -1.25, 0, LIGHT);
        k.box(new THREE.MeshStandardMaterial({ color: 0xffa020, emissive: 0xff8800, emissiveIntensity: 1.2 }), 0.1, 0.03, 0.03, s * 0.6, 0.3, -1.245, 0, LIGHT);
    });
    // зад: чёрная панель, фонари, четыре трубы
    k.box(m.matte, W * 0.9, 0.2, 0.02, 0, 0.44, 1.215);
    [-1, 1].forEach(function(s) { k.box(m.tail, 0.32, 0.07, 0.02, s * 0.46, 0.46, 1.225, 0, LIGHT); k.box(m.tail, 0.12, 0.07, 0.02, s * 0.2, 0.46, 1.225, 0, LIGHT); });
    [-0.24, -0.12, 0.12, 0.24].forEach(function(x) { k.cyl(m.chrome, 0.035, 0.12, x, 0.27, 1.2, 'z'); });
    return { L: 2.44, W: W, Y: 0.4, wheels: [[-0.64, 0.25, -0.76, 0.25, 0.24], [0.64, 0.25, -0.76, 0.25, 0.24], [-0.64, 0.29, 0.78, 0.29, 0.32], [0.64, 0.29, 0.78, 0.29, 0.32]] };
}

// ---------------- «Киборг»: чоппер с байкером ----------------
function buildCyborg(k, m, group) {
    // бак, сиденье, крылья
    k.sphere(m.body, 0.2, 1.1, 0.8, 1.9, 0, 0.76, -0.14, paintFlag());
    k.box(m.matte, 0.3, 0.08, 0.5, 0, 0.71, 0.3);
    k.box(m.matte, 0.24, 0.12, 0.14, 0, 0.78, 0.55);
    const rf = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.07, 8, 16, Math.PI * 0.75), m.body);
    rf.rotation.y = Math.PI / 2; rf.rotation.x = -0.25; rf.position.set(0, 0.3, 0.72); rf.userData.bodyPaint = true; group.add(rf);
    const ff = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.055, 8, 16, Math.PI * 0.55), m.body);
    ff.rotation.y = Math.PI / 2; ff.rotation.x = 0.55; ff.position.set(0, 0.3, -0.8); ff.userData.bodyPaint = true; group.add(ff);
    // рама и V-мотор
    k.rod(m.black, 0.035, [0, 0.66, -0.45], [0, 0.34, 0.1]);
    k.rod(m.black, 0.035, [0, 0.34, 0.1], [0, 0.3, 0.72]);
    k.rod(m.black, 0.03, [0, 0.66, 0.25], [0, 0.3, 0.72]);
    k.box(m.black, 0.2, 0.16, 0.3, 0, 0.36, 0.02);
    k.rod(m.chrome, 0.075, [0, 0.42, 0.02], [0, 0.66, -0.16]);
    k.rod(m.chrome, 0.075, [0, 0.42, 0.06], [0, 0.66, 0.2]);
    for (let i = 0; i < 4; i++) { k.cyl(m.chrome, 0.1, 0.012, 0, 0.5 + i * 0.04, -0.06 - i * 0.03, 'y'); }
    // два выхлопа справа
    [0.26, 0.34].forEach(function(y, i) { k.rod(m.chrome, 0.032, [0.14, y + 0.08, -0.02 + i * 0.05], [0.18, y, 0.3]); k.rod(m.chrome, 0.032, [0.18, y, 0.3], [0.18, y + 0.05, 1.0]); });
    // вилка, руль, фара
    [-1, 1].forEach(function(s) { k.rod(m.chrome, 0.028, [s * 0.08, 0.3, -0.8], [s * 0.08, 0.98, -0.52]); });
    k.rod(m.chrome, 0.022, [-0.4, 1.06, -0.42], [0, 1.0, -0.5]);
    k.rod(m.chrome, 0.022, [0.4, 1.06, -0.42], [0, 1.0, -0.5]);
    [-1, 1].forEach(function(s) { k.cyl(m.matte, 0.03, 0.12, s * 0.44, 1.06, -0.42, 'x'); });
    k.cyl(m.chrome, 0.1, 0.1, 0, 0.88, -0.64, 'z');
    k.cyl(m.hl, 0.085, 0.02, 0, 0.88, -0.695, 'z', LIGHT);
    k.box(m.tail, 0.1, 0.05, 0.03, 0, 0.62, 0.98, 0, LIGHT);
    // байкер: кожанка, джинсы, тёмные очки
    const leather = new THREE.MeshStandardMaterial({ color: 0x17130f, metalness: 0.35, roughness: 0.4 });
    const jeans = new THREE.MeshStandardMaterial({ color: 0x2c3f64, roughness: 0.85 });
    const skin = new THREE.MeshStandardMaterial({ color: 0xd9a47e, roughness: 0.7 });
    const hair = new THREE.MeshStandardMaterial({ color: 0x241a12, roughness: 0.8 });
    const shades = new THREE.MeshStandardMaterial({ color: 0x050505, metalness: 0.9, roughness: 0.05 });
    const torso = k.box(leather, 0.44, 0.5, 0.26, 0, 1.08, 0.18); torso.rotation.x = -0.28;
    k.box(leather, 0.46, 0.1, 0.22, 0, 1.3, 0.1); // плечи
    k.cyl(skin, 0.06, 0.1, 0, 1.38, 0.06, 'y'); // шея
    k.sphere(skin, 0.13, 1, 1.08, 1, 0, 1.5, 0.02);
    k.sphere(hair, 0.135, 1.02, 0.7, 1.05, 0, 1.56, 0.05);
    k.box(shades, 0.24, 0.045, 0.03, 0, 1.51, -0.1);
    [-1, 1].forEach(function(s) {
        k.rod(leather, 0.055, [s * 0.24, 1.28, 0.08], [s * 0.34, 1.12, -0.2]);
        k.rod(leather, 0.048, [s * 0.34, 1.12, -0.2], [s * 0.42, 1.06, -0.42]);
        k.sphere(skin, 0.04, 1, 1, 1, s * 0.43, 1.06, -0.44);
        k.rod(jeans, 0.075, [s * 0.12, 0.8, 0.3], [s * 0.2, 0.8, -0.1]);
        k.rod(jeans, 0.065, [s * 0.2, 0.8, -0.1], [s * 0.22, 0.4, -0.2]);
        k.box(m.matte, 0.1, 0.1, 0.2, s * 0.22, 0.34, -0.24); // сапоги
    });
    return { L: 1.95, W: 0.5, Y: 0.55, wheels: [[0, 0.3, -0.8, 0.3, 0.14], [0, 0.3, 0.72, 0.3, 0.16]] };
}

// ---------------- «Ночной мститель»: реактивная машина ----------------
function buildAvenger(k, m, group) {
    const W = 1.36;
    k.profile(m.body, [[-1.42, 0.2], [-1.52, 0.28], [-1.52, 0.42], [-1.38, 0.52], [-0.3, 0.6], [0.8, 0.61], [1.45, 0.56], [1.52, 0.48], [1.52, 0.25], [1.42, 0.2]], W, 0, 0.05, paintFlag());
    // крылья над колёсами — вытянутые обтекатели
    [-1, 1].forEach(function(s) { k.sphere(m.body, 0.3, 0.55, 0.55, 2.6, s * 0.58, 0.46, -0.1, paintFlag()); });
    // фонарь-кокпит
    k.sphere(m.glass, 0.4, 1.05, 0.7, 1.9, 0, 0.6, 0.05);
    // турбина спереди: кольца и тёмная глубина
    k.cyl(m.body, 0.22, 0.12, 0, 0.4, -1.52, 'z', paintFlag(), 24);
    k.cyl(m.matte, 0.18, 0.13, 0, 0.4, -1.53, 'z', null, 24);
    [0.17, 0.11, 0.05].forEach(function(r) { const t = new THREE.Mesh(new THREE.TorusGeometry(r, 0.012, 6, 24), m.chrome); t.position.set(0, 0.4, -1.6); group.add(t); });
    // узкие фары и воздухозаборники по бокам
    [-1, 1].forEach(function(s) {
        k.box(m.hl, 0.3, 0.05, 0.03, s * 0.44, 0.44, -1.585, 0, LIGHT);
        k.box(m.matte, 0.012, 0.12, 0.5, s * (W / 2 + 0.004), 0.44, 0.35);
    });
    // плавники-крылья сзади
    [-1, 1].forEach(function(s) {
        k.profile(m.body, [[0.35, 0.58], [1.3, 1.02], [1.42, 1.18], [1.5, 1.08], [1.56, 0.56]], 0.06, s * 0.56, 0.01, paintFlag());
    });
    // сопло с огнём
    k.cyl(m.black, 0.17, 0.2, 0, 0.42, 1.54, 'z', null, 24);
    k.cyl(new THREE.MeshStandardMaterial({ color: 0xff7a1a, emissive: 0xff5a00, emissiveIntensity: 1.8 }), 0.12, 0.05, 0, 0.42, 1.64, 'z', LIGHT, 24);
    [-1, 1].forEach(function(s) { k.box(m.tail, 0.3, 0.06, 0.02, s * 0.44, 0.46, 1.585, 0, LIGHT); });
    return { L: 3.05, W: W, Y: 0.42, wheels: [[-0.62, 0.28, -0.98, 0.28, 0.26], [0.62, 0.28, -0.98, 0.28, 0.26], [-0.62, 0.28, 0.95, 0.28, 0.3], [0.62, 0.28, 0.95, 0.28, 0.3]] };
}

const BUILDERS = { thief: buildThief, neon: buildNeon, bull: buildBull, cyborg: buildCyborg, avenger: buildAvenger };
const FINISH = { thief: { metal: 0.55, rough: 0.28 }, neon: { metal: 0.3, rough: 0.25 }, bull: { metal: 0.2, rough: 0.3 }, cyborg: { metal: 0.6, rough: 0.15 }, avenger: { metal: 0.7, rough: 0.2 } };

export function buildMovieCar(carId, preset) {
    const group = new THREE.Group();
    const m = mats((preset && preset.color) || 0x333333, FINISH[carId] || {});
    const k = kit(group);
    const d = BUILDERS[carId](k, m, group);
    const rim = carId === 'avenger' ? m.black : carId === 'thief' ? new THREE.MeshStandardMaterial({ color: 0x5a5e66, metalness: 0.7, roughness: 0.3 }) : m.chrome;
    const wheels = wheelSet(group, m, d.wheels, rim, carId === 'avenger' ? new THREE.MeshStandardMaterial({ color: 0xe8c020, metalness: 0.6, roughness: 0.3 }) : null);
    group.traverse(function(o) { if (o.isMesh) o.castShadow = true; });
    group.userData.carId = carId;
    group.userData.dims = { bodyL: d.L, bodyY: d.Y, bodyW: d.W };
    return { group: group, parts: {}, bodyMat: m.body, upgrades: { wheels: wheels, wheelR: d.wheels[0][3], byLevel: {} } };
}
