/**
 * «Моменты» — редкие сценки на трассе, о которых хочется рассказать (только картинка, без столкновений):
 *   бабушка с ведром огурцов перебегает дорогу далеко впереди, «Запорожец» с реактивным пламенем обгоняет игрока,
 *   ёжик с узелком в тумане, НЛО с лучом над лесом, мотоциклист на заднем колесе, корова пасётся у обочины.
 * Расписание: «мем недели» (свой каждую неделю) — в каждом заезде на 400–900 м; ещё один редкий — примерно в каждом
 * третьем заезде. Выбор и расписание — чистые функции (с тестами); сценки — меши и поведение по положению игрока.
 */
import * as THREE from 'three';

export const MOMENTS = [
    { id: 'granny_cross', name: 'Бабушка с огурцами', styles: ['village', 'arsenev', 'city'], news: 'бабушка с ведром огурцов — перебегает трассу' },
    { id: 'zapor_nitro', name: 'Запорожец на нитро', styles: null, news: '«Запорожец» на реактивной тяге — обгоняет всех' },
    { id: 'hedgehog', name: 'Ёжик в тумане', styles: ['forest', 'village'], news: 'ёжик с узелком — ищет лошадку в тумане' },
    { id: 'ufo', name: 'НЛО', styles: ['forest', 'village', 'arsenev'], news: 'НЛО над лесом — светит лучом в кусты' },
    { id: 'wheelie', name: 'Мотоциклист без колеса', styles: null, news: 'мотоциклист едет на одном колесе' },
    { id: 'cow', name: 'Корова у трассы', styles: ['village', 'arsenev'], news: 'корова пасётся прямо у трассы' }
];
export const RARE_CHANCE = 0.35;   // ≈ каждый третий заезд — ещё один редкий момент

/** Номер недели (с понедельника) — для «мема недели» */
export function weekNo(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    return Math.floor((d.getTime() / 86400000 + 3) / 7); // 1970-01-01 — четверг: сдвиг на понедельник
}
/** «Мем недели» — по кругу из MOMENTS */
export function momentOfWeek(date) { return MOMENTS[weekNo(date) % MOMENTS.length]; }

/** Подходит ли момент пейзажу (style из src/infinite.js THEMES; ночь — без бабушки и коровы) */
export function fits(m, theme) {
    if (!theme) return true;
    if (theme.night && (m.id === 'granny_cross' || m.id === 'cow' || m.id === 'hedgehog')) return false;
    return !m.styles || m.styles.indexOf(theme.style) >= 0;
}

/**
 * План моментов заезда: [{ id, at }] (at — расстояние, ед.). themeAtD(d) → пейзаж в этом месте.
 * Мем недели — если подходит пейзажу (иначе ищет место дальше); редкий — с шансом RARE_CHANCE, другой.
 */
export function planMoments(date, rnd, themeAtD) {
    const r = rnd || Math.random, out = [];
    const place = function(m, lo, hi) {
        for (let k = 0; k < 8; k++) { const at = lo + r() * (hi - lo) + k * 150; if (fits(m, themeAtD ? themeAtD(at) : null)) { out.push({ id: m.id, at: Math.round(at) }); return true; } }
        return false;
    };
    const week = momentOfWeek(date);
    place(week, 400, 900);
    if (r() < RARE_CHANCE) {
        const pool = MOMENTS.filter(function(m) { return m.id !== week.id; });
        place(pool[Math.floor(r() * pool.length)], 1000, 2200);
    }
    return out;
}

/* ---------------- модели ---------------- */
const mats = {};
function M(hex, o) { const k = hex + (o ? JSON.stringify(o) : ''); return mats[k] || (mats[k] = new THREE.MeshStandardMaterial(Object.assign({ color: hex, roughness: 0.8 }, o || {}))); }
function box(g, w, h, d, m, x, y, z) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); g.add(b); return b; }
function ball(g, r, m, x, y, z, sy) { const b = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), m); b.position.set(x, y, z); if (sy) b.scale.y = sy; g.add(b); return b; }

function granny() {
    const g = new THREE.Group();
    const coat = M(0x7a3a3a), legs = M(0x2a2a2a);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.32, 0.8, 10), coat); body.position.y = 0.75; g.add(body);
    ball(g, 0.14, M(0xe8b898), 0, 1.3, 0); ball(g, 0.16, M(0x2e86c1), 0, 1.33, -0.02, 0.8);
    const lA = box(g, 0.08, 0.4, 0.08, legs, -0.08, 0.2, 0), lB = box(g, 0.08, 0.4, 0.08, legs, 0.08, 0.2, 0);
    const bucket = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.12, 0.28, 10), M(0x9aa0a8, { metalness: 0.4 })); bucket.position.set(0.33, 0.55, 0); g.add(bucket);
    for (let k = 0; k < 4; k++) box(g, 0.05, 0.05, 0.16, M(0x3a8a3a), 0.28 + (k % 2) * 0.09, 0.71, -0.04 + Math.floor(k / 2) * 0.08); // огурцы
    g.userData.legs = [lA, lB];
    return g;
}
function zapor() {
    const g = new THREE.Group();
    const body = M(0xd8a020, { roughness: 0.4, metalness: 0.3 }), glass = M(0x1c2a36), tire = M(0x161616);
    box(g, 0.9, 0.38, 1.9, body, 0, 0.45, 0); box(g, 0.82, 0.38, 0.95, body, 0, 0.82, 0.15); box(g, 0.84, 0.22, 0.85, glass, 0, 0.84, 0.15);
    box(g, 0.76, 0.06, 0.9, body, 0, 1.03, 0.18);
    [[-0.42, -0.6], [0.42, -0.6], [-0.42, 0.6], [0.42, 0.6]].forEach(function(p) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.14, 12), tire); w.rotation.z = Math.PI / 2; w.position.set(p[0], 0.2, p[1]); g.add(w); });
    [-1, 1].forEach(function(s) { box(g, 0.08, 0.16, 0.32, body, s * 0.47, 0.75, 0.6); }); // «уши»
    // реактивный двигатель на крыше и пламя
    const eng = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.9, 10), M(0x8a8a90, { metalness: 0.6 })); eng.rotation.x = Math.PI / 2; eng.position.set(0, 1.2, 0.5); g.add(eng);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.22, 1.4, 10), new THREE.MeshBasicMaterial({ color: 0xffa02a, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
    flame.rotation.x = Math.PI / 2; flame.position.set(0, 1.2, 1.6); g.add(flame);
    g.userData.flame = flame;
    return g;
}
function hedgehog() {
    const g = new THREE.Group();
    ball(g, 0.3, M(0x6a4a2a), 0, 0.28, 0, 0.8);
    for (let k = 0; k < 14; k++) { const a = k / 14 * Math.PI * 2, s = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.25, 5), M(0x3a2a1a)); s.position.set(Math.cos(a) * 0.22, 0.38 + Math.sin(k) * 0.05, Math.sin(a) * 0.22); s.rotation.set(Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9); g.add(s); }
    ball(g, 0.13, M(0x8a6a4a), 0, 0.27, -0.3); ball(g, 0.04, M(0x111111), 0, 0.29, -0.43);
    box(g, 0.02, 0.6, 0.02, M(0x5a4026), 0.25, 0.55, -0.1); ball(g, 0.14, M(0xf2ece0), 0.25, 0.9, -0.1); // узелок на палке
    const fog = new THREE.Mesh(new THREE.SphereGeometry(2.2, 14, 10), new THREE.MeshBasicMaterial({ color: 0xf2f4f6, transparent: true, opacity: 0.35, depthWrite: false }));
    fog.position.y = 0.6; fog.scale.y = 0.55; g.add(fog);
    return g;
}
function ufo() {
    const g = new THREE.Group();
    ball(g, 2.2, M(0xb8c0c8, { metalness: 0.6, roughness: 0.3 }), 0, 0, 0, 0.22);
    ball(g, 0.9, M(0x7ad8ff, { emissive: 0x2a8ab8, emissiveIntensity: 0.8 }), 0, 0.35, 0, 0.7);
    for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; ball(g, 0.14, new THREE.MeshBasicMaterial({ color: k % 2 ? 0x5aff7a : 0xffe05a }), Math.cos(a) * 1.9, -0.1, Math.sin(a) * 1.9); }
    const beam = new THREE.Mesh(new THREE.ConeGeometry(2.6, 11, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0x9aff9a, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    beam.position.y = -5.5; g.add(beam);
    g.userData.beam = beam;
    return g;
}
function wheelie(moto) {
    const g = new THREE.Group();
    g.add(moto);
    moto.rotation.x = -0.5; moto.position.y = 0.35; // встал на заднее колесо
    return g;
}
function cow(cowModel) { const g = new THREE.Group(); g.add(cowModel); return g; }

/**
 * Сценки в сцене. ctx: { scene, startZ, W, buildMoto() → модель мотоцикла, buildCow() → модель коровы, onNear(id) — хорошо видно, onSeen(id) — проехал }.
 * add(id, at) — поставить по плану; update(dt, zPos, speedUps) — каждый кадр (speedUps — скорость игрока, ед./с).
 */
export function createMoments(ctx) {
    const list = [];
    const W = ctx.W, side = function() { return Math.random() < 0.5 ? -1 : 1; };
    return {
        add: function(id, at) { list.push({ id: id, at: at, z: ctx.startZ - at, state: 'wait', t: 0, mesh: null, side: side() }); },
        update: function(dt, zPos, v) {
            list.forEach(function(m) {
                const ahead = zPos - m.z; // >0 — момент впереди
                if (m.state === 'done') return;
                if (m.state === 'wait') {
                    const trigger = m.id === 'zapor_nitro' ? 0 : m.id === 'wheelie' ? 150 : m.id === 'ufo' ? 170 : m.id === 'granny_cross' ? 85 : 130; // бабушка: перебегает, пока до неё 85 → 25 ед. — успевает уйти
                    if (ahead > trigger) return;
                    m.state = 'on';
                    let g;
                    if (m.id === 'granny_cross') { g = granny(); g.position.set(-m.side * (W / 2 + 2), 0, m.z); g.rotation.y = m.side > 0 ? -Math.PI / 2 : Math.PI / 2; g.scale.setScalar(1.5); }
                    else if (m.id === 'zapor_nitro') { g = zapor(); g.position.set(m.side * 2, 0, zPos + 14); }
                    else if (m.id === 'hedgehog') { g = hedgehog(); g.position.set(m.side * (W / 2 + 1.6), 0, m.z); g.rotation.y = m.side > 0 ? Math.PI / 2 : -Math.PI / 2; g.scale.setScalar(1.4); }
                    else if (m.id === 'ufo') { g = ufo(); g.position.set(m.side * 13, 11, m.z); g.scale.setScalar(1.5); }
                    else if (m.id === 'wheelie') { g = wheelie(ctx.buildMoto()); g.position.set(m.side * 2, 0, zPos - 150); }
                    else { g = cow(ctx.buildCow()); g.position.set(m.side * (W / 2 + 2.4), 0, m.z); g.rotation.y = m.side > 0 ? Math.PI / 2 : -Math.PI / 2; g.scale.setScalar(1.3); }
                    g.userData.dynamic = true;
                    ctx.scene.add(g); m.mesh = g;
                }
                const g = m.mesh; m.t += dt;
                if (m.id === 'granny_cross') { // перебегает за ~3.2 с и уходит на ту сторону
                    const k = Math.min(1, m.t / 3.2);
                    g.position.x = -m.side * (W / 2 + 2) + m.side * (W + 4) * k;
                    g.position.y = Math.abs(Math.sin(m.t * 12)) * 0.06;
                    g.userData.legs[0].rotation.x = Math.sin(m.t * 12) * 0.6; g.userData.legs[1].rotation.x = -Math.sin(m.t * 12) * 0.6;
                } else if (m.id === 'zapor_nitro') { // обгоняет: на 9 ед./с быстрее игрока
                    g.position.z -= (v + 9) * dt;
                    g.userData.flame.scale.set(1, 0.8 + Math.random() * 0.5, 1);
                    m.z = g.position.z;
                } else if (m.id === 'wheelie') { g.position.z -= v * 0.55 * dt; m.z = g.position.z; g.children[0].rotation.x = -0.5 + Math.sin(m.t * 3) * 0.06; }
                else if (m.id === 'ufo') { g.rotation.y += dt * 1.5; g.position.y = 11 + Math.sin(m.t * 1.4) * 0.6; if (ahead < -10) g.position.y += m.t * dt * 4; g.userData.beam.material.opacity = 0.18 + Math.sin(m.t * 6) * 0.06; }
                else if (m.id === 'cow') { const head = g.children[0]; head.rotation.x = Math.sin(m.t * 1.6) * 0.04; }
                // хорошо видно впереди — снимок «Фото на память» (src/photo.js): НЛО — издалека, «Запорожец» — когда обогнал
                const nearOk = m.id === 'zapor_nitro' ? zPos - g.position.z > 9 : ahead > 6 && ahead < (m.id === 'ufo' ? 75 : 38);
                if (!m.near && nearOk) { m.near = true; if (ctx.onNear) ctx.onNear(m.id); }
                // проехал мимо — засчитать и убрать подальше позади
                if (!m.seen && ahead < -2 && m.id !== 'zapor_nitro') { m.seen = true; if (ctx.onSeen) ctx.onSeen(m.id); }
                if (m.id === 'zapor_nitro' && !m.seen && zPos - g.position.z > 20) { m.seen = true; if (ctx.onSeen) ctx.onSeen(m.id); }
                if (ahead < -60 || (m.id === 'zapor_nitro' && zPos - g.position.z > 180)) { ctx.scene.remove(g); m.state = 'done'; }
            });
        },
        get active() { return list.filter(function(m) { return m.state === 'on'; }).map(function(m) { return m.id; }); },
        dispose: function() { list.forEach(function(m) { if (m.mesh) ctx.scene.remove(m.mesh); }); list.length = 0; }
    };
}
