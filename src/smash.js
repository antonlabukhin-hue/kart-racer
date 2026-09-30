/**
 * Сносимые рекламные щиты 90-х: фанерный щит на тонких ножках прямо в полосе.
 * Снёс — не авария: лёгкое торможение, обломки, +очки стиля (ранг) и фишка.
 * Раскладка (smashSpots) — чистая, с тестами; меши и обломки — здесь же.
 */
import * as THREE from 'three';

// вымышленная реклама — без настоящих марок
export const AD_TEXTS = [
    ['ВИДЕОПРОКАТ', 'НОВИНКИ КАЖДЫЙ ДЕНЬ'],
    ['ПЕЙДЖЕР', 'ВСЕГДА НА СВЯЗИ'],
    ['ЧЕБУРЕКИ', 'КРУГЛОСУТОЧНО'],
    ['КАССЕТЫ · ДИСКИ', 'ЗАПИСЬ ЗА 5 МИНУТ'],
    ['ШИНОМОНТАЖ', 'ЗА УГЛОМ →'],
    ['КООПЕРАТИВ «ЛУЧ»', 'ВСЁ ДЛЯ ДАЧИ']
];
const AD_COLORS = [[0xffd23c, 0xc4161c], [0x2a9df4, 0xffffff], [0xff7a1a, 0x2a1400], [0xe0368f, 0xfff2a8], [0x33b24a, 0xffffff], [0xf1f1f1, 0x1a4fd8]];
export const SMASH_CHIPS = 10;

/**
 * Где поставить щиты: доли трассы подальше от разломов, арок, участков и босса; полоса — случайная.
 * busy — доли трассы, занятые другими событиями.
 */
export function smashSpots(count, busy, rnd) {
    const r = rnd || Math.random;
    const out = [];
    const cand = [0.08, 0.15, 0.22, 0.29, 0.36, 0.86, 0.9, 0.94];
    for (let i = 0; i < cand.length && out.length < count; i++) {
        const f = cand[i] + (r() - 0.5) * 0.02;
        const free = (busy || []).every(function(b) { return Math.abs(b - f) > 0.045; });
        if (free) out.push({ frac: f, lane: Math.floor(r() * 3), ad: Math.floor(r() * AD_TEXTS.length) });
    }
    return out;
}

const _texCache = {};
function adTexture(i) {
    if (_texCache[i]) return _texCache[i];
    const cv = document.createElement('canvas');
    cv.width = 256; cv.height = 128;
    const cx = cv.getContext('2d');
    const col = AD_COLORS[i % AD_COLORS.length];
    const hex = function(n) { return '#' + n.toString(16).padStart(6, '0'); };
    cx.fillStyle = hex(col[0]); cx.fillRect(0, 0, 256, 128);
    cx.strokeStyle = hex(col[1]); cx.lineWidth = 8; cx.strokeRect(6, 6, 244, 116);
    cx.fillStyle = hex(col[1]);
    cx.textAlign = 'center'; cx.textBaseline = 'middle';
    const t = AD_TEXTS[i % AD_TEXTS.length];
    cx.font = '900 30px Arial, sans-serif';
    cx.fillText(t[0], 128, 52, 232);
    cx.font = 'bold 17px Arial, sans-serif';
    cx.fillText(t[1], 128, 90, 232);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    _texCache[i] = tex;
    return tex;
}

const legMat = new THREE.MeshLambertMaterial({ color: 0x6b4a2a });
const backMat = new THREE.MeshLambertMaterial({ color: 0x8a6a44 });

/** Щит в полосе x на z; возвращает { group, x, z, ad, smashed } */
export function createSmashBoard(x, z, ad) {
    const g = new THREE.Group();
    const face = new THREE.MeshLambertMaterial({ map: adTexture(ad) });
    // лицом к машине (+z): лицевая сторона — 5-я грань BoxGeometry
    const board = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.95, 0.07), [backMat, backMat, backMat, backMat, face, backMat]);
    board.position.y = 1.05;
    g.add(board);
    [-0.75, 0.75].forEach(function(lx) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.7, 0.08), legMat);
        leg.position.set(lx, 0.35, 0);
        g.add(leg);
    });
    g.position.set(x, 0, z);
    return { group: g, x: x, z: z, ad: ad, face: face, smashed: false };
}

/** Разбить щит: убрать целый, вернуть обломки (новые меши — сцена двигает их сама) */
export function smashBoard(b, scene, carSpeed) {
    b.smashed = true;
    try { scene.remove(b.group); } catch (e) {}
    const parts = [];
    const v = Math.max(8, carSpeed || 20);
    for (let i = 0; i < 6; i++) {
        const w = 0.35 + Math.random() * 0.4, h = 0.25 + Math.random() * 0.3;
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.06), i < 4 ? [backMat, backMat, backMat, backMat, b.face, backMat] : legMat);
        m.position.set(b.x + (Math.random() - 0.5) * 1.6, 0.8 + Math.random() * 0.6, b.z);
        scene.add(m);
        parts.push({ mesh: m, vx: (Math.random() - 0.5) * 7, vy: 3 + Math.random() * 4, vz: -v * (0.5 + Math.random() * 0.4), sx: Math.random() * 9, sz: Math.random() * 9, t: 0 });
    }
    return parts;
}

/** Шаг обломков; возвращает true, пока что-то летит */
export function stepSmashParts(parts, dt, scene) {
    for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.t += dt;
        p.vy -= 14 * dt;
        p.vx *= 0.99; p.vz *= 0.985;
        p.mesh.position.x += p.vx * dt;
        p.mesh.position.y = Math.max(0.03, p.mesh.position.y + p.vy * dt);
        p.mesh.position.z += p.vz * dt;
        if (p.mesh.position.y <= 0.03) { p.vy = 0; p.vx *= 0.8; p.vz *= 0.8; }
        else { p.mesh.rotation.x += p.sx * dt; p.mesh.rotation.z += p.sz * dt; }
        if (p.t > 2.5) {
            try { scene.remove(p.mesh); p.mesh.geometry.dispose(); } catch (e) {}
            parts.splice(i, 1);
        }
    }
    return parts.length > 0;
}
