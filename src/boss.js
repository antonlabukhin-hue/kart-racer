/**
 * Мини-боссы кампании: данные, материалы, меш, HP-бар.
 * spawnBoss / _spawnBossImpl остаются в main.js (замыкание сцены/игры).
 */
import * as THREE from 'three';

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

const CAMPAIGN_BOSSES = [
    { id: 'BOAR_BRIGADE', name: 'Кабан «Бригада»', animal: 'BOAR', fur: 0x6b4423, jacket: 0x2a1810, trim: 0xffcc00, eye: 0xff6644, accent: 0xff2244, weapon: 'bat', attack: 'sweep', hp: 3, scale: 2.15, shout: 'Я вас Арсеньевских знаю!' },
    { id: 'WOLF_NIGHT', name: 'Волк-снайпер «Ночной»', animal: 'WOLF', fur: 0x3a3a48, jacket: 0x1a1a2a, trim: 0xff0000, eye: 0xffdd00, accent: 0x00ff88, weapon: 'rifle', attack: 'snipe', hp: 3, scale: 2.05, shout: 'Частота закрыта!' },
    { id: 'BEAR_VETERAN', name: 'Медведь-ветеран «Дед»', animal: 'BEAR', fur: 0x5a3a20, jacket: 0x8a7a5a, trim: 0xffcc00, eye: 0xffaa44, accent: 0x1a1a1a, weapon: 'ppsh', attack: 'burst', hp: 4, scale: 2.4, shout: 'За Родину, курьер!' },
    { id: 'CROC_GUARD', name: 'Крокодил «Зубастик»', animal: 'CROC', fur: 0x228b22, jacket: 0x1a1a1a, trim: 0xff6600, eye: 0xffff44, accent: 0xffdd44, weapon: 'mouth', attack: 'mouth', hp: 3, scale: 2.15, shout: 'Промзона — мой двор!' },
    { id: 'RHINO_STORM', name: 'Носорог «Рог»', animal: 'RHINO', fur: 0xa9a9a9, jacket: 0x3a3a2a, trim: 0xffaa00, eye: 0xff8866, accent: 0xff3300, weapon: 'rpg', attack: 'rocket', hp: 4, scale: 2.25, shout: 'Цех №7 не для вас!' },
    { id: 'DINO_FOREMAN', name: 'Дино-бригадир «Рекс»', animal: 'DINO', fur: 0x4a6a2a, jacket: 0x8a5a20, trim: 0xffaa22, eye: 0xffee44, accent: 0x222222, weapon: 'pipe', attack: 'flame', hp: 4, scale: 2.2, shout: 'Красные трубы помнят!' },
    { id: 'LION_DUMP', name: 'Лев-свалщик «Грива»', animal: 'LION', fur: 0xdaa520, jacket: 0x1a1a1a, trim: 0xff2244, eye: 0xffaa00, accent: 0x8b4513, weapon: 'chain', attack: 'chain', hp: 3, scale: 2.15, shout: 'Надежда кончилась!' },
    { id: 'HIPPO_TOXIC', name: 'Бегемот «Химик»', animal: 'HIPPO', fur: 0x9370db, jacket: 0x222222, trim: 0x33ff44, eye: 0x88ff44, accent: 0xffaa00, weapon: 'canister', attack: 'acid', hp: 4, scale: 2.2, shout: 'Зелёный дым — мой духи!' },
    { id: 'TIGER_ROCKER', name: 'Тигр-рокер «Кислотный»', animal: 'TIGER', fur: 0xd2691e, jacket: 0x1a1a1a, trim: 0xffdd00, eye: 0xffaa44, accent: 0xff2244, weapon: 'guitar', attack: 'riff', hp: 3, scale: 2.1, shout: 'Ми-Ля-До, курьер!' },
    { id: 'SHARK_SAW', name: 'Акула «Пила»', animal: 'SHARK', fur: 0x6a7a8a, jacket: 0xaa2222, trim: 0xcccccc, eye: 0xffffff, accent: 0xffffff, weapon: 'saw', attack: 'saw', hp: 4, scale: 2.15, shout: 'Кровь в воде!' },
    { id: 'BULL_MINER', name: 'Бык-шахтёр «Уголёк»', animal: 'BULL', fur: 0x1a1a1a, jacket: 0x2a2a2a, trim: 0xffdd00, eye: 0xff2200, accent: 0x444444, weapon: 'drill', attack: 'drill', hp: 4, scale: 2.25, shout: 'Уголь и пыль!' },
    { id: 'PANTHER_NEON', name: 'Пантера «Неон»', animal: 'PANTHER', fur: 0x0a0a0a, jacket: 0x1a0a1a, trim: 0xff00ff, eye: 0x00ffff, accent: 0xffff00, weapon: 'disco', attack: 'neon', hp: 3, scale: 2.05, shout: 'Диско не умерло!' },
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
    if (typeof c === 'number') c = c & 0xfffff0;
    const e = opts.emissive != null ? opts.emissive : 0x000000;
    const ei = opts.emissiveIntensity != null ? opts.emissiveIntensity : 0;
    const glow = (ei > 0.05) || (e !== 0 && e !== 0x000000);
    try { ensureToonGradient(); } catch (e) {}
    const low = !!(window.__isMobile || window.__lastQuality === 'low' ||
        (window.__renderOpt && window.__renderOpt.quality === 'low'));
    const mode = glow ? 'basic' : (low ? 'basic' : (window.__toonGradient ? 'toon' : 'lambert'));
    const key = mode + '|' + String(c) + '|' + (glow ? String(e) + '|' + Math.round(ei * 10) : '0');
    if (!window.__bossMatCache) window.__bossMatCache = {};
    if (!window.__bossMatCache[key]) {
        if (mode === 'basic') {
            const mat = new THREE.MeshBasicMaterial({ color: c, fog: true });
            if (glow) {
                try {
                    const col = new THREE.Color(c);
                    col.offsetHSL(0, 0, Math.min(0.35, 0.12 + ei * 0.25));
                    mat.color.copy(col);
                } catch (err) {}
            }
            window.__bossMatCache[key] = mat;
        } else if (mode === 'toon') {
            const mat = new THREE.MeshToonMaterial({
                color: c, gradientMap: window.__toonGradient, fog: true
            });
            window.__bossMatCache[key] = mat;
        } else {
            window.__bossMatCache[key] = new THREE.MeshLambertMaterial({
                color: c, flatShading: true, fog: true
            });
        }
    }
    return window.__bossMatCache[key];
}
function addBossOutline(mesh, scaleMul) {
    if (!mesh || !window.__bossOutlineMat) return null;
    try {
        const outline = mesh.clone();
        outline.material = window.__bossOutlineMat;
        outline.scale.multiplyScalar(scaleMul || 1.07);
        outline.renderOrder = -1;
        outline.castShadow = false;
        if (mesh.parent) mesh.parent.add(outline);
        return outline;
    } catch (e) { return null; }
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
function updateBossHpBar(boss) {
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
        if (typeof camera !== 'undefined' && camera) boss.hpBar.quaternion.copy(camera.quaternion);
        boss.hpBar.visible = !boss.dying;
    } catch (e) {}
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
    const matFur = M(fur);
    const matFurD = M(furD);
    const matFurL = M(furL);
    const matJack = M(jack, { roughness: 0.65, metalness: 0.15 });
    const matJackD = M(jackD, { roughness: 0.7, metalness: 0.12 });
    const matTrim = M(trim, { metalness: 0.55, roughness: 0.3, emissive: trim, emissiveIntensity: 0.15 });
    const matAcc = M(accent, { emissive: accent, emissiveIntensity: 0.25 });
    const matGold = M(0xe8c040, { metalness: 0.85, roughness: 0.25 });
    const matGun = M(0x3a3a45, { metalness: 0.75, roughness: 0.3 });
    const matGunL = M(0x6a6a78, { metalness: 0.7, roughness: 0.28 });
    const matWood = M(0x6a4420);
    const matEye = M(eyeC, { emissive: eyeC, emissiveIntensity: 1.15, roughness: 0.25 });
    const matEyeW = M(0xffffff, { emissive: 0x334455, emissiveIntensity: 0.15 });
    const matPants = M(0x1a1a22);
    const matShoe = M(0xc01820);
    const matTooth = M(0xfff5e0, { roughness: 0.4 });
    const matNose = M(0x2a1810);
    const matTelnyash = M(0x1a3a6a);
    const matTelStripe = M(0xf0f0f0);

    function add(p, geo, mat, x, y, z, rx, ry, rz) {
        const m = new THREE.Mesh(geo, mat);
        m.position.set(x||0, y||0, z||0);
        if (rx) m.rotation.x = rx; if (ry) m.rotation.y = ry; if (rz) m.rotation.z = rz;
        m.castShadow = !!(window.__lastQuality === 'high' && !window.__isMobile);
        m.matrixAutoUpdate = true;
        p.add(m);
        return m;
    }
    function px(p, mat, x, y, z, sx, sy, sz) {
        return add(p, new THREE.BoxGeometry(sx, sy, sz), mat, x, y, z);
    }

    // --- ноги ---
    const fat = (typeId === 'BOAR' || typeId === 'HIPPO' || typeId === 'BULL' || id === 'WOLF_BIKER');
    const thin = (typeId === 'WOLF' && id === 'WOLF_NIGHT') || typeId === 'PANTHER' || typeId === 'LIZARD';
    function leg(side) {
        const g = new THREE.Group();
        const w = fat ? 0.22 : thin ? 0.16 : 0.19;
        px(g, matPants, 0, 0.30, 0, w * 1.15, 0.26, w * 1.15);
        px(g, matPants, 0, 0.12, 0, w * 1.0, 0.18, w * 1.0);
        if (def.accent === 0xff2244 || id === 'BOAR_BRIGADE') px(g, matAcc, side * 0.05, 0.28, 0.07, 0.04, 0.28, 0.04);
        px(g, matShoe, 0, 0.05, 0.04, w * 1.35, 0.08, w * 1.55);
        px(g, matJackD, 0, 0.09, 0.02, w * 1.2, 0.05, w * 1.3);
        g.position.set(side * (fat ? 0.22 : 0.19), 0, 0);
        g.userData.isBossLeg = true;
        root.add(g);
    }
    leg(-1); leg(1);

    // --- торс ---
    // аркадный торс TMNT: широкие бёдра, бочка, дельты
    px(root, matFurD, 0, 0.48, 0, fat ? 0.52 : 0.44, 0.22, fat ? 0.36 : 0.30);
    let torsoCore = null;
    if (fat) {
        torsoCore = px(root, matFur, 0, 0.85, 0, 0.58, 0.5, 0.42);
        add(root, new THREE.CylinderGeometry(0.32, 0.36, 0.42, 12), matFurL, 0, 0.78, 0.08);
        px(root, matFur, 0, 1.18, 0, 0.54, 0.28, 0.36);
        // дельты / погоны
        add(root, new THREE.SphereGeometry(0.14, 8, 8), matJack, -0.32, 1.15, 0.05);
        add(root, new THREE.SphereGeometry(0.14, 8, 8), matJack, 0.32, 1.15, 0.05);
        px(root, matTrim, -0.32, 1.22, 0.05, 0.12, 0.04, 0.1);
        px(root, matTrim, 0.32, 1.22, 0.05, 0.12, 0.04, 0.1);
    } else if (thin) {
        torsoCore = px(root, matFur, 0, 0.88, 0, 0.38, 0.52, 0.30);
        px(root, matFurL, 0, 1.14, 0.04, 0.36, 0.22, 0.28);
    } else {
        torsoCore = px(root, matFur, 0, 0.88, 0, 0.54, 0.48, 0.38);
        try { add(root, new THREE.CylinderGeometry(0.26, 0.30, 0.42, 10), matFurL, 0, 0.92, 0.06, 0, 0, Math.PI / 2); } catch (e) {}
        px(root, matFur, 0, 1.18, -0.02, 0.5, 0.24, 0.32);
    }
    if (!thin) {
        px(root, matFur, -0.48, 1.22, 0, 0.22, 0.2, 0.26);
        px(root, matFur, 0.48, 1.22, 0, 0.22, 0.2, 0.26);
    }
    if (torsoCore) addBossOutline(torsoCore, 1.06);
    // широкие плечи носорога
    if (typeId === 'RHINO' || typeId === 'GORILLA' || typeId === 'ALPHA') {
        px(root, matFur, -0.42, 1.15, 0, 0.28, 0.28, 0.32);
        px(root, matFur, 0.42, 1.15, 0, 0.28, 0.28, 0.32);
    }

    // --- одежда по id ---
    const vest = new THREE.Group();
    if (id === 'BOAR_BRIGADE' || id === 'BEAR_VETERAN') {
        // тельняшка
        for (let i = 0; i < 5; i++) {
            px(vest, i % 2 ? matTelStripe : matTelnyash, 0, -0.15 + i * 0.1, 0.12, 0.4, 0.08, 0.08);
        }
        px(vest, matJack, -0.28, 0, 0, 0.14, 0.5, 0.32);
        px(vest, matJack, 0.28, 0, 0, 0.14, 0.5, 0.32);
        for (let i = 0; i < 4; i++) px(vest, matGold, -0.2 + i * 0.12, 0.15, 0.18, 0.04, 0.04, 0.04);
    } else if (id === 'CROC_GUARD') {
        px(vest, matJack, 0, 0, 0, 0.55, 0.55, 0.4);
        px(vest, matAcc, 0.2, 0.1, 0.22, 0.12, 0.1, 0.04); // бейдж
        px(vest, matFurD, -0.35, 0.25, 0, 0.16, 0.14, 0.2); // наплечник-шина
        px(vest, matFurD, 0.35, 0.25, 0, 0.16, 0.14, 0.2);
    } else if (id === 'RHINO_STORM') {
        px(vest, matJack, 0, 0, 0, 0.7, 0.55, 0.45);
        px(vest, matTrim, -0.35, 0.28, 0, 0.14, 0.08, 0.2); // погоны
        px(vest, matTrim, 0.35, 0.28, 0, 0.14, 0.08, 0.2);
        px(vest, matAcc, -0.4, 0.1, 0.1, 0.12, 0.2, 0.06); // повязка
        for (let i = 0; i < 4; i++) px(vest, matGunL, -0.15 + i * 0.1, -0.05, 0.24, 0.06, 0.12, 0.05);
    } else if (id === 'WOLF_NIGHT') {
        // плащ
        px(vest, matJack, 0, -0.1, -0.15, 0.65, 0.7, 0.15);
        px(vest, matJackD, -0.3, 0, 0.1, 0.15, 0.6, 0.3);
        px(vest, matJackD, 0.3, 0, 0.1, 0.15, 0.6, 0.3);
        for (let i = 0; i < 5; i++) px(vest, matGunL, -0.2 + i * 0.1, 0.05, 0.22, 0.05, 0.1, 0.04);
    } else if (id === 'HIPPO_TOXIC') {
        px(vest, matJack, 0, -0.1, 0.1, 0.5, 0.4, 0.25); // фартук
        px(vest, matAcc, 0, 0.15, 0.22, 0.15, 0.12, 0.04); // токсично
    } else if (id === 'ALPHA_JUDGE') {
        px(vest, matJack, 0, -0.15, -0.1, 0.7, 0.85, 0.2); // плащ
        px(vest, matJackD, 0, 0, 0.1, 0.5, 0.55, 0.3);
    } else if (id === 'PANTHER_NEON') {
        px(vest, matJack, -0.28, 0, 0, 0.14, 0.5, 0.32);
        px(vest, matJack, 0.28, 0, 0, 0.14, 0.5, 0.32);
        px(vest, matAcc, 0, 0.2, 0.15, 0.35, 0.04, 0.04); // неон
        px(vest, M(0x00ffff, { emissive: 0x00ffff, emissiveIntensity: 0.5 }), 0, 0, 0.15, 0.35, 0.04, 0.04);
    } else if (id === 'MONKEY_HACK') {
        px(vest, matJack, 0, 0, 0, 0.55, 0.6, 0.4); // халат
        px(vest, matAcc, 0, 0.05, 0.22, 0.2, 0.12, 0.04); // 404
    } else {
        px(vest, matJack, -0.28, 0, 0, 0.15, 0.52, 0.34);
        px(vest, matJack, 0.28, 0, 0, 0.15, 0.52, 0.34);
        px(vest, matJackD, 0, 0, -0.16, 0.5, 0.48, 0.1);
    }
    vest.position.set(0, 0.98, 0.02);
    root.add(vest);

    // цепь
    for (let i = 0; i < 6; i++) {
        const a = -0.5 + i * 0.2;
        px(root, matGold, Math.sin(a)*0.18, 0.95+Math.cos(a)*0.05, 0.22, 0.05, 0.05, 0.05);
    }

    // --- руки (плечо / бицепс / предплечье / кисть) ---
    function arm(side) {
        const g = new THREE.Group();
        const sg = (window.__isMobile || window.__lastQuality === 'low') ? 6 : 10;
        // плечо
        add(g, new THREE.SphereGeometry(0.11, sg, sg), matJack, 0, 0.02, 0);
        // бицепс
        add(g, new THREE.CylinderGeometry(0.09, 0.1, 0.22, sg), matFur, 0, -0.14, 0);
        // локоть
        add(g, new THREE.SphereGeometry(0.08, sg, sg), matFurD, 0, -0.28, 0.02);
        // предплечье
        add(g, new THREE.CylinderGeometry(0.07, 0.085, 0.22, sg), matFurD, 0, -0.42, 0.03);
        // кисть / перчатка
        px(g, matShoe, 0, -0.58, 0.05, 0.14, 0.12, 0.16);
        px(g, matShoe, 0, -0.62, 0.1, 0.1, 0.08, 0.1); // пальцы
        if (id === 'GORILLA_MECH' && side < 0) {
            px(g, matGunL, 0, -0.2, 0, 0.16, 0.45, 0.16);
            add(g, new THREE.TorusGeometry(0.07, 0.02, 5, 10), matGold, 0, -0.32, 0);
        }
        // погон
        px(g, matTrim, 0, 0.06, 0, 0.16, 0.05, 0.12);
        const ax = fat ? 0.42 : (thin ? 0.26 : 0.34);
        const ay = fat ? 1.14 : (thin ? 1.04 : 1.12);
        g.position.set(side * ax, ay, 0.02);
        g.rotation.z = side * (thin ? 0.12 : 0.16);
        g.userData.isBossArm = true;
        root.add(g);
        return g;
    }
    const leftArm = arm(-1);
    const rightArm = arm(1);

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

    // --- голова (HD arcade: сферы + много деталей) ---
    const head = new THREE.Group();
    let jaw = null;
    const seg = (window.__isMobile || window.__lastQuality === 'low') ? 8 : 12;

    function skull(p, mat, x, y, z, r) {
        return add(p, new THREE.SphereGeometry(r, seg, seg), mat, x, y, z);
    }
    function eyePair(p, y, z, gap, sEye) {
        sEye = sEye || 0.055;
        // белок + зрачок + блик
        [[-gap, 1], [gap, 1]].forEach(function(sp) {
            const side = sp[0];
            px(p, matEyeW, side, y, z, sEye * 1.55, sEye * 1.45, sEye * 0.7);
            px(p, matEye, side, y, z + sEye * 0.55, sEye * 0.95, sEye * 0.95, sEye * 0.55);
            px(p, matEyeW, side - sEye * 0.2, y + sEye * 0.25, z + sEye * 0.9, sEye * 0.28, sEye * 0.28, sEye * 0.2);
        });
    }
    function brow(p, y, z, w) {
        px(p, matFurD, 0, y, z, w, 0.04, 0.05);
    }

    if (typeId === 'BOAR') {
        skull(head, matFur, 0, 0.06, 0.02, 0.22);
        px(head, matFur, 0, 0.02, 0.02, 0.42, 0.36, 0.38);
        // бакенбарды
        px(head, M(0xc8c8c8), -0.24, -0.04, 0.08, 0.12, 0.22, 0.14);
        px(head, M(0xc8c8c8), 0.24, -0.04, 0.08, 0.12, 0.22, 0.14);
        // рыло
        add(head, new THREE.CylinderGeometry(0.09, 0.12, 0.2, seg), matFurL, 0, -0.06, 0.32, Math.PI/2, 0, 0);
        px(head, matNose, 0, -0.05, 0.46, 0.12, 0.09, 0.07);
        px(head, M(0x1a0a08), -0.03, -0.05, 0.5, 0.03, 0.03, 0.02);
        px(head, M(0x1a0a08), 0.03, -0.05, 0.5, 0.03, 0.03, 0.02);
        // клыки
        add(head, new THREE.ConeGeometry(0.035, 0.16, 6), matTooth, -0.1, -0.18, 0.38, 0.5, 0, 0.2);
        add(head, new THREE.ConeGeometry(0.035, 0.16, 6), matTooth, 0.1, -0.18, 0.38, 0.5, 0, -0.2);
        // уши
        px(head, matFur, -0.24, 0.24, -0.04, 0.12, 0.16, 0.08);
        px(head, matFurL, -0.24, 0.24, 0.0, 0.06, 0.1, 0.03);
        px(head, matFurD, 0.24, 0.2, -0.04, 0.1, 0.1, 0.07); // порванное
        // кепка-восьмиклинка
        add(head, new THREE.CylinderGeometry(0.22, 0.24, 0.1, 8), matJack, 0, 0.3, 0.02);
        px(head, matJackD, 0.1, 0.26, 0.18, 0.18, 0.06, 0.16);
        px(head, matGold, 0, 0.34, 0.02, 0.06, 0.03, 0.06); // кокарда
        brow(head, 0.14, 0.2, 0.28);
        eyePair(head, 0.08, 0.24, 0.12, 0.05);
    } else if (typeId === 'RHINO') {
        skull(head, matFur, 0, 0.06, 0, 0.2);
        px(head, matFur, 0, 0.04, 0, 0.4, 0.36, 0.38);
        // рог с сегментами
        add(head, new THREE.ConeGeometry(0.08, 0.42, 8), matFurL, 0, 0.12, 0.42, Math.PI/2.2, 0, 0);
        px(head, matFurD, 0, 0.14, 0.38, 0.05, 0.05, 0.18);
        px(head, matFurD, 0.02, 0.1, 0.5, 0.03, 0.03, 0.08); // трещина
        // каска + подшлемник
        add(head, new THREE.SphereGeometry(0.24, seg, seg, 0, Math.PI*2, 0, Math.PI*0.55), matGun, 0, 0.22, 0);
        px(head, matGunL, 0, 0.18, 0.22, 0.34, 0.07, 0.12); // очки-капли
        px(head, M(0x111111), -0.1, 0.18, 0.28, 0.08, 0.05, 0.02);
        px(head, M(0x111111), 0.1, 0.18, 0.28, 0.08, 0.05, 0.02);
        // уши маленькие
        px(head, matFur, -0.2, 0.2, -0.06, 0.07, 0.08, 0.05);
        px(head, matFur, 0.2, 0.2, -0.06, 0.07, 0.08, 0.05);
        eyePair(head, 0.06, 0.22, 0.11, 0.048);
    } else if (typeId === 'WOLF' || typeId === 'DOG') {
        skull(head, matFur, 0, 0.06, 0, thin ? 0.17 : 0.2);
        px(head, matFur, 0, 0.04, 0, thin ? 0.34 : 0.4, 0.34, 0.36);
        // морда
        add(head, new THREE.CylinderGeometry(0.07, 0.1, 0.26, seg), matFurL, 0, -0.04, 0.34, Math.PI/2, 0, 0);
        px(head, matNose, 0, -0.04, 0.5, 0.08, 0.06, 0.05);
        // уши стоячие
        add(head, new THREE.ConeGeometry(0.07, 0.18, 6), matFur, -0.16, 0.3, -0.04, 0, 0, -0.3);
        add(head, new THREE.ConeGeometry(0.07, 0.18, 6), matFur, 0.16, 0.3, -0.04, 0, 0, 0.3);
        px(head, matFurL, -0.16, 0.28, -0.02, 0.04, 0.1, 0.03);
        px(head, matFurL, 0.16, 0.28, -0.02, 0.04, 0.1, 0.03);
        // хвост
        px(root, matFurD, 0, 0.72, -0.48, 0.1, 0.1, 0.38);
        px(root, matFur, 0, 0.78, -0.62, 0.08, 0.08, 0.14);
        if (id === 'WOLF_NIGHT') {
            px(head, M(0xff2020, { emissive: 0xff0000, emissiveIntensity: 1.0 }), -0.12, 0.08, 0.24, 0.09, 0.09, 0.06);
            px(head, matJack, 0, 0.22, -0.06, 0.42, 0.16, 0.36);
            px(head, matJackD, 0, 0.12, 0.2, 0.2, 0.08, 0.1); // капюшон козырёк
        }
        brow(head, 0.14, 0.18, 0.26);
        eyePair(head, 0.08, 0.22, 0.11, 0.05);
    } else if (typeId === 'CROC' || typeId === 'CROCODILE') {
        // вытянутая пасть
        px(head, matFur, 0, 0.02, 0.05, 0.32, 0.26, 0.5);
        skull(head, matFur, 0, 0.08, -0.05, 0.16);
        jaw = new THREE.Group();
        px(jaw, matFurD, 0, -0.06, 0.12, 0.28, 0.1, 0.42);
        // зубы ряд
        for (let ti = 0; ti < 6; ti++) {
            const tx = -0.12 + ti * 0.05;
            add(jaw, new THREE.ConeGeometry(0.02, 0.07, 4), matTooth, tx, 0.02, 0.2 + (ti%2)*0.04, Math.PI, 0, 0);
            add(head, new THREE.ConeGeometry(0.02, 0.06, 4), matTooth, tx, -0.02, 0.22 + (ti%2)*0.03);
        }
        head.add(jaw);
        // глаза сверху
        px(head, matEyeW, -0.1, 0.16, 0.1, 0.08, 0.06, 0.06);
        px(head, matEye, -0.1, 0.16, 0.14, 0.05, 0.04, 0.04);
        px(head, matEyeW, 0.1, 0.16, 0.1, 0.08, 0.06, 0.06);
        px(head, matEye, 0.1, 0.16, 0.14, 0.05, 0.04, 0.04);
        // гребень
        for (let ci = 0; ci < 5; ci++) {
            add(head, new THREE.ConeGeometry(0.03, 0.08, 4), matFurL, 0, 0.18, -0.1 + ci * 0.06);
        }
    } else if (typeId === 'BEAR') {
        skull(head, matFur, 0, 0.08, 0, 0.22);
        px(head, matFur, 0, 0.06, 0, 0.44, 0.4, 0.4);
        // мордочка
        add(head, new THREE.SphereGeometry(0.12, seg, seg), matFurL, 0, -0.04, 0.28);
        px(head, matNose, 0, -0.02, 0.4, 0.08, 0.06, 0.05);
        // круглые уши
        add(head, new THREE.SphereGeometry(0.09, 8, 8), matFur, -0.22, 0.22, -0.05);
        add(head, new THREE.SphereGeometry(0.09, 8, 8), matFur, 0.22, 0.22, -0.05);
        px(head, matFurL, -0.22, 0.22, -0.02, 0.05, 0.05, 0.03);
        px(head, matFurL, 0.22, 0.22, -0.02, 0.05, 0.05, 0.03);
        if (id === 'BEAR_VETERAN' || String(id).indexOf('USHANKA') >= 0 || String(id).indexOf('BEAR') >= 0) {
            // ушанка
            px(head, matJack, 0, 0.28, 0, 0.48, 0.16, 0.42);
            px(head, matJackD, -0.28, 0.12, 0.05, 0.1, 0.22, 0.16);
            px(head, matJackD, 0.28, 0.12, 0.05, 0.1, 0.22, 0.16);
            px(head, matGold, 0, 0.32, 0.18, 0.08, 0.04, 0.02); // кокарда
        }
        brow(head, 0.14, 0.2, 0.3);
        eyePair(head, 0.08, 0.24, 0.12, 0.052);
    } else if (typeId === 'HIPPO') {
        px(head, matFur, 0, 0.04, 0.05, 0.48, 0.36, 0.5);
        skull(head, matFur, 0, 0.1, -0.05, 0.18);
        // огромная пасть
        jaw = new THREE.Group();
        px(jaw, matFurD, 0, -0.1, 0.1, 0.42, 0.12, 0.4);
        px(jaw, matTooth, 0, 0, 0.25, 0.36, 0.04, 0.08);
        head.add(jaw);
        px(head, matNose, -0.1, 0.06, 0.42, 0.08, 0.06, 0.05);
        px(head, matNose, 0.1, 0.06, 0.42, 0.08, 0.06, 0.05);
        // крошечные уши
        px(head, matFur, -0.22, 0.2, -0.1, 0.08, 0.08, 0.05);
        px(head, matFur, 0.22, 0.2, -0.1, 0.08, 0.08, 0.05);
        eyePair(head, 0.14, 0.28, 0.14, 0.04);
    } else if (typeId === 'BULL') {
        skull(head, matFur, 0, 0.06, 0, 0.2);
        px(head, matFur, 0, 0.04, 0, 0.4, 0.36, 0.38);
        // рога
        add(head, new THREE.ConeGeometry(0.04, 0.28, 6), matTooth, -0.22, 0.28, -0.05, 0.5, 0, -0.8);
        add(head, new THREE.ConeGeometry(0.04, 0.28, 6), matTooth, 0.22, 0.28, -0.05, 0.5, 0, 0.8);
        px(head, matFurL, 0, -0.02, 0.32, 0.2, 0.14, 0.2);
        px(head, matNose, 0, -0.04, 0.46, 0.1, 0.07, 0.06);
        add(head, new THREE.TorusGeometry(0.06, 0.015, 6, 12), matGold, 0, -0.08, 0.48, Math.PI/2, 0, 0);
        eyePair(head, 0.08, 0.22, 0.12, 0.05);
    } else if (typeId === 'PANTHER') {
        skull(head, matFur, 0, 0.05, 0, 0.18);
        px(head, matFur, 0, 0.03, 0, 0.36, 0.32, 0.36);
        px(head, matFurL, 0, -0.04, 0.28, 0.16, 0.12, 0.22);
        px(head, matNose, 0, -0.04, 0.42, 0.06, 0.05, 0.04);
        add(head, new THREE.ConeGeometry(0.06, 0.14, 5), matFur, -0.14, 0.26, -0.04);
        add(head, new THREE.ConeGeometry(0.06, 0.14, 5), matFur, 0.14, 0.26, -0.04);
        // визор
        px(head, matAcc, -0.1, 0.12, 0.18, 0.18, 0.04, 0.04);
        px(head, M(0x00ffff, { emissive: 0x00ffff, emissiveIntensity: 0.6 }), 0.1, 0.1, 0.18, 0.18, 0.04, 0.04);
        px(head, matGunL, 0, 0.08, 0.3, 0.3, 0.06, 0.08);
        eyePair(head, 0.08, 0.2, 0.1, 0.045);
    } else if (typeId === 'GORILLA') {
        skull(head, matFur, 0, 0.06, 0, 0.2);
        px(head, matFur, 0, 0.04, 0, 0.42, 0.38, 0.38);
        px(head, matFurL, 0, -0.08, 0.22, 0.3, 0.18, 0.18);
        // надбровные дуги
        px(head, matFurD, 0, 0.14, 0.18, 0.34, 0.08, 0.1);
        px(head, matGun, 0, 0.26, 0.08, 0.44, 0.2, 0.32); // сварочная маска
        px(head, matGunL, 0, 0.2, 0.26, 0.28, 0.1, 0.04); // стекло маски
        eyePair(head, 0.06, 0.2, 0.11, 0.048);
    } else if (typeId === 'LIZARD') {
        px(head, matFur, 0, 0.04, 0.05, 0.3, 0.26, 0.42);
        skull(head, matFur, 0, 0.06, -0.02, 0.14);
        for (let li = 0; li < 8; li++) {
            add(root, new THREE.ConeGeometry(0.035, 0.09, 4), M(0x00ffff, { emissive: 0x00ffff, emissiveIntensity: 0.55 }), 0, 1.12 + li * 0.02, -0.12 - li * 0.07);
        }
        px(head, M(0x00ff88, { emissive: 0x00ff88, emissiveIntensity: 0.45 }), 0, 0.1, 0.28, 0.32, 0.08, 0.08);
        eyePair(head, 0.1, 0.22, 0.1, 0.045);
    } else if (typeId === 'MONKEY') {
        skull(head, matFur, 0, 0.1, 0, 0.22);
        px(head, matFur, 0, 0.08, 0, 0.44, 0.42, 0.42);
        px(head, matFurL, 0, -0.04, 0.26, 0.3, 0.22, 0.22);
        px(head, matAcc, -0.12, 0.12, 0.3, 0.14, 0.1, 0.06);
        px(head, matGold, -0.12, 0.12, 0.34, 0.08, 0.08, 0.02); // линза
        // уши
        add(head, new THREE.SphereGeometry(0.08, 8, 8), matFur, -0.26, 0.1, -0.02);
        add(head, new THREE.SphereGeometry(0.08, 8, 8), matFur, 0.26, 0.1, -0.02);
        eyePair(head, 0.1, 0.24, 0.12, 0.05);
    } else if (typeId === 'ALPHA') {
        skull(head, matFur, 0, 0.1, 0, 0.23);
        px(head, matFur, 0, 0.08, 0, 0.46, 0.42, 0.42);
        px(head, matFurL, 0, -0.04, 0.28, 0.3, 0.2, 0.24);
        // парик судьи
        px(head, M(0x8a7a5a), 0, 0.34, 0, 0.52, 0.22, 0.44);
        px(head, M(0x9a8a6a), -0.28, 0.15, 0.05, 0.12, 0.28, 0.14);
        px(head, M(0x9a8a6a), 0.28, 0.15, 0.05, 0.12, 0.28, 0.14);
        px(head, matGunL, 0.14, 0.1, 0.3, 0.09, 0.09, 0.05); // монокль
        px(head, matGold, 0.14, 0.02, 0.3, 0.02, 0.08, 0.02); // цепочка
        brow(head, 0.16, 0.2, 0.32);
        eyePair(head, 0.08, 0.24, 0.12, 0.055);
    } else {
        // BEAR default / generic
        skull(head, matFur, 0, 0.06, 0, 0.2);
        px(head, matFur, 0, 0.04, 0, 0.4, 0.38, 0.38);
        px(head, matFurL, 0, -0.04, 0.28, 0.22, 0.16, 0.2);
        px(head, matNose, 0, -0.04, 0.42, 0.08, 0.06, 0.05);
        add(head, new THREE.SphereGeometry(0.08, 8, 8), matFur, -0.2, 0.22, -0.04);
        add(head, new THREE.SphereGeometry(0.08, 8, 8), matFur, 0.2, 0.22, -0.04);
        brow(head, 0.14, 0.2, 0.28);
        eyePair(head, 0.08, 0.22, 0.12, 0.05);
    }

    // глаза-fallback только если тип сам не нарисовал (HIPPO/CROC уже есть)
    if (typeId !== 'HIPPO' && typeId !== 'CROC' && typeId !== 'CROCODILE' && typeId !== 'BOAR' && typeId !== 'RHINO' && typeId !== 'WOLF' && typeId !== 'DOG' && typeId !== 'BEAR' && typeId !== 'BULL' && typeId !== 'PANTHER' && typeId !== 'GORILLA' && typeId !== 'LIZARD' && typeId !== 'MONKEY' && typeId !== 'ALPHA') {
        eyePair(head, 0.08, 0.22, 0.12, 0.05);
    }

    head.position.set(0, 1.36, 0.04);
    root.add(head);
    try { if (head.children && head.children[0]) addBossOutline(head.children[0], 1.08); } catch (e) {}
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
        const outlineMat = new THREE.MeshBasicMaterial({
            color: 0x08060c, side: THREE.BackSide, depthWrite: false
        });
        const outlines = [];
        root.traverse(function(o) {
            if (!o.isMesh || !o.geometry) return;
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
    createBossHpBar,
    updateBossHpBar,
    createArcadeBossMesh
};
