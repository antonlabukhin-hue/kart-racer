/**
 * Мини-боссы кампании: данные, материалы, меш, HP-бар.
 * spawnBoss / _spawnBossImpl остаются в main.js (замыкание сцены/игры).
 */
import * as THREE from 'three';
import { buildBossCharacter } from './boss-model.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

let _stripeTex = null;
function stripeTex() {
    if (_stripeTex) return _stripeTex;
    const cv = document.createElement('canvas');
    cv.width = 16; cv.height = 64;
    const cx = cv.getContext('2d');
    for (let i = 0; i < 8; i++) { cx.fillStyle = i % 2 ? '#f2f2f2' : '#1a3a7a'; cx.fillRect(0, i * 8, 16, 8); }
    _stripeTex = new THREE.CanvasTexture(cv);
    _stripeTex.colorSpace = THREE.SRGBColorSpace;
    _stripeTex.wrapS = _stripeTex.wrapT = THREE.RepeatWrapping;
    _stripeTex.repeat.set(1, 2);
    return _stripeTex;
}

// ============================================================
// BOSS_COMBAT — telegraph / кулдаун / множители пули (PR balance)
// ============================================================
const BOSS_COMBAT = {
    sweep:  { windup: 0.70, cooldown: 3.4, projSpeedMul: 0.85, projSizeMul: 1.15, multi: 1 },
    snipe:  { windup: 1.20, cooldown: 4.0, projSpeedMul: 1.25, projSizeMul: 0.85, multi: 1 },
    burst:  { windup: 0.55, cooldown: 3.2, projSpeedMul: 0.95, projSizeMul: 0.75, multi: 3 },
    mouth:  { windup: 0.75, cooldown: 3.0, projSpeedMul: 0.90, projSizeMul: 1.10, multi: 1 },
    rocket: { windup: 1.00, cooldown: 4.4, projSpeedMul: 0.70, projSizeMul: 1.35, multi: 1 },
    flame:  { windup: 0.60, cooldown: 2.8, projSpeedMul: 0.80, projSizeMul: 1.20, multi: 2 },
    chain:  { windup: 0.65, cooldown: 3.1, projSpeedMul: 0.88, projSizeMul: 1.00, multi: 1 },
    acid:   { windup: 0.80, cooldown: 3.6, projSpeedMul: 0.75, projSizeMul: 1.30, multi: 1 },
    riff:   { windup: 0.55, cooldown: 2.9, projSpeedMul: 0.90, projSizeMul: 1.10, multi: 2 },
    saw:    { windup: 0.60, cooldown: 3.0, projSpeedMul: 0.95, projSizeMul: 1.05, multi: 1 },
    drill:  { windup: 0.70, cooldown: 3.2, projSpeedMul: 0.90, projSizeMul: 1.00, multi: 1 },
    neon:   { windup: 0.50, cooldown: 2.6, projSpeedMul: 1.05, projSizeMul: 0.95, multi: 2 },
    tools:  { windup: 0.65, cooldown: 3.1, projSpeedMul: 0.92, projSizeMul: 1.00, multi: 1 },
    ram:    { windup: 0.85, cooldown: 3.5, projSpeedMul: 1.10, projSizeMul: 1.20, multi: 1 },
    hammer: { windup: 1.05, cooldown: 4.0, projSpeedMul: 0.80, projSizeMul: 1.40, multi: 1 },
    default:{ windup: 0.65, cooldown: 3.2, projSpeedMul: 1.00, projSizeMul: 1.00, multi: 1 }
};
function getBossCombat(attack) {
    const a = attack || 'default';
    return BOSS_COMBAT[a] || BOSS_COMBAT.default;
}


/** Пиксельные canvas-текстуры (шерсть / ткань / металл / чешуя). */
const __bossTexCache = {};
function bossPixelTex(baseHex, kind) {
    const key = kind + '|' + String(baseHex >>> 0);
    if (__bossTexCache[key]) return __bossTexCache[key];
    const size = 64;
    const cv = document.createElement('canvas');
    cv.width = cv.height = size;
    const cx = cv.getContext('2d');
    const c = new THREE.Color(baseHex);
    const mid = '#' + c.getHexString();
    const dark = '#' + c.clone().offsetHSL(0, 0, -0.18).getHexString();
    const light = '#' + c.clone().offsetHSL(0, -0.05, 0.14).getHexString();
    cx.imageSmoothingEnabled = false;
    cx.fillStyle = mid;
    cx.fillRect(0, 0, size, size);

    if (kind === 'fur' || kind === 'tiger') {
        for (let i = 0; i < 90; i++) {
            const x = (Math.random() * size) | 0;
            const y = (Math.random() * size) | 0;
            const h = 2 + ((Math.random() * 5) | 0);
            cx.fillStyle = Math.random() > 0.5 ? dark : light;
            cx.fillRect(x, y, 1 + ((Math.random() * 2) | 0), h);
        }
        if (kind === 'tiger') {
            cx.fillStyle = '#1a1008';
            for (let i = 0; i < 8; i++) {
                const x = 4 + i * 8;
                cx.beginPath();
                cx.moveTo(x, 0);
                cx.lineTo(x + 3, size);
                cx.lineTo(x + 6, size);
                cx.lineTo(x + 2, 0);
                cx.closePath();
                cx.fill();
            }
        }
    } else if (kind === 'cloth') {
        for (let y = 0; y < size; y += 4) {
            for (let x = 0; x < size; x += 4) {
                cx.fillStyle = ((x + y) % 8 === 0) ? dark : mid;
                cx.fillRect(x, y, 3, 3);
            }
        }
        cx.strokeStyle = light;
        cx.lineWidth = 1;
        for (let y = 8; y < size; y += 16) {
            cx.beginPath();
            cx.moveTo(0, y);
            cx.lineTo(size, y);
            cx.stroke();
        }
    } else if (kind === 'metal') {
        for (let i = 0; i < 12; i++) {
            const y = (i * 5 + 2) % size;
            cx.fillStyle = i % 2 ? light : dark;
            cx.fillRect(0, y, size, 1);
        }
        cx.fillStyle = light;
        for (let i = 0; i < 6; i++) {
            const y = (Math.random() * size) | 0;
            cx.fillRect(4, y, 20 + ((Math.random() * 20) | 0), 1);
        }
    } else if (kind === 'scale') {
        for (let y = 0; y < size; y += 6) {
            const off = (y % 12 === 0) ? 0 : 3;
            for (let x = -3; x < size; x += 6) {
                cx.fillStyle = ((x + y) % 12 === 0) ? light : dark;
                cx.beginPath();
                cx.arc(x + off + 3, y + 3, 3, 0, Math.PI * 2);
                cx.fill();
            }
        }
    } else if (kind === 'leather') {
        for (let i = 0; i < 70; i++) {
            const x = (Math.random() * size) | 0;
            const y = (Math.random() * size) | 0;
            cx.fillStyle = Math.random() > 0.6 ? dark : light;
            cx.fillRect(x, y, 2 + ((Math.random() * 3) | 0), 2);
        }
    } else {
        for (let i = 0; i < 50; i++) {
            cx.fillStyle = Math.random() > 0.5 ? dark : light;
            cx.fillRect((Math.random() * size) | 0, (Math.random() * size) | 0, 2, 2);
        }
    }

    const tex = new THREE.CanvasTexture(cv);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.generateMipmaps = false;
    try { if (window.optimizeTexture) window.optimizeTexture(tex, { nearest: true, srgb: true }); } catch (e) {}
    __bossTexCache[key] = tex;
    return tex;
}

const CAMPAIGN_BOSSES = [
    { id: 'BOAR_BRIGADE', name: 'Кабан «Бригада»', animal: 'BOAR', fur: 0x6b4423, jacket: 0x2a1810, trim: 0xffcc00, eye: 0xff6644, accent: 0xff2244, weapon: 'bat', attack: 'sweep', hp: 3, scale: 2.15, shout: 'Я вас Арсеньевских знаю!' },
    { id: 'WOLF_NIGHT', name: 'Волк-снайпер «Ночной»', animal: 'WOLF', fur: 0x3a3a48, jacket: 0x1a1a2a, trim: 0xff0000, eye: 0xffdd00, accent: 0x00ff88, weapon: 'rifle', attack: 'snipe', hp: 3, scale: 2.05, shout: 'Частота закрыта!' },
    { id: 'BEAR_VETERAN', name: 'Медведь-ветеран «Дед»', animal: 'BEAR', fur: 0x5a3a20, jacket: 0x8a7a5a, trim: 0xffcc00, eye: 0xffaa44, accent: 0x1a1a1a, weapon: 'ppsh', attack: 'burst', hp: 4, scale: 2.4, shout: 'За Родину, курьер!' },
    { id: 'CROC_GUARD', name: 'Крокодил «Зубастик»', animal: 'CROC', fur: 0x3c9a3c, jacket: 0x2a4a78, trim: 0xff6600, eye: 0xffff44, accent: 0xffdd44, weapon: 'mouth', attack: 'mouth', hp: 3, scale: 2.15, shout: 'Промзона — мой двор!' },
    { id: 'RHINO_STORM', name: 'Носорог «Рог»', animal: 'RHINO', fur: 0xa9a9a9, jacket: 0x3a3a2a, trim: 0xffaa00, eye: 0xff8866, accent: 0xff3300, weapon: 'rpg', attack: 'rocket', hp: 4, scale: 2.25, shout: 'Цех №7 не для вас!' },
    { id: 'DINO_FOREMAN', name: 'Дино-бригадир «Рекс»', animal: 'DINO', fur: 0x4a6a2a, jacket: 0x8a5a20, trim: 0xffaa22, eye: 0xffee44, accent: 0x222222, weapon: 'pipe', attack: 'flame', hp: 4, scale: 2.2, shout: 'Красные трубы помнят!' },
    { id: 'LION_DUMP', name: 'Лев-свалщик «Грива»', animal: 'LION', fur: 0xdaa520, jacket: 0x1a1a1a, trim: 0xff2244, eye: 0xffaa00, accent: 0x8b4513, weapon: 'chain', attack: 'chain', hp: 3, scale: 2.15, shout: 'Надежда кончилась!' },
    { id: 'HIPPO_TOXIC', name: 'Бегемот «Химик»', animal: 'HIPPO', fur: 0x9370db, jacket: 0x222222, trim: 0x33ff44, eye: 0x88ff44, accent: 0xffaa00, weapon: 'canister', attack: 'acid', hp: 4, scale: 2.2, shout: 'Зелёный дым — мой духи!' },
    { id: 'TIGER_ROCKER', name: 'Тигр-рокер «Кислотный»', animal: 'TIGER', fur: 0xd2691e, jacket: 0x1a1a1a, trim: 0xffdd00, eye: 0xffaa44, accent: 0xff2244, weapon: 'guitar', attack: 'riff', hp: 3, scale: 2.1, shout: 'Ми-Ля-До, курьер!' },
    { id: 'SHARK_SAW', name: 'Акула «Пила»', animal: 'SHARK', fur: 0x6a7a8a, jacket: 0xaa2222, trim: 0xcccccc, eye: 0xffffff, accent: 0xffffff, weapon: 'saw', attack: 'saw', hp: 4, scale: 2.15, shout: 'Кровь в воде!' },
    { id: 'BULL_MINER', name: 'Бык-шахтёр «Уголёк»', animal: 'BULL', fur: 0x2e2018, jacket: 0x3a5068, trim: 0xffdd00, eye: 0xff2200, accent: 0xff8800, weapon: 'drill', attack: 'drill', hp: 4, scale: 2.25, shout: 'Уголь и пыль!' },
    { id: 'PANTHER_NEON', name: 'Пантера «Неон»', animal: 'PANTHER', fur: 0x1c1a24, jacket: 0x3a1450, trim: 0xff00ff, eye: 0x00ffff, accent: 0xffff00, weapon: 'disco', attack: 'neon', hp: 3, scale: 2.05, shout: 'Диско не умерло!' },
    { id: 'GORILLA_MECH', name: 'Горилла «Гайка»', animal: 'GORILLA', fur: 0x2a2a2a, jacket: 0x4a6a2a, trim: 0x8a8a8a, eye: 0xffaa22, accent: 0xffaa22, weapon: 'wrench', attack: 'tools', hp: 5, scale: 2.2, shout: 'Сейчас подкручу!' },
    { id: 'WOLF_BIKER', name: 'Волк-байкер «Гонщик»', animal: 'WOLF', fur: 0x8a5a20, jacket: 0x1a1a1a, trim: 0xffaa00, eye: 0xff6644, accent: 0xff0000, weapon: 'crowbar', attack: 'ram', hp: 4, scale: 2.15, shout: 'Куда прешь, курьер!' },
    { id: 'LIZARD_VOLT', name: 'Ящер «Вольт»', animal: 'LIZARD', fur: 0x3a8a5a, jacket: 0x222222, trim: 0x00ffff, eye: 0x00ff88, accent: 0xffdd00, weapon: 'whip', attack: 'zap', hp: 4, scale: 2.05, shout: 'Разряд!' },
    { id: 'MONKEY_HACK', name: 'Обезьяна «Байт»', animal: 'MONKEY', fur: 0xcd853f, jacket: 0xffffff, trim: 0x00ff88, eye: 0x00ff88, accent: 0xff2244, weapon: 'drone', attack: 'drone', scale: 2.0, shout: '404 — антидот не найден!' },
    { id: 'ALPHA_JUDGE', name: 'Альфа «Судья»', animal: 'ALPHA', fur: 0x2a2a35, jacket: 0x0a0a0a, trim: 0x8a7a5a, eye: 0xcc0000, accent: 0xcc0000, weapon: 'hammer', attack: 'hammer', hp: 6, scale: 2.5, shout: 'Мир останется моим!' }
];
// createMiniBoss удалён — босс через spawnBoss (createAnimalMesh)

function ensureToonGradient() {
    if (window.__toonGradient) return window.__toonGradient;
    try {
        const data = new Uint8Array([60, 120, 190, 255]);
        const tex = new THREE.DataTexture(data, 4, 1, THREE.RedFormat);
        tex.minFilter = THREE.NearestFilter;
        tex.magFilter = THREE.NearestFilter;
        tex.needsUpdate = true;
        window.__toonGradient = tex;
    } catch (e) { window.__toonGradient = null; }
    return window.__toonGradient;
}
function bossMat(color, opts) {
    opts = opts || {};
    let c = (typeof color === 'number') ? (color >>> 0) : color;
    if (typeof c === 'number') c = c & 0xffffff;
    const e = opts.emissive != null ? opts.emissive : 0x000000;
    const ei = opts.emissiveIntensity != null ? opts.emissiveIntensity : 0;
    const rough = opts.roughness != null ? opts.roughness : 0.55;
    const metal = opts.metalness != null ? opts.metalness : 0.08;
    const map = opts.map || null;
    const mapKey = map && map.uuid ? map.uuid : (opts.texKind || '0');
    const glow = (ei > 0.05) || (e !== 0 && e !== 0x000000);
    try { ensureToonGradient(); } catch (errTg) {}
    const low = !!(window.__isMobile || window.__lastQuality === 'low' ||
        (window.__renderOpt && window.__renderOpt.quality === 'low'));
    const high = !low && (window.__lastQuality === 'high' ||
        (window.__renderOpt && window.__renderOpt.quality === 'high') ||
        window.__enableBossPBR === true);
    let mode;
    if (glow) mode = 'basic';
    else if (low) mode = 'basic';
    else if (high && window.__enableBossPBR !== false) mode = 'pbr';
    else if (window.__toonGradient) mode = 'toon';
    else mode = 'lambert';
    const key = mode + '|' + String(c) + '|' + rough.toFixed(2) + '|' + metal.toFixed(2) +
        '|' + mapKey + '|' + (glow ? String(e) + '|' + Math.round(ei * 10) : '0');
    if (!window.__bossMatCache) window.__bossMatCache = {};
    if (!window.__bossMatCache[key]) {
        const base = { color: c, fog: true };
        if (map) base.map = map;
        // «аркадный самосвет»: солнце светит боссу в спину, и к игроку он повёрнут теневой стороной —
        // на снегу и ночью силуэт выходил почти чёрным. Подсвечиваем собственным цветом (~30%).
        const selfLit = mode !== 'basic' ? { emissive: c, emissiveIntensity: 0.3 } : {};
        if (mode === 'basic') {
            const mat = new THREE.MeshBasicMaterial(base);
            if (glow) {
                try {
                    const col = new THREE.Color(c);
                    col.offsetHSL(0, 0, Math.min(0.35, 0.12 + ei * 0.25));
                    mat.color.copy(col);
                } catch (err) {}
            }
            window.__bossMatCache[key] = mat;
        } else if (mode === 'pbr') {
            window.__bossMatCache[key] = new THREE.MeshStandardMaterial(
                Object.assign({}, base, selfLit, { roughness: rough, metalness: metal })
            );
        } else if (mode === 'toon') {
            window.__bossMatCache[key] = new THREE.MeshToonMaterial(
                Object.assign({}, base, selfLit, { gradientMap: window.__toonGradient })
            );
        } else {
            window.__bossMatCache[key] = new THREE.MeshLambertMaterial(
                Object.assign({}, base, selfLit, { flatShading: true })
            );
        }
    }
    return window.__bossMatCache[key];
}
let _outlineMat = null;
function getOutlineMat() {
    if (_outlineMat) return _outlineMat;
    _outlineMat = new THREE.MeshBasicMaterial({
        color: 0x08060c, side: THREE.BackSide, depthWrite: false
    });
    window.__bossOutlineMat = _outlineMat;
    return _outlineMat;
}

function addBossOutline(mesh, scaleMul) {
    if (!mesh) return null;
    try {
        const outline = mesh.clone();
        outline.material = getOutlineMat();
        outline.scale.multiplyScalar(scaleMul || 1.07);
        outline.renderOrder = -1;
        outline.castShadow = false;
        outline.userData.isOutline = true;
        if (mesh.parent) mesh.parent.add(outline);
        return outline;
    } catch (e) { return null; }
}

/** Освобождает geometry босса (материалы — из кеша, не dispose). */
function disposeBossMesh(root) {
    if (!root) return;
    try {
        root.traverse(function(o) {
            if (!o.isMesh) return;
            try { if (o.geometry) o.geometry.dispose(); } catch (eG) {}
        });
    } catch (e) {}
}



function createBossHpBar(maxHp) {
    const bar = new THREE.Group();
    bar.name = 'bossHpBar';
    // подпись HP слева от полоски
    try {
        if (!window.__bossHpTex) {
            const cv = document.createElement('canvas');
            cv.width = 64; cv.height = 32;
            const cx = cv.getContext('2d');
            cx.clearRect(0, 0, 64, 32);
            cx.font = 'bold 22px Arial, sans-serif';
            cx.textAlign = 'center';
            cx.textBaseline = 'middle';
            cx.fillStyle = '#ff6644';
            cx.strokeStyle = '#000000';
            cx.lineWidth = 3;
            cx.strokeText('HP', 32, 16);
            cx.fillText('HP', 32, 16);
            window.__bossHpTex = new THREE.CanvasTexture(cv);
            window.__bossHpTex.needsUpdate = true;
        }
        const label = new THREE.Mesh(
            new THREE.PlaneGeometry(0.64, 0.32),
            new THREE.MeshBasicMaterial({ map: window.__bossHpTex, transparent: true, depthTest: false })
        );
        label.position.set(-1.24, 0, 0.02);
        bar.add(label);
    } catch (e) {}
    // размер ×2
    const bg = new THREE.Mesh(
        new THREE.PlaneGeometry(1.6, 0.14),
        new THREE.MeshBasicMaterial({ color: 0x111111, transparent: true, opacity: 0.75, depthTest: false })
    );
    bg.position.set(0.1, 0, -0.01);
    bar.add(bg);
    const fills = [];
    const n = Math.max(1, maxHp || 3);
    const gap = 0.06;
    const w = (1.5 - gap * (n - 1)) / n;
    for (let i = 0; i < n; i++) {
        const f = new THREE.Mesh(
            new THREE.PlaneGeometry(w, 0.1),
            new THREE.MeshBasicMaterial({ color: 0xff3300, depthTest: false })
        );
        f.position.x = -0.65 + w / 2 + i * (w + gap);
        f.position.z = 0.01;
        bar.add(f);
        fills.push(f);
    }
    bar.userData.fills = fills;
    bar.userData.maxHp = n;
    return bar;
}
function updateBossHpBar(boss, camera) {
    if (!boss || !boss.hpBar) return;
    if (!boss.mesh) { boss.hpBar.visible = false; return; }
    const fills = boss.hpBar.userData.fills || [];
    const maxH = boss.maxHp || fills.length || 3;
    for (let i = 0; i < fills.length; i++) {
        const on = i < boss.hp;
        fills[i].visible = on;
        if (on) {
            const ratio = boss.hp / maxH;
            fills[i].material.color.setHex(ratio > 0.66 ? 0x33ff66 : ratio > 0.33 ? 0xffcc00 : 0xff3300);
        }
    }
    try {
        if (!boss._hpWorld) boss._hpWorld = new THREE.Vector3();
        boss.mesh.getWorldPosition(boss._hpWorld);
        const sc = boss._baseScale || 1;
        boss.hpBar.position.set(
            boss._hpWorld.x,
            boss._hpWorld.y + 1.85 * sc + 0.9,
            boss._hpWorld.z
        );
        // камеру передают параметром: в модуле её нет, и полоска раньше не поворачивалась к игроку
        if (camera) boss.hpBar.quaternion.copy(camera.quaternion);
        // вплотную к камере полоска вылезала на панель HUD — прячем (HP есть текстом в HUD)
        const near = camera ? camera.position.distanceTo(boss.hpBar.position) < 7 : false;
        boss.hpBar.visible = !boss.dying && !near;
    } catch (e) {}
}

/**
 * Узнаваемые детали каждого босса — «одна мысль на силуэт»: по чему игрок узнаёт босса издалека
 * (грива, каска с фонарём, плавник, катушки Теслы…) плюс мелочи вблизи (медали, нашивки, заклёпки).
 * Координаты: root — ступни в y=0, плечи ~1.2, лицом к +z; head — группа на y=1.36.
 */
function addBossSignature(c) {
    const { id, root, head, leftArm, rightArm, leftLeg, rightLeg, weap, px, add, M, mats, seg } = c;
    const glow = function(col, k) { return M(col, { emissive: col, emissiveIntensity: k == null ? 0.8 : k }); };
    const white = M(0xf0f0f0);
    const black = M(0x111114);
    // хвост: цепочка сегментов назад и вверх
    function tail(mat, n, len, y, lift, tipMat) {
        for (let i = 0; i < n; i++) {
            const k = i / Math.max(1, n - 1);
            const s = 0.13 * (1 - k * 0.55);
            px(root, (i === n - 1 && tipMat) ? tipMat : mat, 0, y + k * lift, -0.26 - i * (len / n), s, s, len / n + 0.03);
        }
    }
    function medal(p, x, y, z, ribbon) {
        px(p, M(ribbon), x, y + 0.045, z, 0.05, 0.05, 0.02);
        add(p, new THREE.CylinderGeometry(0.03, 0.03, 0.015, 10), mats.gold, x, y, z + 0.005, Math.PI / 2, 0, 0);
    }
    function stripes(col) {
        [leftLeg, rightLeg].forEach(function(g, i) {
            const sx = i ? 0.115 : -0.115;
            px(g, M(col), sx * 1.05, -0.22, 0, 0.012, 0.4, 0.05);
        });
    }
    function shoulderSpikes(mat) {
        [-1, 1].forEach(function(s) {
            for (let i = 0; i < 3; i++) add(root, new THREE.ConeGeometry(0.035, 0.12, 5), mat, s * (0.42 + i * 0.05), 1.3 - i * 0.02, -0.02 + i * 0.04, 0, 0, -s * 0.5);
        });
    }
    function noOutline(m) { if (m) m.userData.noOutline = true; return m; }

    switch (id) {
    case 'BOAR_BRIGADE': {
        // «Бригада»: спортивный костюм с лампасами, толстая «голда», бита с гвоздями, ирокез щетины
        stripes(0xf2f2f2);
        add(root, new THREE.TorusGeometry(0.2, 0.035, 8, 20), mats.gold, 0, 1.22, 0.08, Math.PI / 2.4, 0, 0);
        px(root, mats.gold, 0, 1.05, 0.24, 0.09, 0.11, 0.03); // кулон
        for (let i = 0; i < 6; i++) add(head, new THREE.ConeGeometry(0.03, 0.12, 4), mats.furD, 0, 0.34 - i * 0.005, 0.12 - i * 0.07, -0.3, 0, 0);
        for (let i = 0; i < 4; i++) px(weap, mats.gunL, (i % 2 ? 0.06 : -0.06), 0, 0.46 + i * 0.04, 0.08, 0.015, 0.015); // гвозди
        px(head, mats.gold, 0.05, -0.13, 0.4, 0.03, 0.03, 0.02); // золотой зуб
        px(head, white, -0.1, -0.12, 0.42, 0.14, 0.022, 0.022); // сигарета
        px(head, glow(0xff5522, 1.2), -0.18, -0.12, 0.42, 0.02, 0.026, 0.026);
        break;
    }
    case 'WOLF_NIGHT': {
        // снайпер: длинный ствол с оптикой, лазерный луч, прибор ночного видения, патронташ, плащ до колен
        add(weap, new THREE.CylinderGeometry(0.02, 0.02, 0.5, 6), mats.gun, 0, 0, 0.6, Math.PI / 2, 0, 0);
        add(weap, new THREE.CylinderGeometry(0.035, 0.035, 0.22, 8), mats.gunL, 0, 0.1, 0.22, Math.PI / 2, 0, 0);
        noOutline(px(weap, glow(0xff1111, 1.6), 0, 0.02, 1.6, 0.012, 0.012, 1.6)); // лазер
        [-0.07, 0.07].forEach(function(x) {
            add(head, new THREE.CylinderGeometry(0.035, 0.04, 0.1, 8), mats.gun, x, 0.14, 0.3, Math.PI / 2, 0, 0);
            px(head, glow(0x33ff66, 1.3), x, 0.14, 0.355, 0.05, 0.05, 0.01);
        });
        for (let i = 0; i < 7; i++) px(root, mats.gold, -0.22 + i * 0.075, 1.18 - i * 0.07, 0.22, 0.035, 0.07, 0.03);
        px(root, mats.jackD, 0, 0.55, -0.22, 0.6, 0.5, 0.06); // полы плаща
        break;
    }
    case 'BEAR_VETERAN': {
        // «Дед»: красная звезда на ушанке, иконостас медалей, седая борода, валенки
        const star = glow(0xdd1111, 0.5);
        for (let i = 0; i < 5; i++) {
            const a = (i / 5) * Math.PI * 2;
            px(head, star, Math.sin(a) * 0.035, 0.3 + Math.cos(a) * 0.035, 0.24, 0.03, 0.07, 0.02).rotation.z = -a;
        }
        [0xcc2222, 0x2255cc, 0xffcc22, 0x22aa55, 0xcc2222, 0xffcc22].forEach(function(col, i) {
            medal(root, -0.2 + (i % 3) * 0.07, 1.08 - Math.floor(i / 3) * 0.1, 0.24, col);
        });
        const beard = add(head, new THREE.SphereGeometry(0.13, seg, seg), M(0xd8d8d0), 0, -0.16, 0.2); // борода
        beard.scale.set(1.15, 0.9, 0.75);
        [-1, 1].forEach(function(s2) { const mu = add(head, new THREE.CapsuleGeometry(0.03, 0.07, 4, 8), M(0xe8e8e0), s2 * 0.05, -0.06, 0.29, 0, 0, s2 * 1.2); mu.userData.noOutline = true; }); // усы
        [leftLeg, rightLeg].forEach(function(g) { px(g, M(0x5a5048), 0, -0.38, 0.03, 0.26, 0.26, 0.3); });
        break;
    }
    case 'CROC_GUARD': {
        // охранник промзоны: фуражка с кокардой, чёрные очки, рация, дубинка-фонарь, длинный хвост с гребнем
        add(head, new THREE.CylinderGeometry(0.19, 0.17, 0.09, 12), M(0x2a4a78), 0, 0.33, -0.14);
        px(head, black, 0, 0.3, 0.02, 0.26, 0.02, 0.12); // козырёк
        px(head, mats.gold, 0, 0.35, 0.03, 0.06, 0.05, 0.02); // кокарда
        px(root, black, 0.22, 0.8, 0.22, 0.08, 0.12, 0.05); // рация
        px(root, mats.gunL, 0.24, 0.9, 0.22, 0.01, 0.12, 0.01);
        tail(mats.fur, 7, 1.0, 0.45, -0.3);
        for (let i = 0; i < 6; i++) add(root, new THREE.ConeGeometry(0.03, 0.08, 4), mats.furL, 0, 0.55 - i * 0.04, -0.3 - i * 0.14);
        break;
    }
    case 'RHINO_STORM': {
        // штурмовик: бронепластина, связка ракет за спиной, второй рог
        px(root, mats.gunL, 0, 1.0, 0.25, 0.46, 0.4, 0.05);
        for (let i = 0; i < 6; i++) px(root, mats.gold, -0.18 + (i % 3) * 0.18, 0.88 + Math.floor(i / 3) * 0.24, 0.28, 0.035, 0.035, 0.02); // заклёпки
        [-0.16, 0, 0.16].forEach(function(x) {
            add(root, new THREE.CylinderGeometry(0.05, 0.05, 0.5, 8), M(0x4a5a3a), x, 1.25, -0.26, 0.2, 0, 0);
            add(root, new THREE.ConeGeometry(0.06, 0.14, 8), glow(0xff5522, 0.4), x, 1.55, -0.2, 0.2, 0, 0);
        });
        add(head, new THREE.ConeGeometry(0.05, 0.2, 8), mats.tooth, 0, 0.16, 0.34, Math.PI / 3, 0, 0);
        break;
    }
    case 'DINO_FOREMAN': {
        // бригадир: жёлтая каска, оранжевый жилет со светоотражающими полосами, баллоны огнемёта, толстый хвост
        add(head, new THREE.SphereGeometry(0.24, seg, seg, 0, Math.PI * 2, 0, Math.PI * 0.5), M(0xffcc00), 0, 0.2, 0.04);
        px(head, M(0xffcc00), 0, 0.2, 0.26, 0.36, 0.025, 0.12);
        px(root, M(0xff6a00), 0, 0.98, 0.21, 0.5, 0.46, 0.04);
        [0.9, 1.06].forEach(function(y) { px(root, glow(0xd8e0e8, 0.35), 0, y, 0.235, 0.5, 0.035, 0.01); });
        [-0.1, 0.1].forEach(function(x) {
            add(root, new THREE.CylinderGeometry(0.08, 0.08, 0.48, 10), M(0xaa2211), x, 1.0, -0.28);
            add(root, new THREE.SphereGeometry(0.08, 8, 8), M(0xaa2211), x, 1.24, -0.28);
        });
        tail(mats.fur, 6, 0.9, 0.55, -0.35);
        break;
    }
    case 'LION_DUMP': {
        // король свалки: корона из жести, покрышки-наплечники, хвост с кисточкой
        for (let i = 0; i < 5; i++) {
            const a = -0.5 + i * 0.25;
            add(head, new THREE.ConeGeometry(0.035, 0.12, 4), mats.gold, Math.sin(a) * 0.2, 0.42, Math.cos(a) * 0.05);
        }
        add(head, new THREE.CylinderGeometry(0.2, 0.2, 0.06, 12, 1, true), mats.gold, 0, 0.36, 0);
        [-1, 1].forEach(function(s) {
            add(root, new THREE.TorusGeometry(0.13, 0.06, 8, 14), black, s * 0.44, 1.26, 0.02, Math.PI / 2, 0, 0);
        });
        tail(mats.fur, 6, 0.8, 0.6, 0.25, M(0x6a3a10));
        break;
    }
    case 'HIPPO_TOXIC': {
        // «Химик»: противогаз с фильтрами, бочки с отходами на спине, резиновый фартук
        px(head, black, 0, 0.0, 0.4, 0.34, 0.2, 0.1);
        [-0.12, 0.12].forEach(function(x) { add(head, new THREE.CylinderGeometry(0.06, 0.07, 0.1, 10), M(0x4a5a3a), x, -0.06, 0.48, Math.PI / 2, 0, 0); });
        [-0.08, 0.08].forEach(function(x) { px(head, glow(0x88ff44, 0.7), x, 0.14, 0.34, 0.08, 0.06, 0.02); });
        [-0.14, 0.14].forEach(function(x) {
            add(root, new THREE.CylinderGeometry(0.12, 0.12, 0.36, 12), glow(0x33cc33, 0.35), x, 1.02, -0.32);
            px(root, M(0xffcc00), x, 1.02, -0.2, 0.08, 0.08, 0.02);
        });
        px(root, M(0x2a3a2a), 0, 0.72, 0.24, 0.5, 0.5, 0.03);
        break;
    }
    case 'TIGER_ROCKER': {
        // рокер: ирокез, шипы на косухе, гитара-«молния», полосатый хвост
        for (let i = 0; i < 7; i++) add(head, new THREE.ConeGeometry(0.035, 0.18 - Math.abs(i - 3) * 0.02, 4), glow(0xff2244, 0.45), 0, 0.36, 0.16 - i * 0.07, -0.2, 0, 0);
        shoulderSpikes(M(0xd0d0d8, { metalness: 0.8, roughness: 0.2 }));
        px(weap, mats.acc, 0.12, 0, 0.1, 0.12, 0.08, 0.2).rotation.y = 0.5;
        px(weap, mats.acc, -0.12, 0, 0.08, 0.12, 0.08, 0.2).rotation.y = -0.5;
        px(head, black, 0, 0.12, 0.26, 0.3, 0.05, 0.03); // тёмные очки
        tail(mats.fur, 6, 0.8, 0.6, 0.3, M(0x1a1008));
        break;
    }
    case 'SHARK_SAW': {
        // «Пила»: огромный спинной плавник, бензопила, тельняшка, хвостовой плавник
        const fin = add(root, new THREE.ConeGeometry(0.16, 0.6, 4), mats.fur, 0, 1.4, -0.24, -0.5, Math.PI / 4, 0);
        fin.scale.set(1, 1, 0.35);
        px(weap, M(0xdd4411), 0, 0, 0.05, 0.16, 0.18, 0.24); // корпус пилы
        px(weap, mats.gunL, 0, 0, 0.45, 0.04, 0.12, 0.6); // шина
        for (let i = 0; i < 5; i++) px(root, i % 2 ? white : M(0x1a3a6a), 0, 0.82 + i * 0.07, 0.22, 0.42, 0.05, 0.02);
        add(root, new THREE.ConeGeometry(0.14, 0.34, 4), mats.fur, 0, 0.75, -0.55, Math.PI / 2 + 0.3, 0, 0);
        break;
    }
    case 'BULL_MINER': {
        // шахтёр: каска с фонарём (луч виден в темноте тоннеля), угольная сажа, кирка за спиной
        add(head, new THREE.SphereGeometry(0.23, seg, seg, 0, Math.PI * 2, 0, Math.PI * 0.5), M(0xe8b800), 0, 0.2, 0);
        add(head, new THREE.CylinderGeometry(0.06, 0.06, 0.06, 12), mats.gunL, 0, 0.3, 0.22, Math.PI / 2, 0, 0);
        px(head, glow(0xfff4c0, 1.6), 0, 0.3, 0.255, 0.09, 0.09, 0.01);
        const beam = new THREE.Mesh(new THREE.ConeGeometry(0.35, 2.2, 16, 1, true),
            new THREE.MeshBasicMaterial({ color: 0xfff0b0, transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide }));
        beam.rotation.x = -Math.PI / 2; beam.position.set(0, 0.3, 1.35); beam.userData.noOutline = true; head.add(beam);
        [[-0.1, 0.02], [0.12, -0.06], [0.02, 0.12]].forEach(function(p) { px(head, black, p[0], p[1], 0.36, 0.06, 0.04, 0.02); });
        add(root, new THREE.CylinderGeometry(0.02, 0.02, 0.8, 6), mats.wood, 0.1, 1.05, -0.26, 0, 0, 0.6);
        px(root, mats.gunL, -0.14, 1.35, -0.26, 0.34, 0.05, 0.05).rotation.z = 0.6;
        break;
    }
    case 'PANTHER_NEON': {
        // «Неон»: светящиеся полосы на куртке, наушники, неоновый хвост
        [0xff00ff, 0x00ffff, 0xffff00].forEach(function(col, i) { px(root, glow(col, 0.9), 0, 0.82 + i * 0.12, 0.23, 0.46, 0.025, 0.01); });
        add(head, new THREE.TorusGeometry(0.22, 0.02, 6, 16, Math.PI), mats.gunL, 0, 0.1, 0, 0, 0, 0);
        [-0.22, 0.22].forEach(function(x) { add(head, new THREE.CylinderGeometry(0.07, 0.07, 0.05, 12), glow(0xff00ff, 0.7), x, 0.08, 0, 0, 0, Math.PI / 2); });
        tail(mats.fur, 7, 0.9, 0.55, 0.35, glow(0x00ffff, 1.0));
        break;
    }
    case 'GORILLA_MECH': {
        // механик: баллон сварки за спиной, пояс с инструментами, шестерня-наплечник
        add(root, new THREE.CylinderGeometry(0.1, 0.1, 0.55, 10), M(0x2a6a3a), 0, 1.0, -0.3);
        add(root, new THREE.SphereGeometry(0.1, 8, 8), M(0x2a6a3a), 0, 1.28, -0.3);
        px(root, M(0x6a4a20), 0, 0.72, 0.2, 0.62, 0.1, 0.06);
        [-0.2, -0.05, 0.12, 0.25].forEach(function(x, i) { px(root, i % 2 ? mats.gunL : mats.acc, x, 0.62, 0.23, 0.04, 0.16, 0.03); });
        add(root, new THREE.TorusGeometry(0.12, 0.04, 6, 8), mats.gold, 0.46, 1.3, 0.02, Math.PI / 2, 0, 0);
        break;
    }
    case 'WOLF_BIKER': {
        // байкер: бандана, очки-консервы на лбу, шипованные наплечники, языки пламени на спине
        px(head, M(0xcc1111), 0, 0.22, 0, 0.44, 0.1, 0.4);
        px(head, M(0xcc1111), 0, 0.14, -0.24, 0.08, 0.14, 0.04);
        [-0.08, 0.08].forEach(function(x) { add(head, new THREE.CylinderGeometry(0.045, 0.045, 0.04, 10), glow(0xffaa33, 0.4), x, 0.22, 0.22, Math.PI / 2, 0, 0); });
        shoulderSpikes(M(0xd0d0d8, { metalness: 0.8, roughness: 0.2 }));
        [[-0.12, 0.9, 0.3], [0, 0.95, 0.4], [0.12, 0.9, 0.3]].forEach(function(p) { px(root, glow(0xff6600, 0.5), p[0], p[1], -0.22, 0.1, p[2], 0.02); });
        break;
    }
    case 'LIZARD_VOLT': {
        // «Вольт»: две катушки Теслы на спине, искры у рук, хвост
        [-0.14, 0.14].forEach(function(x) {
            add(root, new THREE.CylinderGeometry(0.05, 0.07, 0.5, 8), mats.gunL, x, 1.2, -0.28);
            for (let i = 0; i < 3; i++) add(root, new THREE.TorusGeometry(0.07, 0.015, 5, 12), glow(0x00ffff, 0.9), x, 1.05 + i * 0.12, -0.28, Math.PI / 2, 0, 0);
            add(root, new THREE.SphereGeometry(0.08, 10, 10), glow(0x88ffff, 1.2), x, 1.5, -0.28);
        });
        [-0.06, 0.06, -0.02].forEach(function(y, i) { noOutline(px(leftArm, glow(0x66ffff, 1.4), (i - 1) * 0.06, -0.7 + y, 0.08, 0.02, 0.12, 0.02)).rotation.z = (i - 1) * 0.7; });
        tail(mats.fur, 7, 1.0, 0.45, -0.25);
        break;
    }
    case 'MONKEY_HACK': {
        // «Байт»: VR-шлем, серверный рюкзак с мигающими диодами, антенна
        px(head, black, 0, 0.12, 0.28, 0.4, 0.14, 0.12);
        px(head, glow(0x00ff88, 1.0), 0, 0.12, 0.345, 0.34, 0.03, 0.01);
        px(root, M(0x2a2a30), 0, 1.0, -0.3, 0.4, 0.5, 0.18);
        for (let i = 0; i < 6; i++) px(root, glow(i % 2 ? 0x00ff88 : 0xff2244, 1.0), -0.12 + (i % 3) * 0.12, 0.9 + Math.floor(i / 3) * 0.16, -0.2, 0.03, 0.03, 0.01);
        add(root, new THREE.CylinderGeometry(0.01, 0.01, 0.4, 4), mats.gunL, 0.14, 1.45, -0.3);
        add(root, new THREE.SphereGeometry(0.03, 6, 6), glow(0xff2244, 1.2), 0.14, 1.66, -0.3);
        break;
    }
    case 'ALPHA_JUDGE': {
        // финальный «Судья»: мантия в пол, весы правосудия, золотые наплечники, багровая аура
        px(root, M(0x5a0a10), 0, 0.6, -0.16, 0.8, 1.1, 0.1);
        [-1, 1].forEach(function(s) { px(root, M(0x5a0a10), s * 0.36, 0.55, 0.02, 0.1, 1.0, 0.3); });
        [-1, 1].forEach(function(s) { add(root, new THREE.SphereGeometry(0.15, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), mats.gold, s * 0.46, 1.28, 0.02); });
        const sc = new THREE.Group();
        add(sc, new THREE.CylinderGeometry(0.012, 0.012, 0.3, 6), mats.gold, 0, 0, 0);
        px(sc, mats.gold, 0, 0.14, 0, 0.36, 0.02, 0.02);
        [-0.17, 0.17].forEach(function(x) { add(sc, new THREE.CylinderGeometry(0.08, 0.05, 0.03, 12), mats.gold, x, 0.02, 0); });
        sc.position.set(0, -0.72, 0.1);
        leftArm.add(sc);
        const aura = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.9, 32),
            new THREE.MeshBasicMaterial({ color: 0xaa0011, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }));
        aura.rotation.x = -Math.PI / 2; aura.position.y = 0.03; aura.userData.noOutline = true; root.add(aura);
        break;
    }
    }
}

function createArcadeBossMesh(def) {
    const root = new THREE.Group();
    const id = def.id || def.animal || 'BOAR';
    const typeId = def.animal || 'BOAR';
    const fur = def.fur != null ? def.fur : 0x5a4030;
    const jack = def.jacket != null ? def.jacket : 0x2a1810;
    const trim = def.trim != null ? def.trim : 0xc0a050;
    const eyeC = def.eye != null ? def.eye : 0xff6644;
    const accent = def.accent != null ? def.accent : 0xff2244;
    const wt = def.weapon || 'bat';

    function M(col, opts) {
        opts = opts || {};
        return bossMat(col, opts);
    }
    const furD = new THREE.Color(fur).offsetHSL(0, 0, -0.15).getHex();
    const furL = new THREE.Color(fur).offsetHSL(0, -0.04, 0.12).getHex();
    const jackD = new THREE.Color(jack).offsetHSL(0, 0, -0.1).getHex();
    const usePix = !(window.__isMobile && window.__lastQuality === 'low');
    const furKind = (typeId === 'TIGER') ? 'tiger'
        : (typeId === 'CROC' || typeId === 'CROCODILE' || typeId === 'LIZARD' || typeId === 'DINO' || typeId === 'SHARK') ? 'scale'
        : 'fur';
    const texFur = usePix ? bossPixelTex(fur, furKind) : null;
    const texJack = usePix ? bossPixelTex(jack, (id.indexOf('RHINO') >= 0 || id.indexOf('BEAR') >= 0) ? 'leather' : 'cloth') : null;
    const texMetal = usePix ? bossPixelTex(trim, 'metal') : null;
    const texGun = usePix ? bossPixelTex(0x3a3a45, 'metal') : null;
    const matFur = M(fur, texFur ? { map: texFur, texKind: furKind } : {});
    const matFurD = M(furD, texFur ? { map: texFur, texKind: furKind + 'D' } : {});
    const matFurL = M(furL, texFur ? { map: texFur, texKind: furKind + 'L' } : {});
    const matJack = M(jack, Object.assign({ roughness: 0.65, metalness: 0.15 }, texJack ? { map: texJack, texKind: 'cloth' } : {}));
    const matJackD = M(jackD, Object.assign({ roughness: 0.7, metalness: 0.12 }, texJack ? { map: texJack, texKind: 'clothD' } : {}));
    const matTrim = M(trim, Object.assign({ metalness: 0.55, roughness: 0.3, emissive: trim, emissiveIntensity: 0.15 }, texMetal ? { map: texMetal, texKind: 'metal' } : {}));
    const matAcc = M(accent, { emissive: accent, emissiveIntensity: 0.25 });
    const matGold = M(0xe8c040, Object.assign({ metalness: 0.85, roughness: 0.25 }, texMetal ? { map: texMetal, texKind: 'gold' } : {}));
    const matGun = M(0x3a3a45, Object.assign({ metalness: 0.75, roughness: 0.3 }, texGun ? { map: texGun, texKind: 'gun' } : {}));
    const matGunL = M(0x6a6a78, { metalness: 0.7, roughness: 0.28 });
    const matWood = M(0x6a4420, usePix ? { map: bossPixelTex(0x6a4420, 'fur'), texKind: 'wood' } : {});
    const matEye = M(eyeC, { emissive: eyeC, emissiveIntensity: 1.15, roughness: 0.25 });
    const matEyeW = M(0xffffff, { emissive: 0x334455, emissiveIntensity: 0.15 });
    // штаны — тёмный тон куртки, кроссовки — фирменный цвет босса: у каждого свой низ
    const pantsCol = new THREE.Color(jack).offsetHSL(0, -0.1, -0.12).getHex();
    const matPants = M(pantsCol, usePix ? { map: bossPixelTex(pantsCol, 'cloth'), texKind: 'pants' } : {});
    const matShoe = M(accent === 0xffffff || accent === 0x1a1a1a || accent === 0x222222 ? 0xc01820 : accent);
    const matTooth = M(0xfff5e0, { roughness: 0.4 });
    const matNose = M(0x2a1810);

    function add(p, geo, mat, x, y, z, rx, ry, rz) {
        const m = new THREE.Mesh(geo, mat);
        m.position.set(x||0, y||0, z||0);
        if (rx) m.rotation.x = rx; if (ry) m.rotation.y = ry; if (rz) m.rotation.z = rz;
        m.castShadow = !!(window.__lastQuality === 'high' && !window.__isMobile);
        m.matrixAutoUpdate = true;
        p.add(m);
        return m;
    }
    // детали аксессуаров и оружия — со скруглёнными рёбрами, в одном стиле с плавной моделью
    function px(p, mat, x, y, z, sx, sy, sz) {
        const r = Math.min(sx, sy, sz) * 0.3;
        const geo = r > 0.006 ? new RoundedBoxGeometry(sx, sy, sz, 2, r) : new THREE.BoxGeometry(sx, sy, sz);
        return add(p, geo, mat, x, y, z);
    }

    // --- тело, руки, ноги, голова и броня — новая модель (src/boss-model.js) ---
    const seg = (window.__isMobile || window.__lastQuality === 'low') ? 10 : (window.__lastQuality === 'high' ? 18 : 14);
    const jacketDS = matJack.clone();
    jacketDS.side = THREE.DoubleSide;
    const telShirt = (id === 'BOAR_BRIGADE' || id === 'BEAR_VETERAN');
    const shirtCol = id === 'CROC_GUARD' ? 0xe6d9a0 : furL;
    const body = buildBossCharacter(root, def, {
        M: M, seg: seg,
        mats: {
            fur: matFur, furD: matFurD, furL: matFurL, jacket: matJack, jacketD: matJackD, jacketDS: jacketDS,
            trim: matTrim, acc: matAcc, gold: matGold, gun: matGun, tooth: matTooth, nose: matNose,
            pants: matPants, shoe: matShoe, sole: M(0xf2f2ee), glove: M(0x2a2a2e, { roughness: 0.6 }),
            shirt: telShirt ? M(0xf0f0f0, { map: stripeTex(), texKind: 'telnyashka' }) : M(shirtCol, texFur ? { map: texFur, texKind: furKind + 'S' } : {}),
            armor: M(0x5c646e, { metalness: 0.75, roughness: 0.3 }),
            eyeW: M(0xffffff, { roughness: 0.3 }), iris: matEye,
            pupil: new THREE.MeshBasicMaterial({ color: 0x0a0a0c }), highlight: new THREE.MeshBasicMaterial({ color: 0xffffff }),
            mouth: M(0x3a0a0c), nosePink: M(0xd98a8a), whisker: M(0xf0f0f0),
            face: M(typeId === 'GORILLA' ? 0x5a4a44 : 0xd8b088), horn: M(0xe8dcc0, { roughness: 0.45 }),
            mane: M(0x7a3a10), maneL: M(0xa8601a)
        }
    });
    const leftLeg = body.leftLeg, rightLeg = body.rightLeg, leftArm = body.leftArm;
    const fat = body.fat, thin = body.thin;
    root.userData.leftLeg = leftLeg;
    root.userData.rightLeg = rightLeg;
    root.userData.armor = body.armor;
    const rightArm = body.rightArm;

    // --- оружие ---
    const weap = new THREE.Group();
    if (wt === 'bat' || wt === 'crowbar') {
        add(weap, new THREE.CylinderGeometry(0.035, 0.045, 0.55, 8), matWood, 0, 0, 0.28, Math.PI/2, 0, 0);
        add(weap, new THREE.SphereGeometry(0.09, 8, 8), matWood, 0, 0, 0.58);
        px(weap, matGun, 0, 0, 0.05, 0.06, 0.06, 0.12); // рукоять
        // изолента + проволока
        for (let i = 0; i < 5; i++) px(weap, matGunL, 0, 0.04, 0.18+i*0.07, 0.09, 0.025, 0.03);
        px(weap, matAcc, 0, 0, 0.4, 0.1, 0.02, 0.1);
    } else if (wt === 'rpg') {
        add(weap, new THREE.CylinderGeometry(0.09, 0.11, 0.75, 10), matGun, 0, 0, 0.22, Math.PI/2, 0, 0);
        add(weap, new THREE.ConeGeometry(0.13, 0.22, 10), matGunL, 0, 0, 0.65, Math.PI/2, 0, 0);
        px(weap, matAcc, 0, 0.08, 0.15, 0.06, 0.06, 0.12); // прицел
        px(weap, matGold, 0, -0.1, 0.2, 0.05, 0.05, 0.08);
    } else if (wt === 'rifle' || wt === 'ppsh') {
        px(weap, matGun, 0, 0, 0.15, 0.1, 0.12, 0.55);
        if (wt === 'ppsh') add(weap, new THREE.TorusGeometry(0.1, 0.03, 6, 10), matGunL, 0, -0.05, 0.05, Math.PI/2, 0, 0);
        else {
            add(weap, new THREE.TorusGeometry(0.05, 0.015, 5, 8), matGunL, 0, 0.06, 0.35);
            add(weap, new THREE.TorusGeometry(0.04, 0.012, 5, 8), matGunL, 0, 0.06, 0.38);
        }
    } else if (wt === 'mouth') {
        // пушка внутри пасти — визуально мелкая на морде
        px(weap, matGun, 0, 0, 0.1, 0.08, 0.08, 0.2);
    } else if (wt === 'pipe') {
        add(weap, new THREE.CylinderGeometry(0.05, 0.05, 0.6, 6), matGun, 0, 0, 0.25, Math.PI/2, 0, 0);
        add(weap, new THREE.TorusGeometry(0.07, 0.02, 5, 8), matGunL, 0, 0, 0.1);
    } else if (wt === 'chain') {
        for (let i = 0; i < 8; i++) add(weap, new THREE.TorusGeometry(0.04, 0.012, 4, 6), matGun, 0, 0, i*0.07);
        px(weap, matGunL, 0, 0, 0.6, 0.08, 0.06, 0.12); // крюк
    } else if (wt === 'canister') {
        px(weap, M(0x33ff44, { emissive: 0x228822, emissiveIntensity: 0.3 }), 0, 0, 0.1, 0.16, 0.22, 0.14);
    } else if (wt === 'guitar') {
        px(weap, matWood, 0, 0, 0.15, 0.2, 0.08, 0.35);
        px(weap, matGun, 0, 0, 0.4, 0.06, 0.06, 0.4);
        for (let i = 0; i < 4; i++) px(weap, matGunL, -0.04+i*0.025, 0.04, 0.35, 0.01, 0.01, 0.35);
    } else if (wt === 'saw') {
        add(weap, new THREE.CylinderGeometry(0.2, 0.2, 0.04, 12), matGunL, 0, 0, 0.15, Math.PI/2, 0, 0);
        for (let i = 0; i < 8; i++) {
            const a = (i/8)*Math.PI*2;
            px(weap, matGun, Math.cos(a)*0.22, Math.sin(a)*0.22, 0.15, 0.06, 0.04, 0.04);
        }
    } else if (wt === 'drill') {
        add(weap, new THREE.CylinderGeometry(0.08, 0.1, 0.3, 6), matGun, 0, 0, 0.05, Math.PI/2, 0, 0);
        add(weap, new THREE.CylinderGeometry(0.03, 0.02, 0.45, 5), matGunL, 0, 0, 0.4, Math.PI/2, 0, 0);
    } else if (wt === 'disco') {
        add(weap, new THREE.CylinderGeometry(0.03, 0.03, 0.5, 5), matGun, 0, 0, 0.2, Math.PI/2, 0, 0);
        add(weap, new THREE.IcosahedronGeometry(0.12, 0), M(0xcccccc, { metalness: 0.9, roughness: 0.1 }), 0, 0, 0.5);
    } else if (wt === 'wrench') {
        px(weap, matGunL, 0, 0, 0.3, 0.08, 0.08, 0.6);
        px(weap, matGunL, 0, 0.08, 0.55, 0.2, 0.12, 0.1);
    } else if (wt === 'whip') {
        for (let i = 0; i < 6; i++) px(weap, M(0xffdd00, { emissive: 0xffaa00, emissiveIntensity: 0.4 }), 0, 0, i*0.08, 0.04, 0.04, 0.06);
    } else if (wt === 'drone') {
        add(weap, new THREE.OctahedronGeometry(0.1), matAcc, 0, 0.15, 0);
        for (let i = 0; i < 4; i++) {
            const a = (i/4)*Math.PI*2;
            add(weap, new THREE.CylinderGeometry(0.02, 0.02, 0.08, 4), matGun, Math.cos(a)*0.12, 0.15, Math.sin(a)*0.12);
        }
    } else if (wt === 'hammer') {
        px(weap, matGun, 0, 0, 0.25, 0.1, 0.1, 0.55);
        px(weap, matGunL, 0, 0, 0.55, 0.28, 0.2, 0.2);
    } else {
        px(weap, matGun, 0, 0, 0.2, 0.1, 0.12, 0.4);
    }
    weap.position.set(0, -0.5, 0.2);
    weap.userData.isBossWeapon = true;
    weap.userData.weaponType = wt;
    weap.userData.basePos = { x: 0, y: -0.5, z: 0.2 };
    weap.userData.baseRot = { x: 0, y: 0, z: 0 };
    rightArm.add(weap);

    const head = body.head;
    const jaw = body.jaw;

    // аксессуары на груди/спине рассчитаны на старый, более плоский торс — после них сдвигаем вперёд/назад
    const nBefore = root.children.length;
    const nHeadBefore = head.children.length;
    addBossSignature({
        id: id, typeId: typeId, root: root, head: head, leftArm: leftArm, rightArm: rightArm,
        leftLeg: leftLeg, rightLeg: rightLeg, weap: weap, fat: fat, thin: thin, seg: seg,
        px: px, add: add, M: M,
        mats: { fur: matFur, furD: matFurD, furL: matFurL, jack: matJack, jackD: matJackD, trim: matTrim, acc: matAcc,
            gold: matGold, gun: matGun, gunL: matGunL, wood: matWood, tooth: matTooth, nose: matNose, eyeW: matEyeW }
    });
    // шапки, каски, короны — на верх нового черепа (старые головы были выше)
    const topShift = 0.27 - (head.userData.top || 0.25);
    for (let hi = nHeadBefore; hi < head.children.length; hi++) {
        const hc = head.children[hi];
        if (hc.position.y > 0.17) hc.position.y -= topShift;
    }
    for (let ci = nBefore; ci < root.children.length; ci++) {
        const ch = root.children[ci];
        if (ch.position.z > 0.12) ch.position.z += 0.1;
        else if (ch.position.z < -0.15) ch.position.z -= 0.06;
    }

    // крупная голова — аркадная читаемость: морда, рога и шапки видны издалека
    head.scale.setScalar(1.3);
    head.position.set(0, 1.4, 0.04);
    root.add(head);
    // outline головы — через auto-traverse в конце (без дубля)
    // тень
    const sh = new THREE.Mesh(new THREE.CircleGeometry(0.55, 12), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3 }));
    sh.rotation.x = -Math.PI / 2; sh.position.y = 0.02; root.add(sh);

    root.userData.isBoss = true;
    root.userData.bossType = typeId;
    root.userData.bossId = id;
    root.userData.isQuad = false;
    root.userData.rightArm = rightArm;
    root.userData.leftArm = leftArm;
    root.userData.weapon = weap;
    root.userData.jaw = jaw;
    root.userData.head = head;
    root.userData.attack = def.attack || 'default';

    const PROJ = {
        sweep: { color: 0xffcc44, emissive: 0xffaa22, size: 0.3, shape: 'box', speed: 9, noCrash: true, laneKick: true },
        rocket: { color: 0xff6600, emissive: 0xff3300, size: 0.35, shape: 'rocket', speed: 5.5, life: 1.8 },
        snipe: { color: 0xff0000, emissive: 0xff0000, size: 0.15, shape: 'sphere', speed: 14, laser: true },
        mouth: { color: 0xffeecc, emissive: 0xccaa88, size: 0.18, shape: 'sphere', speed: 8 },
        flame: { color: 0xffaa22, emissive: 0xff4400, size: 0.28, shape: 'sphere', speed: 6.5, noCrash: true, timePenalty: 3 },
        chain: { color: 0xaaaaaa, emissive: 0x666666, size: 0.2, shape: 'box', speed: 7, pull: true },
        acid: { color: 0x33ff44, emissive: 0x22aa33, size: 0.35, shape: 'barrel', speed: 5, noCrash: true, timePenalty: 4 },
        riff: { color: 0xffdd00, emissive: 0xffaa00, size: 0.4, shape: 'sphere', speed: 6, noCrash: true, knock: true },
        saw: { color: 0xcccccc, emissive: 0x888888, size: 0.3, shape: 'box', speed: 8 },
        drill: { color: 0x888888, emissive: 0x444444, size: 0.25, shape: 'box', speed: 7 },
        neon: { color: 0xff00ff, emissive: 0xff00ff, size: 0.22, shape: 'sphere', speed: 7, noCrash: true, timePenalty: 1 },
        tools: { color: 0xffaa22, emissive: 0xcc8800, size: 0.2, shape: 'box', speed: 7.5 },
        ram: { color: 0xff4400, emissive: 0xff2200, size: 0.35, shape: 'box', speed: 10 },
        zap: { color: 0x00ffff, emissive: 0x00ffff, size: 0.2, shape: 'box', speed: 11 },
        drone: { color: 0xff2244, emissive: 0xff0022, size: 0.16, shape: 'sphere', speed: 9 },
        burst: { color: 0xffcc00, emissive: 0xffaa00, size: 0.12, shape: 'sphere', speed: 10, multi: 5 },
        hammer: { color: 0x8a7a5a, emissive: 0x554433, size: 0.4, shape: 'box', speed: 6, heavy: true },
        default: { color: 0xff4400, emissive: 0xff2200, size: 0.34, shape: 'sphere', speed: 5.8 }
    };
    root.userData.projectile = PROJ[def.attack] || PROJ.default;

    // --- аркадный контур + читаемость силуэта ---
    try {
        const outlineMat = getOutlineMat();
        const outlines = [];
        root.traverse(function(o) {
            if (!o.isMesh || !o.geometry) return;
            if (o.userData && (o.userData.isOutline || o.userData.noOutline)) return;
            // только крупные части (не глаза/декор)
            const g = o.geometry;
            if (!g.boundingBox) g.computeBoundingBox();
            const bb = g.boundingBox;
            if (!bb) return;
            const size = bb.max.clone().sub(bb.min);
            if (size.x * size.y * size.z < 0.004) return;
            const om = o.clone();
            om.material = outlineMat;
            om.scale.multiplyScalar(1.08);
            om.castShadow = false;
            om.renderOrder = -1;
            om.userData.isOutline = true;
            outlines.push({ parent: o.parent, mesh: om, src: o });
        });
        outlines.forEach(function(item) {
            // local outline as child so it follows bones/groups
            item.src.add(item.mesh);
            item.mesh.position.set(0, 0, 0);
            item.mesh.rotation.set(0, 0, 0);
            item.mesh.scale.set(1.1, 1.1, 1.1);
        });
    } catch (eOut) {}

    // лёгкий «подсвет» шерсти — ночью босс не тонет в фоне
    try {
        root.traverse(function(o) {
            if (!o.isMesh || !o.material) return;
            const m = o.material;
            if (m.emissive && m.emissiveIntensity != null && m.emissiveIntensity < 0.08) {
                m.emissiveIntensity = Math.max(m.emissiveIntensity, 0.06);
            }
        });
    } catch (eEm) {}

    return root;
}


export {
    BOSS_COMBAT,
    getBossCombat,
    CAMPAIGN_BOSSES,
    ensureToonGradient,
    bossMat,
    addBossOutline,
    getOutlineMat,
    disposeBossMesh,
    createBossHpBar,
    updateBossHpBar,
    createArcadeBossMesh
};
