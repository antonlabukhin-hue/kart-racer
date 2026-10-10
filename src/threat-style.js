/**
 * Язык угроз (бесконечная трасса): каждая помеха — один из четырёх классов, у класса свой цвет, звук и ответ.
 *   block  — 🟥 перекрывает полосу (труба, шлагбаум, разлом, ремонт): прыжок, подныр или объезд;
 *   slow   — 🟧 тормозит (яма, кочка, шипы, смола): объехать или перепрыгнуть;
 *   slide  — 🟦 заносит (масло, лёд, кислота): объехать, руль ровно;
 *   threat — 🟪 движется (зверь): следи и уходи.
 * Под помехой впереди — кольцо цвета класса (пульсирует, ярче ближе), при появлении — короткий звук класса.
 * Новых видов помех не добавлять, пока игрок не различает эти четыре мгновенно.
 * Логика (класс, отбор ближайших, когда звучать) — чистая, с тестами; кольца — пул мешей здесь же.
 */
import * as THREE from 'three';

export const THREAT_CLASSES = {
    block:  { color: 0xff3b30, sfx: 'warn_block',  act: 'прыжок, подныр или объезд' },
    slow:   { color: 0xffa020, sfx: 'warn_slow',   act: 'объехать или перепрыгнуть' },
    slide:  { color: 0x38c8ff, sfx: 'warn_slide',  act: 'объехать, руль ровно' },
    threat: { color: 0xff4ad8, sfx: 'warn_threat', act: 'следи и уходи' }
};
const KIND_CLASS = { pothole: 'slow', bump: 'slow', spikes: 'slow', tar: 'slow', oil: 'slide', ice: 'slide', acid: 'slide', gap: 'block', roadworks: 'block', hurdle: 'block', animal: 'threat' };

/** Класс помехи по её виду (type препятствия, 'hurdle', 'gap', 'roadworks', 'animal'); незнакомое — null (не метим) */
export function threatClass(kind) { return KIND_CLASS[kind] || null; }

export const MARK_NEAR = 3;    // ближе — уже поздно, кольцо гаснет
export const MARK_FAR = 46;    // дальше — ещё не важно
export const WARN_AT = 34;     // звук класса — когда помеха подошла на столько
export const WARN_GAP = 0.7;   // с между звуками (не трещать)
export const MAX_MARKS = 8;

/**
 * Ближайшие помехи впереди: items — [{ x, z, w, cls, ref }] (w — ширина метки), z — z игрока (трасса к −z).
 * Возвращает до max штук в [MARK_NEAR, MARK_FAR] по возрастанию расстояния, с полем d.
 */
export function pickMarks(items, z, max) {
    const out = [];
    for (let i = 0; i < items.length; i++) {
        const it = items[i], d = z - it.z;
        if (!it.cls || d < MARK_NEAR || d > MARK_FAR) continue;
        it.d = d; out.push(it);
    }
    out.sort(function(a, b) { return a.d - b.d; });
    return out.slice(0, max || MAX_MARKS);
}

/**
 * Какие помехи озвучить в этом кадре: впервые подошли ближе WARN_AT; не чаще WARN_GAP (st — { t, seen: WeakSet }).
 * Возвращает класс для звука или null. Одна помеха звучит один раз.
 */
export function warnPick(st, marks, now) {
    let cls = null;
    for (let i = 0; i < marks.length; i++) {
        const m = marks[i];
        if (m.d > WARN_AT || !m.ref || st.seen.has(m.ref)) continue;
        st.seen.add(m.ref);
        if (!cls && now - st.t >= WARN_GAP) cls = m.cls;
    }
    if (cls) st.t = now;
    return cls;
}
export function createWarnState() { return { t: -99, seen: new WeakSet() }; }

/** Яркость кольца: появляется вдали, ярче ближе, гаснет у самой машины; пульс 2.5 Гц */
export function markAlpha(d, t) {
    const inK = Math.min(1, (MARK_FAR - d) / 10), outK = Math.min(1, (d - MARK_NEAR) / 4);
    return Math.max(0, Math.min(inK, outK)) * (0.8 + 0.15 * Math.sin(t * 15.7));
}

/** Пул колец на дороге */
export function createThreatMarks(scene) {
    const geo = new THREE.RingGeometry(0.46, 0.78, 32), disc = new THREE.CircleGeometry(0.46, 32);
    geo.rotateX(-Math.PI / 2); disc.rotateX(-Math.PI / 2);
    const pool = [];
    for (let i = 0; i < MAX_MARKS; i++) {
        const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false });
        const m = new THREE.Mesh(geo, mat);
        const fill = new THREE.Mesh(disc, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false })); // слабая заливка — «зона» помехи
        fill.userData.dynamic = true; fill.frustumCulled = false; m.add(fill); m.userData.fill = fill;
        m.userData.dynamic = true; // двигается каждый кадр — заморозка сцены при старте не трогает
        m.frustumCulled = false;
        m.renderOrder = 2;
        m.visible = false;
        scene.add(m); pool.push(m);
    }
    return {
        update: function(marks, t) {
            for (let i = 0; i < pool.length; i++) {
                const m = pool[i], it = marks[i];
                if (!it) { m.visible = false; continue; }
                m.visible = true;
                m.material.color.setHex(THREAT_CLASSES[it.cls].color);
                const a = markAlpha(it.d, t), f = m.userData.fill;
                m.material.opacity = a;
                f.material.color.setHex(THREAT_CLASSES[it.cls].color); f.material.opacity = a * 0.3;
                m.position.set(it.x, 0.03, it.z);
                const w = Math.max(1, (it.w || 1.2) / 1.2);
                m.scale.set(w, 1, Math.min(w, 1.6));
            }
        },
        dispose: function() { pool.forEach(function(m) { scene.remove(m); m.material.dispose(); m.userData.fill.material.dispose(); }); geo.dispose(); disc.dispose(); }
    };
}
