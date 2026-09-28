/**
 * Модель босса v2: плавные формы вместо кубиков, выразительная морда, видимая броня.
 *
 * buildBossCharacter(root, def, kit) собирает тело, руки, ноги и голову и возвращает детали,
 * на которые опирается анимация в main.js (руки, ноги, голова, челюсть) и бой (броня).
 * Материалы и хелперы приходят из boss.js (kit), чтобы не было циклического импорта.
 *
 * Масштаб: земля y = 0, бёдра ~0.52, плечи ~1.17, голова — отдельная группа (boss.js ставит её
 * на y 1.4 с масштабом 1.3), радиус черепа ~0.22 — под те же координаты рассчитаны фирменные
 * аксессуары (addBossSignature: кепки, каски, медали, хвосты).
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// вид головы по зверю
const HEADS = {
    BOAR: 'pig', BEAR: 'bear', GORILLA: 'ape', MONKEY: 'monkey', HIPPO: 'hippo',
    WOLF: 'canine', DOG: 'canine', ALPHA: 'canine',
    LION: 'feline', TIGER: 'feline', PANTHER: 'feline',
    BULL: 'bovine', RHINO: 'rhino',
    CROC: 'reptile', CROCODILE: 'reptile', LIZARD: 'reptile', DINO: 'reptile',
    SHARK: 'shark'
};
// телосложение
const BUILD = {
    BOAR: 'fat', HIPPO: 'fat', BULL: 'fat', GORILLA: 'big', RHINO: 'big', ALPHA: 'big', BEAR: 'big',
    PANTHER: 'thin', LIZARD: 'thin', MONKEY: 'thin'
};

export function headKind(animal) { return HEADS[animal] || 'bear'; }
export function buildKind(animal, id) {
    if (id === 'WOLF_NIGHT') return 'thin';
    if (id === 'WOLF_BIKER') return 'fat';
    return BUILD[animal] || 'normal';
}

export function buildBossCharacter(root, def, kit) {
    const M = kit.M;
    const mats = kit.mats;
    const seg = kit.seg || 14;
    const id = def.id || '';
    const animal = def.animal || 'BEAR';
    const build = buildKind(animal, id);
    const fat = build === 'fat', thin = build === 'thin', big = build === 'big';
    const W = fat ? 1.32 : big ? 1.2 : thin ? 0.92 : 1.08;   // ширина корпуса

    const shadowCast = !!(window.__lastQuality === 'high' && !window.__isMobile);
    function mesh(p, geo, mat, x, y, z) {
        const m = new THREE.Mesh(geo, mat);
        m.position.set(x || 0, y || 0, z || 0);
        m.castShadow = shadowCast;
        p.add(m);
        return m;
    }
    function sph(p, mat, r, x, y, z, sx, sy, sz) {
        const m = mesh(p, new THREE.SphereGeometry(r, seg, Math.max(8, seg - 2)), mat, x, y, z);
        m.scale.set(sx || 1, sy || sx || 1, sz || sx || 1);
        return m;
    }
    function cap(p, mat, r, len, x, y, z, rx, ry, rz) {
        const m = mesh(p, new THREE.CapsuleGeometry(r, len, 4, seg), mat, x, y, z);
        m.rotation.set(rx || 0, ry || 0, rz || 0);
        return m;
    }
    function rbox(p, mat, w, h, d, r, x, y, z) {
        return mesh(p, new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2, h / 2, d / 2)), mat, x, y, z);
    }
    function cone(p, mat, r, h, x, y, z, rx, ry, rz) {
        const m = mesh(p, new THREE.ConeGeometry(r, h, Math.max(6, seg - 4)), mat, x, y, z);
        m.rotation.set(rx || 0, ry || 0, rz || 0);
        return m;
    }

    // ---------------- ноги (шарнир в бедре) ----------------
    const hipY = 0.52;
    function leg(side) {
        const g = new THREE.Group();
        const r = fat ? 0.135 : thin ? 0.095 : 0.115;
        cap(g, mats.pants, r, 0.14, 0, -0.13, 0);
        cap(g, mats.pants, r * 0.88, 0.14, 0, -0.33, 0.01);
        // кроссовок: носок вперёд, белая подошва
        rbox(g, mats.shoe, r * 1.9, 0.1, 0.3, 0.045, 0, -0.465, 0.06);
        rbox(g, mats.sole, r * 1.95, 0.035, 0.31, 0.015, 0, -0.515, 0.06);
        g.position.set(side * (fat ? 0.2 : thin ? 0.15 : 0.17), hipY, 0);
        g.userData.baseY = hipY;
        g.userData.isBossLeg = true;
        g.userData.legSide = side;
        root.add(g);
        return g;
    }
    const leftLeg = leg(-1);
    const rightLeg = leg(1);

    // ---------------- корпус ----------------
    sph(root, mats.pants, 0.27, 0, 0.58, 0, W * 1.02, 0.72, 0.9);           // таз
    const torso = sph(root, mats.fur, 0.33, 0, 0.93, 0, W, 1.14, fat ? 1.08 : 0.9);
    // рубаха/грудь — светлее, выступает вперёд из-под куртки
    sph(root, mats.shirt, 0.28, 0, 0.97, 0.07, W * 0.9, 1.0, 0.78);
    if (fat) sph(root, mats.shirt, 0.24, 0, 0.8, 0.15, W * 0.95, 0.9, 0.75); // пузо
    // куртка нараспашку: оболочка без передней дольки
    const gap = thin ? 1.1 : 1.35;
    const jacketGeo = new THREE.SphereGeometry(0.35, seg + 4, seg, Math.PI / 2 + gap / 2, Math.PI * 2 - gap, 0.28, Math.PI * 0.62);
    const jacket = mesh(root, jacketGeo, mats.jacketDS, 0, 0.93, 0);
    jacket.scale.set(W * 1.06, 1.2, fat ? 1.12 : 0.97);
    // воротник и ремень
    const collar = mesh(root, new THREE.TorusGeometry(0.19, 0.055, 8, seg + 6), mats.jacket, 0, 1.23, -0.01);
    collar.rotation.x = Math.PI / 2; collar.scale.set(W * 0.95, 0.85, 1);
    const belt = mesh(root, new THREE.TorusGeometry(0.3, 0.045, 6, seg + 8), mats.gun, 0, 0.71, 0);
    belt.rotation.x = Math.PI / 2; belt.scale.set(W, fat ? 1.05 : 0.88, 1);
    rbox(root, mats.gold, 0.12, 0.09, 0.05, 0.015, 0, 0.71, (fat ? 0.31 : 0.27));
    // шея и плечи
    cap(root, mats.fur, 0.1, 0.06, 0, 1.29, 0);
    const shX = 0.33 * W + 0.06;
    sph(root, mats.jacket, 0.15, -shX, 1.16, 0, 1.05, 0.95, 1);
    sph(root, mats.jacket, 0.15, shX, 1.16, 0, 1.05, 0.95, 1);

    // ---------------- руки ----------------
    function arm(side) {
        const g = new THREE.Group();
        const r = fat || big ? 0.105 : thin ? 0.08 : 0.095;
        cap(g, mats.jacket, r, 0.17, 0, -0.15, 0);                            // рукав
        mesh(g, new THREE.TorusGeometry(r * 0.95, 0.025, 6, 12), mats.jacketD, 0, -0.27, 0).rotation.x = Math.PI / 2;
        cap(g, mats.fur, r * 0.86, 0.15, 0, -0.39, 0.02);                    // предплечье
        const hand = sph(g, mats.glove, 0.1, 0, -0.56, 0.04, 1.0, 1.05, 1.15); // кулак в перчатке
        hand.userData.isHand = true;
        cap(g, mats.glove, 0.035, 0.05, side * -0.07, -0.53, 0.09, 0.4, 0, side * 0.6); // большой палец
        g.position.set(side * shX, 1.15, 0.02);
        g.rotation.z = side * (thin ? 0.16 : 0.24);
        g.userData.isBossArm = true;
        root.add(g);
        return g;
    }
    const leftArm = arm(-1);
    const rightArm = arm(1);

    // ---------------- броня: слетает по фазам боя ----------------
    const armorMat = mats.armor;
    const rivet = function(p, x, y, z) { sph(p, mats.gold, 0.022, x, y, z); };
    const pads = [-1, 1].map(function(s) {
        const g = new THREE.Group();
        // наплечник: плоская пластина-«черепица» с кантом, а не шлем
        const dome = mesh(g, new THREE.SphereGeometry(0.15, seg, 8, 0, Math.PI * 2, 0, Math.PI * 0.45), armorMat, 0, 0, 0);
        dome.scale.set(1.15, 0.5, 1.1);
        mesh(g, new THREE.TorusGeometry(0.155, 0.016, 6, seg + 4), mats.trim, 0, 0.004, 0).rotation.x = Math.PI / 2;
        rivet(g, 0, 0.07, 0.07);
        g.position.set(s * shX, 1.23, 0);
        g.rotation.z = -s * 0.25;
        root.add(g);
        return g;
    });
    const chest = new THREE.Group();
    // нагрудник — на животе, одежда и медали остаются видны
    rbox(chest, armorMat, 0.3 * W, 0.18, 0.05, 0.02, 0, 0, 0);
    rbox(chest, mats.trim, 0.3 * W + 0.01, 0.03, 0.055, 0.01, 0, 0.06, 0.002);
    [[-0.1, -0.05], [0.1, -0.05]].forEach(function(p) { rivet(chest, p[0] * W, p[1], 0.03); });
    chest.position.set(0, 0.82, (fat ? 0.4 : 0.31));
    root.add(chest);

    // ---------------- голова ----------------
    const head = new THREE.Group();
    const jaw = new THREE.Group();
    head.add(jaw);
    buildHead(headKind(animal), head, jaw, { sph: sph, cap: cap, rbox: rbox, cone: cone, mesh: mesh, M: M, mats: mats, seg: seg, def: def, animal: animal });

    return {
        leftLeg: leftLeg, rightLeg: rightLeg, leftArm: leftArm, rightArm: rightArm,
        head: head, jaw: jaw, torso: torso,
        armor: { shoulders: pads, chest: chest },
        fat: fat, thin: thin
    };
}

/** Глаза с белком, радужкой, зрачком и бликом + злые брови. */
function eyes(h, o) {
    const { sph, cap, mats } = h;
    const out = [];
    [-1, 1].forEach(function(s) {
        const x = s * o.gap;
        const white = sph(o.p, mats.eyeW, o.r, x, o.y, o.z, 1, 1.1, 0.62);
        sph(o.p, mats.iris, o.r * 0.62, x + s * -o.r * 0.08, o.y - o.r * 0.05, o.z + o.r * 0.34, 1, 1, 0.5);
        sph(o.p, mats.pupil, o.r * 0.3, x + s * -o.r * 0.1, o.y - o.r * 0.05, o.z + o.r * 0.52, 1, 1, 0.5);
        const hl = sph(o.p, mats.highlight, o.r * 0.16, x - o.r * 0.22, o.y + o.r * 0.28, o.z + o.r * 0.6);
        hl.userData.noOutline = true;
        // бровь: внутренний конец ниже — злой прищур
        const b = cap(o.p, o.browMat || mats.furD, o.r * 0.2, o.r * 1.5, x, o.y + o.r * (o.browY || 1.2), o.z + o.r * 0.25, 0, 0, Math.PI / 2 + s * (o.anger == null ? 0.42 : o.anger));
        b.userData.brow = true;
        out.push(white);
    });
    return out;
}

function teethRow(h, p, n, x0, x1, y, z, len, down) {
    for (let i = 0; i < n; i++) {
        const k = n > 1 ? i / (n - 1) : 0.5;
        h.cone(p, h.mats.tooth, 0.018, len, x0 + (x1 - x0) * k, y, z, down ? Math.PI : 0, 0, 0);
    }
}

function buildHead(kind, head, jaw, h) {
    const { sph, cap, cone, mesh, mats, M, seg } = h;
    // верх черепа — по нему boss.js сажает шапки/каски аксессуаров
    const skull = function(sx, sy, sz, mat) { head.userData.top = 0.03 + 0.22 * sy; return sph(head, mat || mats.fur, 0.22, 0, 0.03, 0, sx, sy, sz); };
    jaw.position.set(0, -0.06, 0.1);

    if (kind === 'pig') {
        skull(1.08, 0.98, 1.0);
        sph(head, mats.furL, 0.13, 0, -0.1, 0.12, 1.2, 0.7, 0.9);                   // щёки-подбородок
        const snout = mesh(head, new THREE.CylinderGeometry(0.1, 0.115, 0.14, seg), mats.furL, 0, -0.03, 0.24);
        snout.rotation.x = Math.PI / 2;
        const disk = mesh(head, new THREE.CylinderGeometry(0.095, 0.095, 0.03, seg), mats.nosePink, 0, -0.03, 0.315);
        disk.rotation.x = Math.PI / 2;
        [-0.035, 0.035].forEach(function(x) { sph(head, mats.pupil, 0.022, x, -0.03, 0.33, 1, 1.3, 0.4); });
        // клыки вверх из нижней челюсти
        cone(jaw, mats.tooth, 0.03, 0.14, -0.11, 0.0, 0.14, -0.25, 0, 0.25);
        cone(jaw, mats.tooth, 0.03, 0.14, 0.11, 0.0, 0.14, -0.25, 0, -0.25);
        sph(jaw, mats.mouth, 0.08, 0, -0.03, 0.12, 1.3, 0.45, 0.6);
        // уши торчком, чуть обвислые кончики
        [-1, 1].forEach(function(s) { cone(head, mats.fur, 0.075, 0.18, s * 0.16, 0.22, -0.02, 0.3, 0, -s * 0.55); });
        eyes(h, { p: head, gap: 0.085, y: 0.08, z: 0.16, r: 0.052 });
    } else if (kind === 'bear') {
        skull(1.06, 1.0, 1.0);
        sph(head, mats.furL, 0.12, 0, -0.05, 0.17, 1.15, 0.82, 1.0);                // морда
        sph(head, mats.nose, 0.045, 0, -0.005, 0.29, 1.35, 0.9, 0.9);
        sph(jaw, mats.mouth, 0.07, 0, -0.03, 0.14, 1.3, 0.4, 0.5);
        teethRow(h, jaw, 4, -0.05, 0.05, 0.0, 0.19, 0.04, false);
        [-1, 1].forEach(function(s) {
            sph(head, mats.fur, 0.075, s * 0.17, 0.19, -0.02, 1, 1, 0.55);
            sph(head, mats.furL, 0.042, s * 0.17, 0.19, 0.01, 1, 1, 0.4);
        });
        eyes(h, { p: head, gap: 0.085, y: 0.07, z: 0.17, r: 0.05 });
    } else if (kind === 'ape') {
        skull(1.12, 1.02, 0.98, mats.furD);
        sph(head, mats.face, 0.16, 0, 0.0, 0.1, 1.2, 1.05, 0.72);                  // лицо
        cap(head, mats.furD, 0.045, 0.2, 0, 0.12, 0.2, 0, 0, Math.PI / 2);         // надбровная дуга
        sph(head, mats.face, 0.12, 0, -0.09, 0.17, 1.35, 0.8, 0.9);                // морда
        [-0.03, 0.03].forEach(function(x) { sph(head, mats.pupil, 0.018, x, -0.05, 0.28, 1.2, 0.8, 0.4); });
        sph(jaw, mats.mouth, 0.08, 0, -0.04, 0.12, 1.5, 0.45, 0.6);
        teethRow(h, jaw, 5, -0.07, 0.07, 0.0, 0.17, 0.035, false);
        [-1, 1].forEach(function(s) { sph(head, mats.face, 0.05, s * 0.21, 0.04, 0, 0.6, 1, 1); });
        eyes(h, { p: head, gap: 0.075, y: 0.06, z: 0.19, r: 0.045, browY: 1.05 });
    } else if (kind === 'monkey') {
        skull(1.0, 1.0, 0.98);
        sph(head, mats.face, 0.155, 0, 0.0, 0.1, 1.1, 1.2, 0.62);
        sph(head, mats.face, 0.1, 0, -0.08, 0.17, 1.25, 0.8, 0.9);
        sph(jaw, mats.mouth, 0.06, 0, -0.03, 0.13, 1.5, 0.45, 0.6);
        teethRow(h, jaw, 4, -0.05, 0.05, 0.0, 0.17, 0.03, false);
        [-1, 1].forEach(function(s) {
            sph(head, mats.fur, 0.085, s * 0.23, 0.04, -0.01, 0.45, 1, 1);
            sph(head, mats.face, 0.055, s * 0.235, 0.04, 0.01, 0.35, 1, 1);
        });
        eyes(h, { p: head, gap: 0.075, y: 0.07, z: 0.19, r: 0.055 });
    } else if (kind === 'hippo') {
        skull(1.1, 0.95, 1.0);
        sph(head, mats.furL, 0.17, 0, -0.07, 0.19, 1.35, 0.85, 1.05);              // огромная морда
        [-0.07, 0.07].forEach(function(x) { sph(head, mats.pupil, 0.028, x, 0.05, 0.33, 1.2, 0.8, 0.6); });
        sph(jaw, mats.mouth, 0.12, 0, -0.08, 0.16, 1.4, 0.4, 0.8);
        [-0.1, 0.1].forEach(function(x) { cone(jaw, mats.tooth, 0.03, 0.09, x, -0.03, 0.27, 0, 0, 0); });
        [-1, 1].forEach(function(s) { sph(head, mats.fur, 0.045, s * 0.15, 0.22, -0.04, 1, 1.2, 0.6); });
        eyes(h, { p: head, gap: 0.09, y: 0.14, z: 0.13, r: 0.045 });
    } else if (kind === 'canine') {
        skull(0.96, 1.0, 1.05);
        sph(head, mats.furL, 0.13, 0, -0.07, 0.1, 1.1, 0.8, 0.9);                  // скулы
        cap(head, mats.furL, 0.075, 0.14, 0, -0.04, 0.25, Math.PI / 2, 0, 0);       // морда вперёд
        sph(head, mats.nose, 0.04, 0, -0.01, 0.36, 1.3, 0.9, 0.9);
        sph(jaw, mats.mouth, 0.06, 0, -0.03, 0.2, 1.0, 0.4, 1.3);
        [-0.04, 0.04].forEach(function(x) { cone(jaw, mats.tooth, 0.018, 0.06, x, 0.0, 0.27, 0, 0, 0); });
        [-1, 1].forEach(function(s) {
            cone(head, mats.fur, 0.065, 0.2, s * 0.13, 0.24, -0.03, -0.1, 0, -s * 0.28);
            cone(head, mats.furL, 0.035, 0.12, s * 0.13, 0.23, -0.005, -0.1, 0, -s * 0.28);
        });
        eyes(h, { p: head, gap: 0.08, y: 0.07, z: 0.17, r: 0.048, anger: 0.55 });
    } else if (kind === 'feline') {
        skull(1.0, 0.98, 0.98);
        if (h.animal === 'LION') {
            // грива — два кольца «прядей» вокруг морды
            for (let ring = 0; ring < 2; ring++) {
                const n = 14 + ring * 4, rr = 0.2 + ring * 0.06;
                for (let i = 0; i < n; i++) {
                    const a = (i / n) * Math.PI * 2;
                    const c = cone(head, ring ? mats.mane : mats.maneL, 0.075, 0.2, Math.cos(a) * rr, 0.03 + Math.sin(a) * rr, -0.06 - ring * 0.05, 0, 0, a - Math.PI / 2);
                    c.scale.z = 0.6;
                }
            }
        }
        [-1, 1].forEach(function(s) { sph(head, mats.furL, 0.075, s * 0.055, -0.07, 0.19, 1, 0.85, 0.9); }); // щёки
        const nose = cone(head, mats.nosePink, 0.04, 0.05, 0, -0.02, 0.27, Math.PI, 0, 0);
        nose.scale.z = 0.6;
        sph(jaw, mats.mouth, 0.05, 0, -0.04, 0.14, 1.4, 0.4, 0.6);
        [-0.035, 0.035].forEach(function(x) { cone(jaw, mats.tooth, 0.016, 0.06, x, 0.01, 0.18, Math.PI, 0, 0); });
        if (h.animal !== 'LION') {
            [-1, 1].forEach(function(s) {
                cone(head, mats.fur, 0.07, 0.14, s * 0.14, 0.22, -0.02, 0, 0, -s * 0.35);
                cone(head, mats.furL, 0.04, 0.08, s * 0.14, 0.21, 0.005, 0, 0, -s * 0.35);
            });
        } else {
            [-1, 1].forEach(function(s) { sph(head, mats.fur, 0.05, s * 0.15, 0.2, 0, 1, 1, 0.5); });
        }
        // усы
        [-1, 1].forEach(function(s) {
            for (let i = 0; i < 3; i++) {
                const w = cap(head, mats.whisker, 0.004, 0.14, s * 0.12, -0.05 + i * 0.02, 0.22, 0, 0, Math.PI / 2 + s * (i - 1) * 0.15);
                w.userData.noOutline = true;
            }
        });
        eyes(h, { p: head, gap: 0.08, y: 0.07, z: 0.17, r: 0.05, anger: 0.5 });
    } else if (kind === 'bovine') {
        skull(1.12, 0.95, 1.0);
        sph(head, mats.furL, 0.13, 0, -0.08, 0.19, 1.3, 0.8, 0.9);
        [-0.05, 0.05].forEach(function(x) { sph(head, mats.pupil, 0.025, x, -0.07, 0.3, 1.2, 0.8, 0.5); });
        const ring = mesh(head, new THREE.TorusGeometry(0.04, 0.009, 6, 14), mats.gold, 0, -0.11, 0.3);
        ring.rotation.x = 0.3;
        sph(jaw, mats.mouth, 0.07, 0, -0.06, 0.16, 1.3, 0.35, 0.6);
        // рога: наружу, потом вверх
        [-1, 1].forEach(function(s) {
            cone(head, mats.horn, 0.05, 0.2, s * 0.24, 0.14, 0, 0, 0, -s * 1.35);
            cone(head, mats.horn, 0.033, 0.14, s * 0.36, 0.21, 0, 0, 0, -s * 0.3);
            sph(head, mats.fur, 0.05, s * 0.2, 0.08, -0.04, 1, 0.6, 0.6);
        });
        eyes(h, { p: head, gap: 0.095, y: 0.07, z: 0.15, r: 0.05, anger: 0.55 });
    } else if (kind === 'rhino') {
        skull(1.0, 0.95, 1.05);
        sph(head, mats.furL, 0.13, 0, -0.06, 0.19, 1.1, 0.85, 1.3);
        const horn = cone(head, mats.horn, 0.075, 0.3, 0, 0.09, 0.34, 0.6, 0, 0);
        horn.userData.horn = true;
        cone(head, mats.horn, 0.045, 0.14, 0, 0.13, 0.2, 0.35, 0, 0);
        sph(jaw, mats.mouth, 0.07, 0, -0.06, 0.18, 1.2, 0.35, 0.7);
        [-1, 1].forEach(function(s) { cone(head, mats.fur, 0.045, 0.1, s * 0.15, 0.2, -0.08, 0, 0, -s * 0.3); });
        eyes(h, { p: head, gap: 0.11, y: 0.06, z: 0.12, r: 0.042, anger: 0.5 });
    } else if (kind === 'reptile') {
        const dino = h.animal === 'DINO';
        const liz = h.animal === 'LIZARD';
        skull(1.05, 0.82, 1.08);
        // верхняя челюсть — длинная сплющенная, с ноздрями на кончике
        h.rbox(head, mats.fur, liz ? 0.22 : 0.27, 0.09, dino ? 0.3 : 0.34, 0.04, 0, -0.02, 0.27);
        [-0.04, 0.04].forEach(function(x) { sph(head, mats.furD, 0.022, x, 0.03, 0.42, 1, 0.8, 1); });
        teethRow(h, head, 6, -0.11, 0.11, -0.075, 0.33, 0.045, true);
        // нижняя челюсть — анимируется
        h.rbox(jaw, mats.furL, liz ? 0.2 : 0.25, 0.06, dino ? 0.28 : 0.32, 0.03, 0, -0.06, 0.18);
        teethRow(h, jaw, 5, -0.09, 0.09, -0.02, 0.25, 0.04, false);
        // глаза на «кочках» сверху черепа
        [-1, 1].forEach(function(s) { sph(head, mats.fur, 0.07, s * 0.085, 0.1, 0.1, 1, 0.8, 1); });
        eyes(h, { p: head, gap: 0.085, y: 0.12, z: 0.15, r: 0.05, anger: 0.5, browY: 1.0 });
        if (dino) for (let i = 0; i < 5; i++) cone(head, mats.acc, 0.045, 0.14 + (i % 2) * 0.05, 0, 0.2, 0.08 - i * 0.07, -0.2, 0, 0);
        if (liz) [-1, 1].forEach(function(s) { const f = cone(head, mats.acc, 0.12, 0.08, s * 0.2, -0.02, -0.04, 0, 0, -s * 1.5); f.scale.z = 0.3; });
    } else if (kind === 'shark') {
        // вытянутая голова: тёмный верх, светлый низ, рыло вперёд, глаза по бокам
        skull(0.9, 0.85, 1.25);
        sph(head, mats.fur, 0.15, 0, 0.02, 0.24, 0.95, 0.75, 1.1);                  // рыло
        sph(head, mats.furL, 0.17, 0, -0.08, 0.12, 1.05, 0.55, 1.35);               // светлое брюхо морды
        // пасть-улыбка с треугольными зубами
        sph(jaw, mats.mouth, 0.12, 0, -0.05, 0.12, 1.2, 0.35, 0.8);
        teethRow(h, head, 7, -0.12, 0.12, -0.075, 0.21, 0.05, true);
        teethRow(h, jaw, 6, -0.1, 0.1, -0.03, 0.2, 0.045, false);
        [-1, 1].forEach(function(s) {
            for (let i = 0; i < 3; i++) cap(head, mats.furD, 0.008, 0.08, s * 0.2, 0.0, 0.02 - i * 0.05, 0, 0, 0);
        });
        eyes(h, { p: head, gap: 0.13, y: 0.07, z: 0.2, r: 0.045, anger: 0.6 });
    } else {
        skull(1, 1, 1);
        eyes(h, { p: head, gap: 0.085, y: 0.07, z: 0.17, r: 0.05 });
    }
}
