/**
 * Сюрпризы и помехи бесконечной трассы:
 *   📦 Ящик «?» — деревянный ящик в полосе: сносишь — случайный исход, чаще хороший (нитро, усиление, «Е»),
 *      иногда плохой (тормоз, масло) или пусто. Как «?»-блоки в аркадах: риск ради награды.
 *   ⚠ Шипы — полоса стальных шипов поперёк полосы: не авария, но пару секунд скорость на 30% ниже; перепрыгни или объедь.
 * Исход ящика — чистая функция (с тестами); меши — здесь же.
 */
import * as THREE from 'three';

/** Исходы ящика: w — вес, good — хороший ли */
export const CRATE_OUTCOMES = [
    { id: 'nitro', w: 20, good: true, icon: '⚡', title: 'НИТРО!', sub: 'Рывок вперёд' },
    { id: 'magnet', w: 12, good: true, icon: '🧲', title: 'МАГНИТ!', sub: '«Е» сами летят к тебе' },
    { id: 'x2', w: 12, good: true, icon: '×2', title: 'ДВОЙНЫЕ «Е»!', sub: 'Каждая «Е» за две' },
    { id: 'shield', w: 10, good: true, icon: '🛡', title: 'БРОНЯ!', sub: 'Следующий удар — не авария' },
    { id: 'e25', w: 14, good: true, icon: 'Е', title: '+25 Е', sub: 'Заначка в ящике', chips: 25 },
    { id: 'e75', w: 4, good: true, icon: 'Е', title: '+75 Е!', sub: 'Целый клад!', chips: 75 },
    { id: 'badge', w: 7, good: true, icon: '🎖', title: 'ЗНАЧОК!', sub: 'В коллекцию «Значки 90-х»' }, // src/badges.js
    { id: 'slow', w: 12, good: false, icon: '🐌', title: 'ТОРМОЗ!', sub: 'В ящике был кирпич — скорость упала' },
    { id: 'oil', w: 10, good: false, icon: '🛢', title: 'МАСЛО!', sub: 'Ящик был с канистрой — занесло' },
    { id: 'empty', w: 6, good: false, icon: '💨', title: 'ПУСТО', sub: 'Повезёт в следующий раз' }
];

/** Случайный исход ящика по весам. rnd — [0,1) */
export function rollCrate(rnd) {
    const r = rnd || Math.random;
    const total = CRATE_OUTCOMES.reduce(function(s, o) { return s + o.w; }, 0);
    let x = r() * total;
    for (let i = 0; i < CRATE_OUTCOMES.length; i++) {
        x -= CRATE_OUTCOMES[i].w;
        if (x < 0) return CRATE_OUTCOMES[i];
    }
    return CRATE_OUTCOMES[CRATE_OUTCOMES.length - 1];
}

// ---- меши ----
let _crateMat = null;
function crateMaterial() {
    if (_crateMat) return _crateMat;
    const cv = document.createElement('canvas');
    cv.width = cv.height = 128;
    const g = cv.getContext('2d');
    g.fillStyle = '#b07a3c'; g.fillRect(0, 0, 128, 128);
    // доски
    for (let i = 0; i < 4; i++) {
        g.fillStyle = i % 2 ? '#a36f34' : '#bb8446'; g.fillRect(0, i * 32, 128, 30);
        g.fillStyle = 'rgba(60,30,10,0.35)'; g.fillRect(0, i * 32 + 30, 128, 2);
    }
    // рамка и диагональ, как у настоящего ящика
    g.strokeStyle = '#6a4218'; g.lineWidth = 12; g.strokeRect(6, 6, 116, 116);
    // «?»
    g.fillStyle = '#ffd23c'; g.strokeStyle = '#3a2008'; g.lineWidth = 6;
    g.font = '900 84px system-ui, "Segoe UI", Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.strokeText('?', 64, 68); g.fillText('?', 64, 68);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    _crateMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85, emissive: 0x3a2200, emissiveIntensity: 0.35 });
    return _crateMat;
}

/** Деревянный ящик «?» (~0.9 м) */
export function createCrateMesh() {
    const grp = new THREE.Group();
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), crateMaterial());
    box.position.y = 0.45;
    box.castShadow = true;
    grp.add(box);
    return grp;
}

/** Обломки ящика: доски разлетаются. Возвращает список частей для stepCrateParts */
export function breakCrate(scene, x, z, ups) {
    const parts = [];
    const mat = crateMaterial();
    for (let i = 0; i < 8; i++) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(0.4 + Math.random() * 0.3, 0.08, 0.14), mat);
        m.position.set(x + (Math.random() - 0.5) * 0.6, 0.4 + Math.random() * 0.4, z);
        scene.add(m);
        parts.push({ m: m, v: new THREE.Vector3((Math.random() - 0.5) * 6, 3 + Math.random() * 4, -(ups || 20) * 0.35 - Math.random() * 4),
            r: new THREE.Vector3(Math.random() * 8, Math.random() * 8, Math.random() * 8), t: 0 });
    }
    return parts;
}
export function stepCrateParts(parts, dt, scene) {
    for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.t += dt; p.v.y -= 14 * dt;
        p.m.position.addScaledVector(p.v, dt);
        p.m.rotation.x += p.r.x * dt; p.m.rotation.y += p.r.y * dt; p.m.rotation.z += p.r.z * dt;
        if (p.m.position.y < 0.04) { p.m.position.y = 0.04; p.v.set(p.v.x * 0.5, 0, p.v.z * 0.5); p.r.multiplyScalar(0.5); }
        if (p.t > 1.6) { scene.remove(p.m); p.m.geometry.dispose(); parts.splice(i, 1); }
    }
}

let _spikeMats = null;
/** Шипы поперёк полосы (~1.7 м): стальная лента с конусами и жёлто-чёрными краями */
export function createSpikesMesh() {
    if (!_spikeMats) _spikeMats = {
        base: new THREE.MeshStandardMaterial({ color: 0x2a2a30, roughness: 0.6, metalness: 0.6 }),
        spike: new THREE.MeshStandardMaterial({ color: 0xd8dde4, roughness: 0.25, metalness: 0.9 }),
        warn: new THREE.MeshStandardMaterial({ color: 0xffc81e, roughness: 0.6, emissive: 0x442e00, emissiveIntensity: 0.4 })
    };
    const grp = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.06, 0.42), _spikeMats.base);
    base.position.y = 0.03;
    grp.add(base);
    const cone = new THREE.ConeGeometry(0.06, 0.24, 6);
    for (let row = 0; row < 2; row++) {
        for (let i = 0; i < 9; i++) {
            const s = new THREE.Mesh(cone, _spikeMats.spike);
            s.position.set(-0.72 + i * 0.18 + row * 0.09, 0.18, row ? 0.1 : -0.1);
            grp.add(s);
        }
    }
    [-0.9, 0.9].forEach(function(x) {
        const w = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.16, 0.46), _spikeMats.warn);
        w.position.set(x, 0.08, 0);
        grp.add(w);
    });
    return grp;
}
