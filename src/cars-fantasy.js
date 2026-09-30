/**
 * Вторая шестёрка машин «из кино и мультфильмов» — свои имена, без чужих марок и логотипов:
 *   trike    «Трайк»                 — байкерский трицикл: чоппер-вилка, два колеса сзади, байкер в шлеме;
 *   moped    «Мопед»                 — рижский мопед 90-х с щитком, багажником и водителем в спортивном костюме;
 *   ghostcar «Призрачный патруль»     — катафалк-«скорая» 50-х: плавники, хром, на крыше — баллоны, пульт, мигалки;
 *   chariot  «Колесница морского царя» — золотая раковина на колёсах, два морских конька, трезубец;
 *   timecar  «Машина времени»         — стальной клин с дверями-крыльями, жалюзи, реактор, катушки и трубы;
 *   carpet   «Ковёр-самолёт»          — узорный ковёр с кистями парит над дорогой (колёс нет).
 * Сборка — как у src/cars-movie.js (оттуда общие детали: профиль кузова, стёкла, колёса).
 */
import * as THREE from 'three';
import { pane, paintFlag, LIGHT } from './cars-movie.js';

const MC = {};
function M(c, o) {
    const key = c + '|' + JSON.stringify(o || {});
    if (!MC[key]) MC[key] = new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.6, metalness: 0.1 }, o || {}));
    return MC[key];
}
const GLOW = function(c, k) { return new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: k || 1.4, roughness: 0.4 }); };

/** Водитель мотоцикла/мопеда: бёдра, плечи, руль, ступни — точками; шлем или причёска */
function rider(k, m, o) {
    const J = M(o.jacket, { roughness: 0.5, metalness: o.leather ? 0.3 : 0.05 }), P = M(o.pants, { roughness: 0.85 }), S = M(0xd9a47e, { roughness: 0.7 });
    const hy = o.hipY, hz = o.hipZ, sy = o.shY, sz = o.shZ;
    k.rod(J, 0.17, [0, hy, hz], [0, sy, sz]);
    k.box(J, 0.46, 0.12, 0.22, 0, sy, sz);
    const head = [0, sy + 0.22, sz - 0.03];
    k.cyl(S, 0.06, 0.1, 0, sy + 0.08, sz, 'y');
    k.sphere(S, 0.13, 1, 1.08, 1, head[0], head[1], head[2]);
    if (o.helmet) {
        k.sphere(M(o.helmet, { roughness: 0.2, metalness: 0.3 }), 0.165, 1, 1.02, 1.08, head[0], head[1] + 0.03, head[2] + 0.01);
        k.box(M(0x101418, { roughness: 0.05, metalness: 0.8 }), 0.24, 0.08, 0.03, head[0], head[1], head[2] - 0.15); // визор
    } else {
        k.sphere(M(0x241a12, { roughness: 0.8 }), 0.135, 1.02, 0.7, 1.05, head[0], head[1] + 0.06, head[2] + 0.03);
        k.box(M(0x050505, { roughness: 0.05, metalness: 0.9 }), 0.24, 0.045, 0.03, head[0], head[1] + 0.01, head[2] - 0.12);
    }
    if (o.stripe) [-1, 1].forEach(function(s) { k.rod(M(o.stripe), 0.02, [s * 0.18, hy + 0.02, hz], [s * 0.23, sy, sz]); });
    [-1, 1].forEach(function(s) {
        const sh = [s * 0.24, sy - 0.02, sz], gr = [s * o.grip[0], o.grip[1], o.grip[2]];
        const el = [s * (o.grip[0] + 0.05), (sh[1] + gr[1]) / 2 - 0.05, (sh[2] + gr[2]) / 2];
        k.rod(J, 0.052, sh, el); k.rod(J, 0.046, el, gr);
        k.sphere(S, 0.04, 1, 1, 1, gr[0], gr[1], gr[2] - 0.02);
        const hp = [s * 0.11, hy, hz], kn = [s * o.knee[0], o.knee[1], o.knee[2]], ft = [s * o.foot[0], o.foot[1], o.foot[2]];
        k.rod(P, 0.075, hp, kn); k.rod(P, 0.062, kn, ft);
        k.box(M(0x151515), 0.1, 0.1, 0.2, ft[0], ft[1] - 0.04, ft[2] - 0.03);
    });
}

// ---------------- «Трайк» ----------------
function buildTrike(k, m, group) {
    const chrome = m.chrome, black = m.black;
    // задний кузов между колёсами и крылья над ними
    k.profile(m.body, [[0.22, 0.32], [0.26, 0.6], [0.7, 0.68], [1.08, 0.6], [1.14, 0.36], [0.98, 0.26], [0.34, 0.26]], 0.86, 0, 0.05, paintFlag());
    [-1, 1].forEach(function(s) { k.sphere(m.body, 0.38, 0.62, 0.6, 1.15, s * 0.56, 0.44, 0.66, paintFlag()); });
    // сиденье со спинкой-дугой, бак, рама, V-мотор
    k.box(m.matte, 0.36, 0.1, 0.52, 0, 0.72, 0.2);
    k.box(m.matte, 0.3, 0.26, 0.08, 0, 0.9, 0.48);
    [-1, 1].forEach(function(s) { k.rod(chrome, 0.018, [s * 0.16, 0.7, 0.52], [s * 0.14, 1.1, 0.56]); });
    k.rod(chrome, 0.018, [-0.14, 1.1, 0.56], [0.14, 1.1, 0.56]);
    k.sphere(m.body, 0.2, 1.1, 0.8, 1.9, 0, 0.82, -0.35, paintFlag());
    k.rod(black, 0.035, [0, 0.72, -0.65], [0, 0.34, -0.1]);
    k.rod(black, 0.035, [0, 0.34, -0.1], [0, 0.32, 0.3]);
    k.box(black, 0.22, 0.18, 0.32, 0, 0.36, -0.08);
    k.rod(chrome, 0.075, [0, 0.42, -0.1], [0, 0.66, -0.28]);
    k.rod(chrome, 0.075, [0, 0.42, -0.04], [0, 0.66, 0.12]);
    for (let i = 0; i < 4; i++) k.cyl(chrome, 0.1, 0.012, 0, 0.5 + i * 0.04, -0.16 - i * 0.03, 'y');
    // длинная вилка чоппера, руль «обезьяна», фара
    [-1, 1].forEach(function(s) { k.rod(chrome, 0.03, [s * 0.08, 0.3, -1.05], [s * 0.08, 1.02, -0.72]); });
    [-1, 1].forEach(function(s) {
        k.rod(chrome, 0.022, [s * 0.1, 1.02, -0.72], [s * 0.3, 1.28, -0.62]);
        k.rod(chrome, 0.022, [s * 0.3, 1.28, -0.62], [s * 0.44, 1.24, -0.5]);
        k.cyl(m.matte, 0.03, 0.12, s * 0.49, 1.24, -0.5, 'x');
    });
    const fork = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.05, 8, 16, Math.PI * 0.55), m.body);
    fork.rotation.y = Math.PI / 2; fork.rotation.x = 0.6; fork.position.set(0, 0.3, -1.05); fork.userData.bodyPaint = true; group.add(fork);
    k.cyl(chrome, 0.11, 0.1, 0, 0.9, -0.86, 'z');
    k.cyl(m.hl, 0.095, 0.02, 0, 0.9, -0.915, 'z', LIGHT);
    // трубы по бокам и фонари
    [-1, 1].forEach(function(s) {
        k.rod(chrome, 0.035, [s * 0.14, 0.44, -0.05], [s * 0.34, 0.3, 0.3]);
        k.rod(chrome, 0.035, [s * 0.34, 0.3, 0.3], [s * 0.34, 0.34, 1.2]);
        k.box(m.tail, 0.14, 0.06, 0.02, s * 0.3, 0.5, 1.16, 0, LIGHT);
    });
    rider(k, m, { hipY: 0.82, hipZ: 0.24, shY: 1.34, shZ: 0.1, grip: [0.44, 1.24, -0.5], knee: [0.24, 0.9, -0.28], foot: [0.26, 0.5, -0.6], jacket: 0x17130f, pants: 0x2c3f64, leather: true, helmet: 0x111111 });
    return { L: 2.35, W: 1.3, Y: 0.5, wheels: [[0, 0.3, -1.05, 0.3, 0.14], [-0.56, 0.32, 0.66, 0.32, 0.24], [0.56, 0.32, 0.66, 0.32, 0.24]] };
}

// ---------------- «Мопед» ----------------
function buildMoped(k, m, group) {
    const chrome = m.chrome;
    // кузов под сиденьем и щиток для ног
    k.profile(m.body, [[-0.3, 0.3], [-0.24, 0.52], [0.12, 0.6], [0.72, 0.6], [0.76, 0.4], [0.2, 0.28]], 0.34, 0, 0.05, paintFlag());
    const shield = k.box(m.body, 0.4, 0.5, 0.05, 0, 0.56, -0.4, 0, paintFlag()); shield.rotation.x = -0.25;
    k.box(M(0xf2f2ee), 0.36, 0.05, 0.052, 0, 0.62, -0.41); // белая полоса на щитке
    k.box(m.matte, 0.26, 0.09, 0.46, 0, 0.68, 0.36);
    // багажник, мотор, педали, выхлоп
    k.box(chrome, 0.28, 0.02, 0.26, 0, 0.66, 0.74);
    [-1, 1].forEach(function(s) { k.rod(chrome, 0.012, [s * 0.13, 0.66, 0.62], [s * 0.13, 0.66, 0.87]); });
    k.box(m.black, 0.18, 0.14, 0.24, 0, 0.3, 0.1);
    [-1, 1].forEach(function(s) { k.box(m.black, 0.1, 0.02, 0.06, s * 0.18, 0.3, -0.05); });
    k.rod(chrome, 0.025, [0.08, 0.28, 0.2], [0.14, 0.26, 0.72]);
    // вилка, руль с зеркалами, круглая фара, крыло
    [-1, 1].forEach(function(s) { k.rod(chrome, 0.022, [s * 0.06, 0.24, -0.62], [s * 0.06, 0.86, -0.5]); });
    k.rod(chrome, 0.02, [-0.3, 0.9, -0.46], [0.3, 0.9, -0.46]);
    [-1, 1].forEach(function(s) {
        k.cyl(m.matte, 0.025, 0.1, s * 0.33, 0.9, -0.46, 'x');
        k.rod(chrome, 0.01, [s * 0.24, 0.9, -0.46], [s * 0.3, 1.08, -0.5]);
        k.cyl(chrome, 0.045, 0.012, s * 0.3, 1.1, -0.5, 'z');
    });
    k.cyl(chrome, 0.08, 0.08, 0, 0.84, -0.57, 'z');
    k.cyl(m.hl, 0.068, 0.02, 0, 0.84, -0.615, 'z', LIGHT);
    const ff = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.04, 8, 14, Math.PI * 0.55), m.body);
    ff.rotation.y = Math.PI / 2; ff.rotation.x = 0.6; ff.position.set(0, 0.24, -0.62); ff.userData.bodyPaint = true;
    group.add(ff);
    k.box(m.tail, 0.1, 0.05, 0.02, 0, 0.5, 0.78, 0, LIGHT);
    rider(k, m, { hipY: 0.74, hipZ: 0.42, shY: 1.2, shZ: 0.24, grip: [0.3, 0.9, -0.46], knee: [0.18, 0.74, -0.06], foot: [0.17, 0.34, -0.1], jacket: 0x2255aa, pants: 0x2255aa, stripe: 0xf2f2f2, helmet: 0xf2f2ee });
    return { L: 1.5, W: 0.5, Y: 0.45, wheels: [[0, 0.24, -0.62, 0.24, 0.08], [0, 0.24, 0.56, 0.24, 0.09]] };
}

// ---------------- «Призрачный патруль» ----------------
function buildGhostcar(k, m, group) {
    const W = 1.42, red = M(0xc81e1e, { roughness: 0.35, metalness: 0.2 }), chrome = m.chrome, alu = M(0xb0b4ba, { metalness: 0.7, roughness: 0.35 });
    k.profile(m.body, [[-1.5, 0.24], [-1.6, 0.32], [-1.6, 0.52], [-1.46, 0.62], [-0.55, 0.66], [-0.3, 0.68], [1.3, 0.72], [1.6, 0.74], [1.62, 0.34], [1.48, 0.24]], W, 0, 0.04, paintFlag());
    const cab = [[-0.32, 0.67], [-0.06, 1.2], [1.34, 1.22], [1.42, 0.72]];
    k.profile(m.body, cab, 1.3, 0, 0.03, paintFlag());
    pane(k, m.glass, cab[0], cab[1], 1.2);
    k.profile(m.glass, [[-0.2, 0.75], [-0.03, 1.13], [0.42, 1.13], [0.42, 0.75]], 1.335, 0, 0);
    k.profile(m.glass, [[0.55, 0.8], [0.55, 1.12], [1.26, 1.12], [1.26, 0.8]], 1.335, 0, 0);
    // красные плавники с пулями-фонарями и полосы по бокам
    [-1, 1].forEach(function(s) {
        k.profile(red, [[0.85, 0.7], [1.52, 1.0], [1.64, 0.98], [1.64, 0.7]], 0.07, s * 0.64, 0.01);
        [0.9, 0.8].forEach(function(y) { k.cyl(m.tail, 0.045, 0.06, s * 0.64, y, 1.66, 'z', LIGHT); });
        k.box(red, 0.012, 0.07, 2.9, s * (W / 2 + 0.006), 0.5, 0);
        k.box(red, 0.012, 0.04, 2.9, s * (W / 2 + 0.006), 0.4, 0);
    });
    // хром: бампера с «клыками», решётка, четыре круглые фары
    k.box(chrome, W * 1.03, 0.12, 0.12, 0, 0.32, -1.66);
    [-0.36, 0.36].forEach(function(x) { k.sphere(chrome, 0.08, 1, 1, 1.3, x, 0.38, -1.72); });
    k.box(chrome, W * 0.72, 0.16, 0.04, 0, 0.47, -1.63);
    for (let i = 0; i < 6; i++) k.box(m.black, W * 0.68, 0.012, 0.045, 0, 0.41 + i * 0.024, -1.635);
    [-1, 1].forEach(function(s) { [0.36, 0.52].forEach(function(x) { k.cyl(chrome, 0.07, 0.04, s * x, 0.54, -1.62, 'z'); k.cyl(m.hl, 0.058, 0.05, s * x, 0.54, -1.635, 'z', LIGHT); }); });
    k.box(chrome, W * 1.03, 0.12, 0.12, 0, 0.32, 1.66);
    k.box(m.glass, 1.0, 0.3, 0.02, 0, 0.98, 1.432);                    // заднее стекло
    k.box(m.black, 0.012, 0.5, 0.02, 0, 0.72, 1.62);                   // створки задней двери «скорой»
    k.box(chrome, 0.1, 0.03, 0.03, 0.12, 0.7, 1.625);
    k.box(M(0xf4f4ee), 0.36, 0.1, 0.02, 0, 0.42, 1.63);                // номер
    // крыша: рейлинги и снаряжение
    [-1, 1].forEach(function(s) { k.box(alu, 0.05, 0.05, 1.45, s * 0.58, 1.28, 0.62); });
    [0, 0.6, 1.2].forEach(function(z) { k.box(alu, 1.2, 0.04, 0.05, 0, 1.27, z + 0.02); });
    k.cyl(M(0xdedede, { metalness: 0.5, roughness: 0.3 }), 0.13, 0.8, -0.22, 1.42, 0.75, 'z');
    k.cyl(M(0xdedede, { metalness: 0.5, roughness: 0.3 }), 0.1, 0.6, 0.28, 1.39, 0.9, 'z');
    k.box(M(0x6a6e76, { metalness: 0.4 }), 0.42, 0.18, 0.3, 0.22, 1.4, 0.3);
    [[0.12, 0xffd23c], [0.22, 0x5aff8a], [0.32, 0xff4a3c]].forEach(function(q) { k.box(GLOW(q[1], 1.2), 0.05, 0.04, 0.02, q[0], 1.44, 0.14, 0, LIGHT); });
    const dish = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), alu);
    dish.rotation.x = -1.1; dish.position.set(-0.3, 1.46, 0.1); group.add(dish);
    k.cyl(M(0xf08a20), 0.03, 0.9, 0.05, 1.33, 0.75, 'z');
    const hose = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.025, 6, 16, Math.PI), M(0xf08a20)); hose.position.set(-0.45, 1.34, 1.25); hose.rotation.y = Math.PI / 2; group.add(hose);
    [-1, 1].forEach(function(s) { k.cyl(m.tail, 0.07, 0.12, s * 0.52, 1.32, -0.02, 'y', LIGHT); });  // красные «вишни» спереди на крыше
    k.cyl(GLOW(0xffffff, 0.8), 0.05, 0.1, 0, 1.32, -0.02, 'y', LIGHT);
    k.rod(alu, 0.01, [0.5, 1.3, 1.3], [0.5, 1.9, 1.35]);
    // белые боковины шин
    [[-1, -1.0], [1, -1.0], [-1, 1.02], [1, 1.02]].forEach(function(q) {
        const t = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.04, 6, 20), M(0xf2f2f2)); t.rotation.y = Math.PI / 2; t.position.set(q[0] * 0.77, 0.31, q[1]); group.add(t);
    });
    return { L: 3.25, W: W, Y: 0.5, wheels: [[-0.64, 0.31, -1.0, 0.31, 0.24], [0.64, 0.31, -1.0, 0.31, 0.24], [-0.64, 0.31, 1.02, 0.31, 0.24], [0.64, 0.31, 1.02, 0.31, 0.24]] };
}

// ---------------- «Колесница морского царя» ----------------
function buildChariot(k, m, group) {
    const sea = M(0x1fb5a8, { roughness: 0.4, metalness: 0.2 }), belly = M(0xa8f0e0, { roughness: 0.5 }), pearl = M(0xf6f2ea, { roughness: 0.15, metalness: 0.3 });
    // чаша-раковина и веер-спинка из рёбер с жемчугом
    const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.62, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), m.body);
    bowl.scale.set(1, 0.75, 1.05); bowl.position.set(0, 0.86, 0.3); bowl.userData.bodyPaint = true; group.add(bowl);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.04, 8, 32), m.body); rim.rotation.x = Math.PI / 2; rim.scale.set(1, 1.05, 1); rim.position.set(0, 0.86, 0.3); rim.userData.bodyPaint = true; group.add(rim);
    for (let i = 0; i <= 10; i++) {
        const a = -1.2 + i * 0.24;
        const rib = k.box(m.body, 0.13, 1.0, 0.05, Math.sin(a) * 0.46, 0.86 + Math.cos(a) * 0.46, 0.88, 0, paintFlag());
        rib.rotation.z = -a;
        k.sphere(pearl, 0.045, 1, 1, 1, Math.sin(a) * 0.98, 0.86 + Math.cos(a) * 0.98, 0.9);
    }
    k.box(M(0x2a8fd8, { roughness: 0.7 }), 0.9, 0.12, 0.42, 0, 0.9, 0.5);
    // дышло и два морских конька в упряжке
    k.rod(m.body, 0.035, [0, 0.62, -0.22], [0, 0.72, -1.1]);
    [-1, 1].forEach(function(s) {
        const x = s * 0.42, z = -1.3, Y = function(y) { return 0.42 + (y - 0.42) * 0.72; }; // коньки пониже — не закрывают дорогу впереди
        k.sphere(sea, 0.15, 0.85, 1.35, 0.8, x, Y(0.98), z);
        k.sphere(belly, 0.12, 0.7, 1.1, 0.5, x, Y(0.98), z - 0.08);
        for (let i = 0; i < 4; i++) k.box(belly, 0.15, 0.015, 0.04, x, Y(0.82 + i * 0.1), z - 0.13);
        k.rod(sea, 0.07, [x, Y(1.2), z], [x, Y(1.42), z - 0.05]);
        k.sphere(sea, 0.1, 1, 1.05, 1.2, x, Y(1.52), z - 0.08);
        k.cyl(sea, 0.035, 0.22, x, Y(1.47), z - 0.25, 'z');
        [-1, 1].forEach(function(e) { k.sphere(M(0x111111), 0.02, 1, 1, 1, x + e * 0.075, Y(1.56), z - 0.13); });
        k.box(M(0x0e8f84), 0.02, 0.36, 0.09, x, Y(1.25), z + 0.11);  // гребень по спине
        const tail = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.035, 8, 16, Math.PI * 1.5), sea);
        tail.rotation.y = Math.PI / 2; tail.position.set(x, Y(0.66), z + 0.08); group.add(tail);
        k.rod(m.body, 0.012, [x, Y(1.3), z - 0.02], [s * 0.2, 1.0, -0.2]);   // вожжи
    });
    // трезубец у спинки
    k.rod(m.body, 0.025, [0.62, 0.7, 0.75], [0.62, 1.95, 0.75]);
    k.rod(m.body, 0.02, [0.5, 1.8, 0.75], [0.74, 1.8, 0.75]);
    [0.5, 0.62, 0.74].forEach(function(x) { k.rod(m.body, 0.018, [x, 1.8, 0.75], [x, 2.02, 0.75]); const c = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.09, 8), m.body); c.position.set(x, 2.06, 0.75); group.add(c); });
    // жемчужные фонари спереди, красные — сзади
    [-1, 1].forEach(function(s) { k.sphere(m.hl, 0.07, 1, 1, 1, s * 0.34, 0.72, -0.26, LIGHT); k.sphere(m.tail, 0.045, 1, 1, 1, s * 0.3, 0.7, 0.92, LIGHT); });
    return { L: 2.7, W: 1.3, Y: 0.62, wheels: [[-0.66, 0.38, 0.3, 0.38, 0.1], [0.66, 0.38, 0.3, 0.38, 0.1]] };
}

// ---------------- «Машина времени» ----------------
function buildTimecar(k, m, group) {
    const W = 1.3, black = m.black, copper = M(0xc8743a, { metalness: 0.8, roughness: 0.3 }), steel = M(0x8c9096, { metalness: 0.8, roughness: 0.4 });
    k.profile(m.body, [[-1.16, 0.24], [-1.24, 0.3], [-1.25, 0.42], [-1.12, 0.5], [-0.42, 0.6], [-0.32, 0.61], [0.96, 0.7], [1.2, 0.68], [1.22, 0.3], [1.12, 0.24]], W, 0, 0.02, paintFlag());
    const cab = [[-0.36, 0.6], [0.02, 0.97], [0.42, 0.98], [0.98, 0.71]];
    k.profile(m.body, cab.concat([[0.98, 0.66]]), 1.12, 0, 0.02, paintFlag());
    pane(k, m.glass, cab[0], cab[1], 1.02);
    k.profile(m.glass, [[-0.24, 0.64], [0.04, 0.92], [0.38, 0.93], [0.38, 0.64]], 1.145, 0, 0);
    // жалюзи на заднем стекле
    const dz = cab[3][0] - cab[2][0], dy = cab[3][1] - cab[2][1], ang = -Math.atan2(dy, dz);
    for (let i = 0; i < 10; i++) { const t = (i + 0.5) / 10; const sl = k.box(black, 0.98, 0.014, 0.05, 0, cab[2][1] + dy * t + 0.022, cab[2][0] + dz * t); sl.rotation.x = ang; }
    // чёрный низ, бампера, швы дверей-крыльев и ручки
    [-1, 1].forEach(function(s) {
        k.box(black, 0.012, 0.13, 2.3, s * (W / 2 + 0.006), 0.33, 0);
        [-0.3, 0.52].forEach(function(z) { k.box(black, 0.01, 0.34, 0.012, s * (W / 2 + 0.004), 0.6, z); });
        k.box(black, 0.01, 0.012, 0.82, s * (W / 2 + 0.004), 0.77, 0.11);
        k.box(black, 0.3, 0.012, 0.012, s * 0.42, 0.975, 0.1);    // шов двери на крыше
        k.box(black, 0.012, 0.02, 0.08, s * (W / 2 + 0.008), 0.66, 0.42);
        // боковые жалюзи за дверью
        for (let i = 0; i < 4; i++) k.box(black, 0.012, 0.018, 0.2, s * (W / 2 + 0.005), 0.54 + i * 0.035, 0.76);
    });
    k.box(black, W * 1.0, 0.14, 0.1, 0, 0.3, -1.28);
    k.box(black, W * 1.0, 0.14, 0.1, 0, 0.3, 1.27);
    // перед: чёрная полоса, четыре прямоугольные фары, поворотники
    k.box(black, W * 0.86, 0.11, 0.02, 0, 0.44, -1.245);
    [-1, 1].forEach(function(s) {
        [0.2, 0.43].forEach(function(x) { k.box(m.hl, 0.17, 0.06, 0.02, s * x, 0.445, -1.26, 0, LIGHT); });
        k.box(GLOW(0xffa020, 1.2), 0.08, 0.04, 0.02, s * 0.57, 0.36, -1.26, 0, LIGHT);
    });
    // зад: полоса фонарей с решёткой, номер «ОПОЗДАЛ»
    k.box(black, W * 0.92, 0.16, 0.02, 0, 0.52, 1.235);
    [-1, 1].forEach(function(s) { [0.22, 0.44].forEach(function(x) { k.box(m.tail, 0.17, 0.05, 0.02, s * x, 0.53, 1.25, 0, LIGHT); }); });
    for (let i = 0; i < 4; i++) k.box(steel, 0.3, 0.012, 0.022, 0, 0.47 + i * 0.03, 1.248);
    if (typeof document !== 'undefined') {
        const cv = document.createElement('canvas'); cv.width = 256; cv.height = 64; const g = cv.getContext('2d');
        g.fillStyle = '#f4f4ee'; g.fillRect(0, 0, 256, 64); g.strokeStyle = '#222'; g.lineWidth = 4; g.strokeRect(2, 2, 252, 60);
        g.fillStyle = '#16305e'; g.font = '900 40px system-ui, Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('ОПОЗДАЛ', 128, 34);
        const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
        const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.11), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5 }));
        plate.position.set(0, 0.33, 1.33); group.add(plate);
    }
    // «реактор» на крышке мотора, трубы-сопла с кольцами и синим свечением, провода по бокам
    k.cyl(M(0xf2f2ee, { roughness: 0.3 }), 0.1, 0.16, 0, 0.8, 1.06, 'y');
    k.sphere(black, 0.1, 1, 0.6, 1, 0, 0.88, 1.06);
    [-1, 1].forEach(function(s) {
        k.cyl(steel, 0.075, 0.42, s * 0.42, 0.7, 1.2, 'z');
        k.cyl(GLOW(0x66ccff, 2), 0.055, 0.02, s * 0.42, 0.7, 1.42, 'z', LIGHT);
        for (let i = 0; i < 3; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.014, 6, 16), copper); r.position.set(s * 0.42, 0.7, 1.05 + i * 0.1); group.add(r); }
        k.rod(black, 0.02, [s * 0.5, 0.74, 0.98], [s * 0.66, 0.44, 0.3]);
        k.rod(M(0xf08a20), 0.016, [s * 0.46, 0.74, 0.98], [s * 0.665, 0.4, 0.1]);
        k.rod(copper, 0.03, [s * 0.665, 0.37, -0.6], [s * 0.665, 0.37, 0.95]);   // жгут у порога
        for (let i = 0; i < 6; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.01, 6, 12), steel); r.rotation.y = Math.PI / 2; r.position.set(s * 0.665, 0.37, -0.5 + i * 0.28); group.add(r); }
    });
    // салон: табло времени и светящаяся «Y» за сиденьями
    [[-0.2, 0xff3a2a], [0, 0x5aff8a], [0.2, 0xffc020]].forEach(function(q) { k.box(GLOW(q[1], 1.6), 0.14, 0.04, 0.02, q[0], 0.7, -0.22, 0, LIGHT); });
    k.box(black, 0.3, 0.3, 0.05, 0, 0.78, 0.36);
    const yc = [0, 0.8, 0.33];
    [[-0.1, 0.92], [0.1, 0.92], [0, 0.66]].forEach(function(e) { k.rod(GLOW(0xfff4b0, 2.2), 0.018, yc, [e[0], e[1], 0.33], LIGHT); });
    k.rod(steel, 0.008, [0.5, 0.62, 0.9], [0.5, 1.3, 1.0]);   // антенна
    [-1, 1].forEach(function(s) { k.box(black, 0.12, 0.06, 0.03, s * 0.64, 0.7, -0.3); k.rod(black, 0.01, [s * 0.56, 0.66, -0.28], [s * 0.6, 0.69, -0.3]); }); // зеркала
    return { L: 2.5, W: W, Y: 0.42, wheels: [[-0.58, 0.27, -0.78, 0.27, 0.22], [0.58, 0.27, -0.78, 0.27, 0.22], [-0.58, 0.28, 0.78, 0.28, 0.26], [0.58, 0.28, 0.78, 0.28, 0.26]] };
}

// ---------------- «Ковёр-самолёт» ----------------
let carpetTex = null;
function carpetTexture() {
    if (carpetTex || typeof document === 'undefined') return carpetTex;
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 448; const g = cv.getContext('2d');
    g.fillStyle = '#8a1030'; g.fillRect(0, 0, 256, 448);
    g.fillStyle = '#e8b830'; g.fillRect(8, 8, 240, 432);
    g.fillStyle = '#5a1080'; g.fillRect(16, 16, 224, 416);
    g.fillStyle = '#8a1030'; g.fillRect(28, 28, 200, 392);
    for (let y = 40; y < 410; y += 26) for (let x = 40; x < 220; x += 26) { g.fillStyle = (x + y) % 52 ? '#c8305a' : '#e8b830'; g.beginPath(); g.moveTo(x, y - 7); g.lineTo(x + 7, y); g.lineTo(x, y + 7); g.lineTo(x - 7, y); g.fill(); }
    g.fillStyle = '#1fb5a8'; g.beginPath(); g.moveTo(128, 150); g.lineTo(190, 224); g.lineTo(128, 298); g.lineTo(66, 224); g.fill();
    g.fillStyle = '#e8b830'; g.beginPath(); g.moveTo(128, 180); g.lineTo(165, 224); g.lineTo(128, 268); g.lineTo(91, 224); g.fill();
    carpetTex = new THREE.CanvasTexture(cv); carpetTex.colorSpace = THREE.SRGBColorSpace; carpetTex.userData.keep = true;
    return carpetTex;
}
function buildCarpet(k, m, group) {
    const geo = new THREE.PlaneGeometry(1.3, 2.3, 12, 24), p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i);
        let z = Math.sin(y * 4 + x * 2) * 0.035;
        if (y > 0.85) z += (y - 0.85) * (y - 0.85) * 0.9;   // перёд загибается кверху, как у ковра в полёте
        p.setZ(i, z);
    }
    geo.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: carpetTexture(), roughness: 0.85, side: THREE.DoubleSide });
    const rug = new THREE.Mesh(geo, mat); rug.rotation.x = -Math.PI / 2; rug.position.y = 0.48; rug.userData.bodyPaint = true; group.add(rug);
    const gold = M(0xe8b830, { metalness: 0.7, roughness: 0.3 });
    // кисти на коротких краях
    [-1, 1].forEach(function(s) { for (let i = 0; i < 7; i++) { const x = -0.6 + i * 0.2, zz = s * 1.16, yy = s > 0 ? 0.48 : 0.48 + 0.08; k.rod(gold, 0.012, [x, yy, zz], [x, yy - 0.12, zz + s * 0.04]); k.sphere(gold, 0.022, 1, 1.4, 1, x, yy - 0.13, zz + s * 0.045); } });
    // подушка и золотая лампа
    k.sphere(M(0x5a1080, { roughness: 0.8 }), 0.25, 1.4, 0.45, 1, 0, 0.58, 0.55);
    k.sphere(gold, 0.1, 1.3, 0.8, 1, 0.34, 0.57, -0.25);
    const spout = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.2, 8), gold); spout.rotation.x = Math.PI / 2 - 0.4; spout.position.set(0.34, 0.6, -0.4); group.add(spout);
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.015, 6, 12), gold); handle.position.set(0.34, 0.6, -0.12); group.add(handle);
    // золотистое свечение и тень под ковром — видно, что парит
    const glow = new THREE.Mesh(new THREE.CircleGeometry(0.9, 24), new THREE.MeshBasicMaterial({ color: 0xffd060, transparent: true, opacity: 0.22, depthWrite: false }));
    glow.rotation.x = -Math.PI / 2; glow.scale.set(0.9, 1.4, 1); glow.position.y = 0.03; glow.userData.isLight = true; group.add(glow);
    [-1, 1].forEach(function(s) { k.sphere(m.hl, 0.05, 1, 1, 1, s * 0.5, 0.53, -1.05, LIGHT); k.sphere(m.tail, 0.04, 1, 1, 1, s * 0.5, 0.5, 1.12, LIGHT); });
    return { L: 2.3, W: 1.3, Y: 0.45, wheels: [] };
}

export const FANTASY_BUILDERS = { trike: buildTrike, moped: buildMoped, ghostcar: buildGhostcar, chariot: buildChariot, timecar: buildTimecar, carpet: buildCarpet };
export const FANTASY_FINISH = {
    trike: { metal: 0.5, rough: 0.25 }, moped: { metal: 0.15, rough: 0.4 }, ghostcar: { metal: 0.15, rough: 0.3 },
    chariot: { metal: 0.45, rough: 0.3 }, timecar: { metal: 0.5, rough: 0.32 }, carpet: { metal: 0, rough: 0.8 }
};
/** Диски колёс: у колесницы — золотые (цвет кузова) */
export function fantasyRim(carId, m) { return carId === 'chariot' ? m.body : null; }
