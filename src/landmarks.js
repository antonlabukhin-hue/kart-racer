/**
 * Узнаваемые детали трасс — чтобы заезды не повторялись.
 * События в полосах (как поезд и труба): с предупреждением заранее и всегда со свободной полосой.
 *   arsenev  — трактор с прицепом переползает дорогу; ПАЗик отъезжает от остановки в правую полосу;
 *              «встречка» — грузовик на обгоне летит навстречу по одной полосе, мигая фарами: уйди в соседнюю.
 *   promzona — башенный кран качает бетонный блок поперёк дороги.
 *   svalka   — магнитный кран роняет кузов машины в полосу; бульдозер сдвигает кучу хлама в полосу.
 * Приметы у обочины (без игровой роли): водонапорная башня, стела, АЗС, остановка с киоском,
 *   градирня, газгольдер, самолёт на свалке, гора шин.
 * Каждый заезд берёт случайные 1–2 события и 2 приметы своей карты (pickSetpieces).
 * API событий как у mapevents.js: { kind, group, z, update(ctx) → попадание | null }.
 */
import * as THREE from 'three';

export const EVENT_POOL = {
    arsenev: ['tractor', 'bus', 'oncoming'],
    promzona: ['crane'],
    svalka: ['magnet', 'dozer']
};
export const LANDMARK_POOL = {
    arsenev: ['waterTower', 'stele', 'gasStation', 'busStop'],
    promzona: ['coolingTower', 'gasHolder', 'waterTower', 'gasStation'],
    svalka: ['planeWreck', 'tireMountain', 'waterTower', 'busStop']
};

/**
 * Что поставить в этот заезд: { events: [...], landmarks: [...] } без повторов.
 * mapId 'all' — бесконечная трасса: события и приметы всех карт, событий — n (иначе 1–2), примет — 3.
 */
export function pickSetpieces(mapId, rnd, n) {
    const r = rnd || Math.random;
    const shuffle = function(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
    const all = function(pool) { const out = []; Object.keys(pool).forEach(function(k) { pool[k].forEach(function(x) { if (out.indexOf(x) < 0) out.push(x); }); }); return out; };
    const ev = shuffle(mapId === 'all' ? all(EVENT_POOL) : (EVENT_POOL[mapId] || EVENT_POOL.arsenev));
    const lm = shuffle(mapId === 'all' ? all(LANDMARK_POOL) : (LANDMARK_POOL[mapId] || LANDMARK_POOL.arsenev));
    const cnt = n != null ? Math.min(n, ev.length) : ev.length > 1 && r() < 0.6 ? 2 : 1;
    return { events: ev.slice(0, cnt), landmarks: lm.slice(0, mapId === 'all' ? 3 : 2) };
}

/**
 * Бесконечная трасса: что ставить в этом месте — по стилю пейзажа (src/infinite.js THEMES[].style),
 * а не из общего набора (градирня в зоопарке, магнитный кран в деревне). null — в этом пейзаже такого нет.
 */
export const STYLE_EVENTS = {
    arsenev: ['tractor', 'bus', 'oncoming'], city: ['bus', 'oncoming'], village: ['tractor'],
    industrial: ['crane'], junk: ['magnet', 'dozer'], forest: ['oncoming']
};
export const STYLE_LANDMARKS = {
    arsenev: ['waterTower', 'stele', 'gasStation', 'busStop'], city: ['stele', 'gasStation', 'busStop'], village: ['waterTower', 'busStop'],
    industrial: ['coolingTower', 'gasHolder', 'waterTower', 'gasStation'], junk: ['planeWreck', 'tireMountain'], forest: ['stele', 'gasStation']
};
export function pickForStyle(style, kind, rnd, avoid) {
    const pool = (kind === 'event' ? STYLE_EVENTS : STYLE_LANDMARKS)[style];
    if (!pool || !pool.length) return null;
    const free = pool.filter(function(k) { return !avoid || avoid.indexOf(k) < 0; });
    const from = free.length ? free : pool;
    return from[Math.floor((rnd || Math.random)() * from.length)];
}

/** Доли трассы для n событий: вне арены босса, подальше от занятого (busy) и друг от друга */
export function placeFracs(n, busy, rnd, lo, hi) {
    const r = rnd || Math.random;
    const cands = [];
    // целые шаги по 0.01: без накопления ошибки округления (0.12 + 13·0.02 ≠ 0.38)
    // lo/hi (доли ×100) — весь круг бесконечной трассы (там нет босса); иначе — вне арены босса
    if (lo != null) for (let k = lo; k <= hi; k++) cands.push(k / 100);
    else {
        for (let k = 11; k <= 40; k++) cands.push(k / 100);
        for (let k = 84; k <= 94; k++) cands.push(k / 100);
    }
    const taken = (busy || []).slice();
    const out = [];
    while (out.length < n && cands.length) {
        const f = Math.round(cands.splice(Math.floor(r() * cands.length), 1)[0] * 1000) / 1000;
        if (taken.every(function(b) { return Math.abs(b - f) > 0.055; })) { out.push(f); taken.push(f); }
    }
    return out;
}

const M = {};
function mat(c) { if (!M[c]) M[c] = new THREE.MeshLambertMaterial({ color: c }); return M[c]; }
function box(g, c, x, y, z, sx, sy, sz) { const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat(c)); m.position.set(x, y, z); g.add(m); return m; }
function cyl(g, c, r1, r2, h, x, y, z, rx, rz, seg) { const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg || 12), mat(c)); m.position.set(x, y, z); if (rx) m.rotation.x = rx; if (rz) m.rotation.z = rz; g.add(m); return m; }
function beacon(g, x, y, z) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), new THREE.MeshBasicMaterial({ color: 0xff8a00 }));
    b.position.set(x, y, z); g.add(b); return b;
}
function textPlate(lines, w, h, bg, fg) {
    if (typeof document === 'undefined') return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshLambertMaterial({ color: bg })); // тесты без DOM
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = Math.round(512 * h / w);
    const cx = cv.getContext('2d');
    cx.fillStyle = bg; cx.fillRect(0, 0, cv.width, cv.height);
    cx.fillStyle = fg; cx.textAlign = 'center'; cx.textBaseline = 'middle';
    lines.forEach(function(t, i) { cx.font = (i ? 'bold ' : '900 ') + Math.round(cv.height / (lines.length + 0.8) * (i ? 0.55 : 0.8)) + 'px Arial, sans-serif'; cx.fillText(t, cv.width / 2, cv.height * (i + 0.9) / (lines.length + 0.8), cv.width - 20); });
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshLambertMaterial({ map: tex }));
}
const strike = function(kind, text, z0) { return { kind: kind, strike: true, timePenalty: 3, speedMul: 0, text: text, stopAt: z0 + 1.6 }; };

// ---------------------------------------------------------------- трактор (Арсеньев)
function tractorModel() {
    const g = new THREE.Group();
    box(g, 0x2f7d32, 0, 0.75, 0, 1.4, 0.7, 1.0);          // капот/корпус
    box(g, 0x2f7d32, -0.35, 1.45, 0, 0.8, 0.8, 0.9);       // кабина
    box(g, 0x9fc8e0, -0.35, 1.5, 0, 0.82, 0.5, 0.92);      // стёкла
    box(g, 0x1e5a22, -0.35, 1.9, 0, 0.95, 0.08, 1.0);      // крыша
    cyl(g, 0x222222, 0.55, 0.55, 0.3, -0.45, 0.55, 0.62, Math.PI / 2);
    cyl(g, 0x222222, 0.55, 0.55, 0.3, -0.45, 0.55, -0.62, Math.PI / 2);
    cyl(g, 0x222222, 0.33, 0.33, 0.25, 0.55, 0.33, 0.55, Math.PI / 2);
    cyl(g, 0x222222, 0.33, 0.33, 0.25, 0.55, 0.33, -0.55, Math.PI / 2);
    cyl(g, 0x444444, 0.06, 0.06, 0.6, 0.35, 1.3, 0.25);    // выхлопная труба
    // прицеп с сеном
    box(g, 0x7a4a22, -2.4, 0.7, 0, 2.2, 0.2, 1.3);
    box(g, 0xe0c060, -2.4, 1.15, 0, 2.0, 0.7, 1.15);
    cyl(g, 0x222222, 0.3, 0.3, 0.2, -2.4, 0.3, 0.6, Math.PI / 2);
    cyl(g, 0x222222, 0.3, 0.3, 0.2, -2.4, 0.3, -0.6, Math.PI / 2);
    return g;
}
function createTractor(trackWidth, z0) {
    const g = new THREE.Group();
    const hw = trackWidth / 2;
    const tr = tractorModel();
    const dir = Math.random() < 0.5 ? 1 : -1;               // откуда выезжает
    const startX = -dir * (hw + 4.2);
    tr.rotation.y = dir > 0 ? 0 : Math.PI;                    // перёд (+x модели) — по ходу
    tr.position.set(startX, 0, z0);
    g.add(tr);
    const light = beacon(tr, -0.35, 2.05, 0);
    // грунтовка поперёк дороги — видно, откуда поедет
    const dirt = new THREE.Mesh(new THREE.PlaneGeometry(trackWidth + 14, 2.4), new THREE.MeshLambertMaterial({ color: 0x6a5238 }));
    dirt.rotation.x = -Math.PI / 2; dirt.position.set(0, 0.005, z0); g.add(dirt);
    const st = { state: 'wait', x: startX, v: 3.2, hitCd: 0, t: 0 };
    const LEN = 3.9; // трактор + прицеп вдоль x
    return {
        kind: 'tractor', group: g, z: z0, debug: st,
        update: function(ctx) {
            st.t += ctx.dt; st.hitCd -= ctx.dt;
            light.visible = Math.floor(st.t * 3) % 2 === 0;
            const dist = ctx.z - z0;
            if (st.state === 'wait' && dist > 0 && dist < ctx.ups * 3.2 + 8) st.state = 'go';
            if (st.state === 'go') {
                st.x += dir * st.v * ctx.dt;
                tr.position.x = st.x;
                if (Math.abs(st.x) > hw + 7 && Math.sign(st.x) === dir) st.state = 'gone';
            }
            // корпус: от носа до хвоста прицепа
            const x0 = dir > 0 ? st.x - LEN + 0.7 : st.x - 0.7, x1 = dir > 0 ? st.x + 0.7 : st.x + LEN - 0.7;
            if (st.hitCd <= 0 && ctx.y < 1.6 && Math.abs(ctx.z - z0) < 1.0 && ctx.x > x0 - 0.3 && ctx.x < x1 + 0.3) {
                st.hitCd = 3;
                return strike('tractor', '🚜 Трактор!', z0);
            }
            return null;
        }
    };
}

// ---------------------------------------------------------------- ПАЗик от остановки (Арсеньев)
function busModel() {
    const g = new THREE.Group();
    box(g, 0xe8c030, 0, 1.15, 0, 2.1, 1.7, 5.2);             // кузов (перёд к −z)
    box(g, 0xf4f0e0, 0, 1.55, 0, 2.12, 0.6, 5.0);            // светлая полоса
    box(g, 0x2a3a4a, 0, 1.6, 0, 2.14, 0.45, 4.2);             // окна
    box(g, 0x2a3a4a, 0, 1.45, -2.61, 1.8, 0.8, 0.02);         // лобовое
    box(g, 0x333333, 0, 0.35, 0, 2.0, 0.3, 5.1);
    [[-0.95, 1.7], [0.95, 1.7], [-0.95, -1.7], [0.95, -1.7]].forEach(function(p) { cyl(g, 0x151515, 0.42, 0.42, 0.3, p[0], 0.42, p[1], 0, Math.PI / 2); });
    const hazards = [];
    [-0.8, 0.8].forEach(function(x) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.18, 0.05), new THREE.MeshBasicMaterial({ color: 0xff9a00 }));
        m.position.set(x, 0.8, 2.62); g.add(m); hazards.push(m);
    });
    g.userData.hazards = hazards;
    return g;
}
function createBusPullout(trackWidth, z0) {
    const g = new THREE.Group();
    const hw = trackWidth / 2;
    const bus = busModel();
    const side = Math.random() < 0.5 ? -1 : 1;                // остановка справа или слева — выезжает в крайнюю полосу своей стороны
    const parkX = side * (hw + 1.9), laneX = side * 1.5;
    bus.position.set(parkX, 0, z0);
    g.add(bus);
    // остановка
    box(g, 0x6a6e76, side * (hw + 3.9), 1.2, z0 + 1.5, 0.1, 2.4, 3.2);
    box(g, 0x3a6ab0, side * (hw + 3.4), 2.45, z0 + 1.5, 1.2, 0.1, 3.4);
    const sign = textPlate(['А', 'ОСТАНОВКА'], 0.9, 0.9, '#f2f2f2', '#1a3a8a');
    sign.position.set(side * (hw + 3.5), 2.2, z0 + 3.3); g.add(sign);
    const st = { state: 'park', x: parkX, t: 0, hitCd: 0 };
    return {
        kind: 'bus', group: g, z: z0, debug: st, side: side,
        update: function(ctx) {
            st.t += ctx.dt; st.hitCd -= ctx.dt;
            const blink = Math.floor(st.t * 3) % 2 === 0;
            bus.userData.hazards.forEach(function(h) { h.visible = st.state !== 'park' && blink; });
            const dist = ctx.z - z0;
            if (st.state === 'park' && dist > 0 && dist < ctx.ups * 2.4 + 6) st.state = 'out';
            if (st.state === 'out') {
                st.x = side > 0 ? Math.max(laneX, st.x - 2.4 * ctx.dt) : Math.min(laneX, st.x + 2.4 * ctx.dt);
                bus.position.x = st.x;
                bus.rotation.y = Math.abs(st.x - laneX) > 0.05 ? 0.12 * side : 0; // нос — к дороге
            }
            if (st.hitCd <= 0 && ctx.y < 1.8 && Math.abs(ctx.z - z0) < 2.7 && Math.abs(ctx.x - st.x) < 1.25) {
                st.hitCd = 3;
                return strike('bus', '🚌 ПАЗик!', z0 + 1.2);
            }
            return null;
        }
    };
}

// ---------------------------------------------------------------- башенный кран (Промзона)
function createCraneSwing(trackWidth, z0) {
    const g = new THREE.Group();
    const hw = trackWidth / 2;
    const mastX = -(hw + 3.2), topY = 11;
    for (let i = 0; i < 8; i++) box(g, i % 2 ? 0xf0b020 : 0xd09010, mastX, 0.7 + i * 1.4, z0, 0.9, 1.4, 0.9);
    box(g, 0xf0b020, mastX + 5.5, topY, z0, 13, 0.5, 0.6);      // стрела над дорогой
    box(g, 0x707070, mastX - 2.2, topY - 0.4, z0, 1.6, 1.2, 1.1); // противовес
    box(g, 0x2a3a4a, mastX + 0.6, topY - 0.9, z0, 1.1, 1.0, 1.0); // кабина
    // трос и блок — маятник поперёк дороги (по x), точка подвеса над серединой
    const pivot = new THREE.Group();
    pivot.position.set(0, topY - 0.3, z0);
    g.add(pivot);
    const L = topY - 1.3;
    const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, L, 6), mat(0x222222));
    rope.position.y = -L / 2; pivot.add(rope);
    const block = new THREE.Group();
    box(block, 0x9a9a92, 0, 0, 0, 1.5, 0.9, 1.0);
    box(block, 0xffcc00, 0, 0.47, 0, 1.52, 0.06, 1.02);
    block.position.y = -L - 0.45; pivot.add(block);
    const A = Math.asin(Math.min(0.95, 2.6 / L));              // размах ±2.6 ед. — от края до края
    const st = { t: Math.random() * 6, hitCd: 0 };
    const w = 1.05;                                            // рад/с: полный мах ~6 с
    return {
        kind: 'crane', group: g, z: z0, debug: st,
        update: function(ctx) {
            st.t += ctx.dt; st.hitCd -= ctx.dt;
            const ang = A * Math.sin(st.t * w);
            pivot.rotation.z = ang;
            const bx = Math.sin(ang) * (L + 0.45);
            if (st.hitCd <= 0 && ctx.y < 1.3 && Math.abs(ctx.z - z0) < 0.9 && Math.abs(ctx.x - bx) < 1.05) {
                st.hitCd = 3;
                return strike('crane', '🏗 Бетонный блок!', z0);
            }
            return null;
        }
    };
}

// ---------------------------------------------------------------- магнитный кран (Свалка)
function wreckModel() {
    const g = new THREE.Group();
    box(g, 0x7a3a22, 0, 0.45, 0, 1.3, 0.5, 2.3);
    box(g, 0x5a2a18, 0, 0.9, 0.2, 1.1, 0.4, 1.1);
    box(g, 0x2a2a2a, 0, 0.9, 0.2, 1.12, 0.25, 0.9);
    box(g, 0x3a3a3a, 0, 0.2, 0, 1.2, 0.15, 2.0);
    g.rotation.z = 0.12;
    return g;
}
function createMagnetDrop(trackWidth, z0, laneXs) {
    const g = new THREE.Group();
    const hw = trackWidth / 2;
    const lane = Math.floor(Math.random() * 3);
    const x = laneXs[lane];
    const baseX = hw + 3.5, topY = 7.5;
    box(g, 0x3a6ab0, baseX, 0.6, z0, 2.4, 1.2, 2.0);            // шасси
    box(g, 0xe8c030, baseX, 1.6, z0, 1.6, 0.9, 1.4);             // кабина
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), mat(0xe8c030));
    const armLen = Math.hypot(baseX - x, topY - 2);
    arm.scale.set(1, 1, armLen / 0.4);
    arm.position.set((baseX + x) / 2, (topY + 2) / 2, z0);
    arm.lookAt(x, topY, z0);
    g.add(arm);
    const magnet = cyl(g, 0x303030, 0.7, 0.7, 0.3, x, topY - 1.3, z0);
    const chain = cyl(g, 0x222222, 0.04, 0.04, 1.0, x, topY - 0.7, z0);
    const wreck = wreckModel();
    wreck.position.set(x, topY - 2.2, z0);
    g.add(wreck);
    const sparks = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 4), new THREE.MeshBasicMaterial({ color: 0x66ccff }));
    sparks.position.set(x, topY - 1.5, z0); g.add(sparks);
    const st = { state: 'hold', y: topY - 2.2, vy: 0, t: 0, hitCd: 0, lane: lane };
    return {
        kind: 'magnet', group: g, z: z0, lane: lane, debug: st,
        update: function(ctx) {
            st.t += ctx.dt; st.hitCd -= ctx.dt;
            const dist = ctx.z - z0;
            if (st.state === 'hold') {
                sparks.visible = Math.random() < 0.5;
                wreck.rotation.y = Math.sin(st.t * 2) * 0.15;
                if (dist > 0 && dist < ctx.ups * 1.15 + 1.5) { st.state = 'fall'; sparks.visible = false; }
            } else if (st.state === 'fall') {
                st.vy -= 22 * ctx.dt; st.y += st.vy * ctx.dt;
                if (st.y <= 0) { st.y = 0; st.vy = Math.abs(st.vy) > 3 ? -st.vy * 0.2 : 0; if (!st.vy) st.state = 'down'; }
                wreck.position.y = st.y;
            }
            if (st.state !== 'hold' && st.y < 1.2 && st.hitCd <= 0 && ctx.y < st.y + 0.6 && Math.abs(ctx.z - z0) < 1.3 && Math.abs(ctx.x - x) < 1.0) {
                st.hitCd = 3;
                return strike('magnet', '🧲 Кузов сверху!', z0);
            }
            return null;
        }
    };
}

// ---------------------------------------------------------------- бульдозер (Свалка)
function createDozer(trackWidth, z0) {
    const g = new THREE.Group();
    const hw = trackWidth / 2;
    const side = Math.random() < 0.5 ? -1 : 1;
    const targetX = side * 1.5;                                  // крайняя полоса со стороны бульдозера
    const dozer = new THREE.Group();
    box(dozer, 0xe8b020, 0, 0.8, 0, 1.6, 0.8, 1.4);
    box(dozer, 0xe8b020, 0.2, 1.55, 0, 0.9, 0.8, 1.0);
    box(dozer, 0x2a3a4a, 0.2, 1.6, 0, 0.92, 0.45, 1.02);
    box(dozer, 0x222222, 0, 0.3, 0.6, 1.9, 0.5, 0.35);
    box(dozer, 0x222222, 0, 0.3, -0.6, 1.9, 0.5, 0.35);
    box(dozer, 0x8a8a80, -1.2, 0.55, 0, 0.15, 1.0, 1.9);         // отвал
    const bcn = beacon(dozer, 0.2, 2.05, 0);
    dozer.rotation.y = side > 0 ? 0 : Math.PI;                    // отвал (−x модели) — к дороге
    const pile = new THREE.Group();
    [[0, 0.35, 0, 1.3, 0.7, 1.6, 0x6a4a32], [0.2, 0.8, 0.2, 0.8, 0.5, 0.8, 0x7a3a22], [-0.3, 0.6, -0.4, 0.6, 0.5, 0.7, 0x3a3a40]].forEach(function(b) { box(pile, b[6], b[0], b[1], b[2], b[3], b[4], b[5]); });
    const st = { state: 'wait', x: side * (hw + 2.4), t: 0, hitCd: 0 };
    pile.position.set(st.x, 0, z0);
    dozer.position.set(st.x + side * 1.6, 0, z0);
    g.add(pile); g.add(dozer);
    return {
        kind: 'dozer', group: g, z: z0, debug: st, side: side,
        update: function(ctx) {
            st.t += ctx.dt; st.hitCd -= ctx.dt;
            bcn.visible = Math.floor(st.t * 3) % 2 === 0;
            const dist = ctx.z - z0;
            if (st.state === 'wait' && dist > 0 && dist < ctx.ups * 3 + 6) st.state = 'push';
            if (st.state === 'push') {
                st.x -= side * 2.2 * ctx.dt;
                if (side * (st.x - targetX) <= 0) { st.x = targetX; st.state = 'done'; }
                pile.position.x = st.x;
                dozer.position.x = st.x + side * 1.6;
            }
            if (st.hitCd <= 0 && ctx.y < 1.0 && Math.abs(ctx.z - z0) < 1.0 && Math.abs(ctx.x - st.x) < 0.95) {
                st.hitCd = 3;
                return strike('dozer', '🚧 Куча хлама!', z0);
            }
            return null;
        }
    };
}

// ---------------------------------------------------------------- встречка (Арсеньев): грузовик на обгоне
function createOncoming(trackWidth, z0, laneXs) {
    const lanes = laneXs || [-1.5, 0, 1.5];
    const lane = Math.floor(Math.random() * lanes.length), lx = lanes[lane];
    const g = new THREE.Group();
    const truck = new THREE.Group();
    box(truck, 0xc8321e, 0, 1.25, -1.9, 2.1, 1.9, 1.6);          // кабина (перёд модели к −z)
    box(truck, 0x2a3a4a, 0, 1.6, -2.71, 1.8, 0.7, 0.02);          // лобовое
    box(truck, 0x5a6a3a, 0, 1.5, 0.9, 2.2, 2.2, 3.9);             // тент кузова
    box(truck, 0x333333, 0, 0.42, 0, 2.0, 0.3, 5.6);              // рама
    [[-0.95, -1.9], [0.95, -1.9], [-0.95, 1.0], [0.95, 1.0], [-0.95, 2.1], [0.95, 2.1]].forEach(function(q) { cyl(truck, 0x151515, 0.45, 0.45, 0.32, q[0], 0.45, q[1], 0, Math.PI / 2); });
    const lights = [];
    [-0.7, 0.7].forEach(function(x) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.22, 0.05), new THREE.MeshBasicMaterial({ color: 0xfff4c0 }));
        m.position.set(x, 0.85, -2.72); truck.add(m); lights.push(m);
    });
    truck.rotation.y = Math.PI;                                      // едет к игроку (+z)
    truck.position.set(lx, 0, z0);
    g.add(truck);
    const st = { state: 'wait', z: z0, t: 0, hitCd: 0 };
    return {
        kind: 'oncoming', group: g, z: z0, lane: lane, debug: st,
        update: function(ctx) {
            st.t += ctx.dt; st.hitCd -= ctx.dt;
            const flash = Math.floor(st.t * 5) % 2 === 0;               // моргает дальним — «уйди с полосы!»
            lights.forEach(function(l) { l.visible = st.state !== 'go' || flash; });
            if (st.state === 'wait' && ctx.z - st.z < ctx.ups * 3 + 25) st.state = 'go';
            if (st.state === 'go') {
                st.z += 18 * ctx.dt;
                truck.position.z = st.z;
                if (st.z > ctx.z + 25) { st.state = 'gone'; truck.visible = false; }
            }
            if (st.state === 'go' && st.hitCd <= 0 && ctx.y < 1.8 && Math.abs(ctx.z - st.z) < 3 && Math.abs(ctx.x - lx) < 1.3) {
                st.hitCd = 3;
                return strike('oncoming', '🚛 Лобовое!', st.z - 3);
            }
            return null;
        }
    };
}

/** Событие по виду; laneXs — центры полос */
export function createSetpieceEvent(kind, trackWidth, z0, laneXs) {
    if (kind === 'tractor') return createTractor(trackWidth, z0);
    if (kind === 'bus') return createBusPullout(trackWidth, z0);
    if (kind === 'crane') return createCraneSwing(trackWidth, z0);
    if (kind === 'magnet') return createMagnetDrop(trackWidth, z0, laneXs);
    if (kind === 'dozer') return createDozer(trackWidth, z0);
    if (kind === 'oncoming') return createOncoming(trackWidth, z0, laneXs);
    return null;
}

/** Табличка-предупреждение для события */
export const EVENT_SIGNS = {
    tractor: ['ОСТОРОЖНО', 'ТРАКТОР'],
    bus: ['ОСТАНОВКА', 'АВТОБУС ВЫЕЗЖАЕТ'],
    crane: ['ОСТОРОЖНО', 'РАБОТАЕТ КРАН'],
    magnet: ['ОСТОРОЖНО', 'ГРУЗ НАД ДОРОГОЙ'],
    dozer: ['ОСТОРОЖНО', 'ТЕХНИКА НА ДОРОГЕ'],
    oncoming: ['ОСТОРОЖНО', 'ВСТРЕЧКА — ОБГОН!']
};

// ---------------------------------------------------------------- приметы у обочины
export function createLandmark(kind, x, z) {
    const g = new THREE.Group();
    if (kind === 'waterTower') {
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function(p) { cyl(g, 0x6a6e76, 0.12, 0.12, 7, p[0], 3.5, p[1]); });
        cyl(g, 0x9a3a2a, 2.0, 2.0, 2.6, 0, 8.3, 0, 0, 0, 16);
        const cone = new THREE.Mesh(new THREE.ConeGeometry(2.1, 1.2, 16), mat(0x5a2a22)); cone.position.y = 10.2; g.add(cone);
    } else if (kind === 'stele') {
        box(g, 0xd8d0c0, 0, 2.5, 0, 1.2, 5.0, 1.0);             // колонна
        box(g, 0xd8d0c0, 0, 0.2, 0, 3.2, 0.4, 1.6);
        const t = textPlate(['АРСЕНЬЕВ', '1952'], 2.8, 1.1, '#b8301f', '#ffe9b0'); t.position.set(0, 3.7, 0.51); g.add(t);                 // табличка на лицевой стороне колонны
        const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.5, 0), mat(0xd8a020)); star.position.y = 5.45; g.add(star); // стоит на колонне
    } else if (kind === 'gasStation') {
        box(g, 0xefefe8, 0, 3.2, 0, 7, 0.4, 4);                  // навес
        box(g, 0xd02a1a, 0, 3.45, 0, 7.02, 0.25, 4.02);
        [[-2.5, -1.2], [2.5, -1.2], [-2.5, 1.2], [2.5, 1.2]].forEach(function(p) { box(g, 0xd8d8d8, p[0], 1.5, p[1], 0.25, 3.0, 0.25); });
        [-1, 1].forEach(function(x) { box(g, 0x2a5aa8, x, 0.8, 0, 0.6, 1.6, 0.5); });
        const t = textPlate(['АЗС', 'бензин 76'], 2.4, 1.0, '#d02a1a', '#ffffff'); t.position.set(0, 4.3, 2.05); g.add(t);
        cyl(g, 0x777777, 0.08, 0.08, 4.2, 4.2, 2.1, 0);
    } else if (kind === 'busStop') {
        box(g, 0xa8b0b8, 0, 1.3, -0.8, 3.2, 2.6, 0.12);
        box(g, 0x3a6ab0, 0, 2.65, 0, 3.4, 0.12, 1.8);
        box(g, 0x6a4a2a, 0, 0.5, -0.4, 2.6, 0.1, 0.5);
        box(g, 0xe0d8c0, 2.6, 1.2, 0, 1.4, 2.4, 1.4);            // киоск
        const t = textPlate(['ПЕЧАТЬ'], 1.3, 0.4, '#1a4fd8', '#ffffff'); t.position.set(2.6, 2.2, 0.71); g.add(t);
    } else if (kind === 'coolingTower') {
        const pts = [];
        for (let i = 0; i <= 10; i++) { const t = i / 10; pts.push(new THREE.Vector2(3.4 - Math.sin(t * Math.PI * 0.8) * 1.3 + t * 0.3, t * 10)); }
        const m = new THREE.Mesh(new THREE.LatheGeometry(pts, 24), new THREE.MeshLambertMaterial({ color: 0xb8b4ac, side: THREE.DoubleSide })); g.add(m);
        box(g, 0xd05030, 0, 9.4, 3.05, 1.5, 0.5, 0.1);
    } else if (kind === 'gasHolder') {
        cyl(g, 0x7a8a6a, 3.2, 3.2, 5.5, 0, 2.75, 0, 0, 0, 20);
        for (let i = 0; i < 4; i++) cyl(g, 0x4a4a40, 3.25, 3.25, 0.15, 0, 1 + i * 1.3, 0, 0, 0, 20);
        const dome = new THREE.Mesh(new THREE.SphereGeometry(3.2, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(0x7a8a6a)); dome.scale.y = 0.35; dome.position.y = 5.5; g.add(dome);
    } else if (kind === 'planeWreck') {
        cyl(g, 0xb8bcc0, 0.9, 0.7, 8, 0, 0.9, 0, 0, Math.PI / 2 - 0.1, 14);
        box(g, 0xa8acb0, 0.5, 0.8, 0, 1.6, 0.15, 9);             // крыло
        box(g, 0xa8acb0, -3.8, 1.8, 0, 1.0, 1.8, 0.15);          // киль
        box(g, 0xd02a1a, -3.8, 2.3, 0.09, 0.6, 0.4, 0.02);
        g.rotation.y = 0.5; g.rotation.x = 0.08;
    } else if (kind === 'tireMountain') {
        for (let i = 0; i < 26; i++) {
            const t = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.18, 6, 12), mat(0x161616));
            const lvl = Math.floor(i / 8);
            t.position.set((Math.random() - 0.5) * (4 - lvl), 0.2 + lvl * 0.35, (Math.random() - 0.5) * (4 - lvl));
            t.rotation.set(Math.PI / 2 + (Math.random() - 0.5) * 0.6, Math.random(), 0);
            g.add(t);
        }
        g.scale.setScalar(2.2);
    }
    g.position.set(x, 0, z);
    return g;
}
