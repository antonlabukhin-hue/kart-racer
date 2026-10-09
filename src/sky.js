/**
 * Небо бесконечной трассы: градиент от горизонта к зениту, солнце (ночью — луна и звёзды), облака
 * и силуэты на горизонте — дальний хребет и ближний слой по пейзажу (панельки и трубы ТЭЦ, деревня
 * с церковью, тайга, заводы, свалка). Всё рисуется вокруг камеры (следует только за её положением),
 * без тумана и без «кривого мира» — это бесконечно далеко.
 *
 * Чистая логика (цвет зенита, раскладка силуэтов) — с тестами; рисование на canvas — только в браузере.
 */
import * as THREE from 'three';
import { mixHex } from './infinite.js';

export const SKY_R = 260;          // радиус купола (камера видит до 300)
const FAR_R = 172, NEAR_R = 150, CLOUD_R = 235; // силуэты — ближе границы тумана: полоса дальней земли их не закрывает
const TEX_W = 2048, TEX_H = 256;   // текстура силуэта — треть круга (повтор ×3)

/** Цвет зенита: у пейзажа свой (zenith), иначе — небо, уведённое в глубокий синий */
export function zenithFor(theme) {
    if (theme.zenith != null) return theme.zenith;
    return mixHex(theme.sky, theme.night ? 0x000004 : 0x4a78c0, theme.night ? 0.7 : 0.5);
}

/** Какой силуэт стоит на горизонте у стиля декора */
export function skylineKind(style) {
    return { arsenev: 'town', city: 'city', village: 'village', forest: 'forest', industrial: 'industrial', junk: 'junk' }[style] || 'town';
}

function rng(seed) {
    let s = seed >>> 0;
    return function() { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

/**
 * Раскладка силуэта: список фигур в долях ширины (x, w) и высоты (h, от низа) — детерминированно.
 * kind: 'town' | 'city' | 'village' | 'forest' | 'industrial' | 'junk' | 'ridge' (дальний хребет)
 * Фигуры: block (дом, окна win), stack (труба), tower (телебашня), dome (церковь), crane, hill, spruce, heap, tank
 */
export function skylineShapes(kind) {
    const r = rng(kind.length * 7919 + kind.charCodeAt(0) * 31);
    const out = [];
    const hills = function(n, hMin, hMax) {
        for (let i = 0; i < n; i++) out.push({ t: 'hill', x: i / n + r() * 0.04, w: 1.6 / n + r() * 0.1, h: hMin + r() * (hMax - hMin) });
    };
    if (kind === 'ridge') {
        let x = 0;
        while (x < 1) { const w = 0.05 + r() * 0.09; out.push({ t: 'peak', x: x, w: w * 2.2, h: 0.28 + r() * 0.42 }); x += w; }
        return out;
    }
    if (kind === 'city' || kind === 'town') {
        const big = kind === 'city';
        if (!big) hills(4, 0.03, 0.07);
        let x = 0;
        while (x < 1) {
            const w = (big ? 0.012 : 0.01) + r() * (big ? 0.022 : 0.018);
            const tall = r() < (big ? 0.55 : 0.25);
            const h = tall ? (big ? 0.3 : 0.22) + r() * 0.16 : 0.1 + r() * (big ? 0.1 : 0.07);
            if (r() < (big ? 0.85 : 0.6)) out.push({ t: 'block', x: x, w: w, h: h, win: tall ? 1 : 0.5 });
            x += w + r() * (big ? 0.006 : 0.025);
        }
        out.push({ t: 'stack', x: 0.18, w: 0.012, h: 0.62 }, { t: 'stack', x: 0.205, w: 0.012, h: 0.56 });
        if (big) out.push({ t: 'tower', x: 0.62, w: 0.008, h: 0.7 }, { t: 'crane', x: 0.84, w: 0.05, h: 0.6 });
        else out.push({ t: 'dome', x: 0.7, w: 0.02, h: 0.34 }, { t: 'crane', x: 0.45, w: 0.04, h: 0.45 });
        return out;
    }
    if (kind === 'village') {
        hills(6, 0.1, 0.24);
        for (let i = 0; i < 26; i++) out.push({ t: 'spruce', x: r(), w: 0.008 + r() * 0.01, h: 0.16 + r() * 0.14 });
        for (let i = 0; i < 10; i++) out.push({ t: 'block', x: r(), w: 0.012 + r() * 0.01, h: 0.08 + r() * 0.05, roof: true, win: 0.3 });
        out.push({ t: 'dome', x: 0.3, w: 0.022, h: 0.42 }, { t: 'tank', x: 0.76, w: 0.014, h: 0.36 });
        return out;
    }
    if (kind === 'forest') {
        hills(5, 0.14, 0.3);
        for (let i = 0; i < 140; i++) out.push({ t: 'spruce', x: r(), w: 0.006 + r() * 0.009, h: 0.14 + r() * 0.2 });
        return out;
    }
    if (kind === 'industrial') {
        hills(3, 0.05, 0.1);
        let x = 0;
        while (x < 1) {
            const w = 0.03 + r() * 0.06;
            out.push({ t: 'block', x: x, w: w, h: 0.12 + r() * 0.16, saw: r() < 0.5, win: 0.4 });
            if (r() < 0.45) out.push({ t: 'stack', x: x + w * r(), w: 0.009 + r() * 0.006, h: 0.45 + r() * 0.35 });
            if (r() < 0.2) out.push({ t: 'tank', x: x + w * 0.3, w: 0.03, h: 0.2 });
            x += w + r() * 0.02;
        }
        out.push({ t: 'crane', x: 0.35, w: 0.06, h: 0.6 }, { t: 'crane', x: 0.78, w: 0.05, h: 0.5 });
        return out;
    }
    // junk — свалка: кучи, кран с магнитом, кузова
    hills(4, 0.08, 0.16);
    for (let i = 0; i < 22; i++) out.push({ t: 'heap', x: r(), w: 0.04 + r() * 0.06, h: 0.1 + r() * 0.16 });
    out.push({ t: 'crane', x: 0.25, w: 0.06, h: 0.55 }, { t: 'crane', x: 0.7, w: 0.05, h: 0.45 }, { t: 'stack', x: 0.52, w: 0.01, h: 0.5 });
    return out;
}

/* ---------- рисование (браузер) ---------- */

// красный канал — тело силуэта, зелёный — окна (светятся ночью)
function drawShapes(ctx, shapes, W, H) {
    const body = 'rgb(255,0,0)', win = 'rgb(255,255,0)';
    const r = rng(shapes.length * 13 + 5);
    shapes.forEach(function(s) {
        // фигура у края дублируется с другой стороны — шов повтора не виден
        [0, -1, 1].forEach(function(shift) {
            const x = (s.x + shift) * W, w = s.w * W, h = s.h * H, y = H - h;
            if (x + w * 1.2 < -W * 0.1 || x - w > W * 1.1) return;
            ctx.fillStyle = body;
            if (s.t === 'hill' || s.t === 'heap') {
                ctx.beginPath(); ctx.moveTo(x - w / 2, H);
                ctx.quadraticCurveTo(x, y - h * (s.t === 'heap' ? 0.4 : 1), x + w / 2, H); ctx.fill();
            } else if (s.t === 'peak') {
                ctx.beginPath(); ctx.moveTo(x - w / 2, H); ctx.lineTo(x - w * 0.08, y + h * 0.06); ctx.lineTo(x, y); ctx.lineTo(x + w * 0.1, y + h * 0.1); ctx.lineTo(x + w / 2, H); ctx.fill();
            } else if (s.t === 'spruce') {
                ctx.beginPath(); ctx.moveTo(x - w, H); ctx.lineTo(x, y); ctx.lineTo(x + w, H); ctx.fill();
            } else if (s.t === 'block') {
                ctx.fillRect(x, y, w, h);
                if (s.roof) { ctx.beginPath(); ctx.moveTo(x - w * 0.1, y); ctx.lineTo(x + w / 2, y - h * 0.5); ctx.lineTo(x + w * 1.1, y); ctx.fill(); }
                if (s.saw) for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(x + k * w / 4, y); ctx.lineTo(x + (k + 1) * w / 4, y - h * 0.18); ctx.lineTo(x + (k + 1) * w / 4, y); ctx.fill(); }
                if (h > H * 0.3 && r() < 0.5) ctx.fillRect(x + w * 0.2, y - H * 0.03, w * 0.15, H * 0.03); // будка лифта
                ctx.fillStyle = win;
                const cols = Math.max(1, Math.floor(w / 7)), rows = Math.max(1, Math.floor(h / 8));
                for (let cy = 0; cy < rows; cy++) for (let cx = 0; cx < cols; cx++) {
                    if (r() > 0.55 * (s.win || 0.5)) continue;
                    ctx.fillRect(x + 2 + cx * (w - 3) / cols, y + 3 + cy * (h - 4) / rows, 2, 3);
                }
            } else if (s.t === 'stack') {
                ctx.beginPath(); ctx.moveTo(x - w * 0.7, H); ctx.lineTo(x - w * 0.45, y); ctx.lineTo(x + w * 0.45, y); ctx.lineTo(x + w * 0.7, H); ctx.fill();
            } else if (s.t === 'tower') {
                ctx.beginPath(); ctx.moveTo(x - w * 2.2, H); ctx.lineTo(x - w * 0.35, y + h * 0.3); ctx.lineTo(x + w * 0.35, y + h * 0.3); ctx.lineTo(x + w * 2.2, H); ctx.fill();
                ctx.fillRect(x - w * 1.3, y + h * 0.27, w * 2.6, h * 0.05);
                ctx.fillRect(x - w * 0.15, y, w * 0.3, h * 0.3);
                ctx.fillStyle = win; ctx.fillRect(x - w * 0.2, y + h * 0.29, w * 0.4, 3);
            } else if (s.t === 'dome') {
                ctx.fillRect(x - w / 2, y + h * 0.45, w, h * 0.55);
                ctx.fillRect(x - w * 0.18, y + h * 0.18, w * 0.36, h * 0.3);
                ctx.beginPath(); ctx.ellipse(x, y + h * 0.2, w * 0.3, h * 0.12, 0, 0, Math.PI * 2); ctx.fill();
                ctx.fillRect(x - 1, y, 2, h * 0.1);
            } else if (s.t === 'tank') {
                ctx.fillRect(x - w * 0.12, y + h * 0.4, w * 0.24, h * 0.6);
                ctx.beginPath(); ctx.ellipse(x, y + h * 0.3, w * 0.5, h * 0.22, 0, 0, Math.PI * 2); ctx.fill();
            } else if (s.t === 'crane') {
                ctx.fillRect(x - 2, y, 4, h);
                ctx.fillRect(x - w * 0.3, y, w * 1.3, 4);
                ctx.fillRect(x + w * 0.85, y, 2, h * 0.25);
            }
        });
    });
}

const _tex = {};
function skylineTexture(kind) {
    if (_tex[kind]) return _tex[kind];
    const cv = document.createElement('canvas');
    cv.width = TEX_W; cv.height = TEX_H;
    drawShapes(cv.getContext('2d'), skylineShapes(kind), TEX_W, TEX_H);
    const t = new THREE.CanvasTexture(cv);
    t.wrapS = THREE.RepeatWrapping;
    t.generateMipmaps = false;
    t.minFilter = THREE.LinearFilter;
    _tex[kind] = t;
    return t;
}

let _cloudTex = null;
// облака «как в мультике»: круги без размытия, низ ровный, снизу — тень (красный канал = яркость)
function cloudTexture() {
    if (_cloudTex) return _cloudTex;
    const W = 2048, H = 256;
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d'), r = rng(42);
    const clouds = [];
    for (let i = 0; i < 9; i++) {
        const cx = (i + r() * 0.6) * W / 9, base = 120 + r() * 90, w = 90 + r() * 120, puffs = [];
        for (let k = 0; k < 5 + Math.floor(r() * 4); k++) {
            const px = cx - w / 2 + r() * w, rad = 18 + r() * 26 * (1 - Math.abs(px - cx) / w);
            puffs.push([px, base - rad * (0.3 + r() * 0.5), rad]);
        }
        clouds.push({ cx: cx, base: base, w: w, puffs: puffs });
    }
    const paint = function(col, dy, grow) {
        ctx.fillStyle = col;
        clouds.forEach(function(c) {
            [0, -W, W].forEach(function(sh) {
                ctx.save(); ctx.beginPath(); ctx.rect(c.cx + sh - c.w, 0, c.w * 2, c.base); ctx.clip();
                c.puffs.forEach(function(p) { ctx.beginPath(); ctx.arc(p[0] + sh, p[1] + dy, p[2] + grow, 0, Math.PI * 2); ctx.fill(); });
                ctx.restore();
            });
        });
    };
    paint('rgb(205,205,205)', 0, 0);      // тень снизу
    paint('rgb(255,255,255)', -7, -3);    // светлый верх
    _cloudTex = new THREE.CanvasTexture(cv);
    _cloudTex.wrapS = THREE.RepeatWrapping;
    return _cloudTex;
}

// своя проекция без «кривого мира» (src/curved-world.js ищет строку с mvPosition — её здесь нет)
const VS_DOME = 'varying vec3 vDir; void main() { vDir = normalize(position); gl_Position = projectionMatrix * (modelViewMatrix * vec4(position, 1.0)); }';
const FS_DOME = `
uniform vec3 uTop; uniform vec3 uHorizon; uniform vec3 uSunDir; uniform vec3 uSun; uniform float uNight;
varying vec3 vDir;
float hash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453); }
void main() {
    vec3 d = normalize(vDir);
    float h = max(d.y, 0.0);
    vec3 col = mix(uHorizon, uTop, pow(smoothstep(0.0, 0.42, h), 0.6));
    float s = max(dot(d, uSunDir), 0.0);
    float disc = smoothstep(0.9991 + uNight * 0.0004, 0.9995 + uNight * 0.0003, s);
    col += uSun * (disc * 1.2 + pow(s, 24.0) * 0.35 + pow(s, 4.0) * 0.12) * (1.0 - uNight * 0.6);
    if (uNight > 0.0) {
        vec3 q = floor(d * 220.0);
        float st = step(0.9965, hash(q)) * smoothstep(0.04, 0.3, h);
        col += vec3(st * 0.85 * uNight);
    }
    gl_FragColor = vec4(col, 1.0);
}`;
const VS_BAND = 'uniform vec2 uRep; uniform float uOff; varying vec2 vUv; void main() { vUv = vec2(uv.x * uRep.x + uOff, uv.y); gl_Position = projectionMatrix * (modelViewMatrix * vec4(position, 1.0)); }';
// силуэты изгибаются вместе с миром (src/curved-world.js подменяет эту строку) — стоят на дальней земле
const VS_LAYER = 'uniform vec2 uRep; uniform float uOff; varying vec2 vUv; void main() { vUv = vec2(uv.x * uRep.x + uOff, uv.y); vec4 mvPosition = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mvPosition; }';
const FS_LAYER = `
uniform sampler2D uMap; uniform vec3 uBase; uniform vec3 uTint; uniform vec3 uWin; uniform float uNight; uniform float uOpacity;
varying vec2 vUv;
void main() {
    vec4 t = texture2D(uMap, vUv);
    if (t.a < 0.5) discard;
    // смена силуэта — растворение «зерном» (слой непрозрачный)
    if (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) > uOpacity) discard;
    vec3 col = mix(uBase, uTint, smoothstep(0.0, 0.7, vUv.y));
    col = mix(col * (1.0 - t.g * 0.12), uWin, t.g * uNight); // днём окна чуть темнее стены, ночью горят
    gl_FragColor = vec4(col, 1.0);
}`;
const FS_CLOUD = `
uniform sampler2D uMap; uniform vec3 uTint; uniform float uOpacity;
varying vec2 vUv;
void main() { vec4 t = texture2D(uMap, vUv); gl_FragColor = vec4(uTint * mix(0.78, 1.0, (t.r - 0.8) * 5.0), t.a * uOpacity); }`;

function followCamera(mesh, dy) {
    mesh.frustumCulled = false;
    mesh.matrixAutoUpdate = false;
    mesh.onBeforeRender = function(r, s, cam) { mesh.matrixWorld.makeTranslation(cam.position.x, cam.position.y + dy, cam.position.z); };
}
function noBend(mat) { mat.onBeforeCompile = function() {}; return mat; }
function band(r, y0, y1, mat, order) {
    const g = new THREE.CylinderGeometry(r, r, y1 - y0, 96, 1, true);
    g.translate(0, (y0 + y1) / 2, 0);
    const m = new THREE.Mesh(g, mat);
    m.renderOrder = order;
    return m;
}

/**
 * Небо в сцене. lite — телефон/низкое качество (без облаков второго слоя).
 * setTheme(a, b, k) — смешение двух пейзажей (как туман в src/inf-world.js); dispose() — убрать.
 */
export function createSky(scene, o) {
    o = o || {};
    const group = new THREE.Group();
    const c = function(hex) { return new THREE.Color(hex); };
    const dome = new THREE.Mesh(new THREE.SphereGeometry(SKY_R, 32, 16), noBend(new THREE.ShaderMaterial({
        uniforms: { uTop: { value: c(0x4a78c0) }, uHorizon: { value: c(0xe0c090) }, uSunDir: { value: new THREE.Vector3(0.22, 0.16, -1).normalize() }, uSun: { value: c(0xfff0c0) }, uNight: { value: 0 } },
        vertexShader: VS_DOME, fragmentShader: FS_DOME, side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false
    })));
    dome.renderOrder = -20;
    followCamera(dome, 0);
    group.add(dome);

    const layer = function(R, y0, y1, order) {
        const mat = (new THREE.ShaderMaterial({
            uniforms: { uMap: { value: null }, uBase: { value: c(0) }, uTint: { value: c(0) }, uWin: { value: c(0xffd27a) }, uNight: { value: 0 }, uOpacity: { value: 1 }, uRep: { value: new THREE.Vector2(3, 1) }, uOff: { value: 0 } },
            vertexShader: VS_LAYER, fragmentShader: FS_LAYER, side: THREE.BackSide, fog: false // с глубиной: ближняя земля и дома закрывают силуэт, дальняя (за ним) — нет
        }));
        const m = band(R, y0, y1, mat, order);
        followCamera(m, 0);
        group.add(m);
        return m;
    };
    // высоты слоя: 25 ед. на радиусе 150 ≈ 9,5° над горизонтом
    const far = layer(FAR_R, -5, 24, -18);
    far.material.uniforms.uMap.value = skylineTexture('ridge');
    const nearA = layer(NEAR_R, -4, 25, -16), nearB = layer(NEAR_R - 2, -4, 25, -15);

    const cloudMat = noBend(new THREE.ShaderMaterial({
        uniforms: { uMap: { value: cloudTexture() }, uTint: { value: c(0xffffff) }, uOpacity: { value: 0.75 }, uRep: { value: new THREE.Vector2(1, 1) }, uOff: { value: 0 } },
        vertexShader: VS_BAND, fragmentShader: FS_CLOUD, side: THREE.BackSide, transparent: true, depthWrite: false, fog: false // прозрачные рисуются после сцены — глубина прячет облака за домами
    }));
    const clouds = band(CLOUD_R, 30, 120, cloudMat, -17);
    followCamera(clouds, 0);
    group.add(clouds);

    group.renderOrder = -20;
    scene.add(group);
    // на телефоне сортировка выключена (renderer.sortObjects) — порядок = порядок в сцене: небо первым
    scene.children.splice(scene.children.indexOf(group), 1);
    scene.children.unshift(group);

    const setLayer = function(m, kind, base, tint, night, op) {
        const u = m.material.uniforms;
        if (kind) u.uMap.value = skylineTexture(kind);
        u.uBase.value.setHex(base); u.uTint.value.setHex(tint); u.uNight.value = night; u.uOpacity.value = op;
        m.visible = op > 0.01;
    };

    let drift = 0;
    return {
        group: group,
        /** a, b — пейзажи (src/infinite.js THEMES), k — доля второго; fog — текущий цвет тумана */
        setTheme: function(a, b, k, fogHex) {
            const night = (a.night ? 1 - k : 0) + (b.night ? k : 0);
            const du = dome.material.uniforms;
            du.uTop.value.setHex(mixHex(zenithFor(a), zenithFor(b), k));
            du.uHorizon.value.setHex(fogHex);
            du.uNight.value = night;
            du.uSun.value.setHex(night > 0.5 ? 0xb8c8e8 : 0xfff0c0);
            const dark = night > 0.5 ? 0x020306 : 0x3c4250;
            // дальний хребет почти растворён в дымке, ближний слой — заметнее
            setLayer(far, null, mixHex(fogHex, dark, 0.06), mixHex(fogHex, dark, 0.2), 0, 1);
            const ka = skylineKind(a.style), kb = skylineKind(b.style);
            const tint = mixHex(fogHex, dark, 0.5);
            if (ka === kb) { setLayer(nearA, ka, fogHex, tint, night, 1); setLayer(nearB, null, fogHex, tint, 0, 0); }
            else { setLayer(nearA, ka, fogHex, tint, night, 1 - k); setLayer(nearB, kb, fogHex, tint, night, k); }
            const cu = cloudMat.uniforms;
            cu.uTint.value.setHex(night > 0.5 ? 0x2a3044 : mixHex(0xffffff, fogHex, 0.25));
            const rain = (a.rain ? 1 - k : 0) + (b.rain ? k : 0);
            cu.uOpacity.value = 0.92 + rain * 0.08 - night * 0.45;
        },
        /** облака медленно плывут */
        tick: function(dt) {
            drift = (drift + dt * 0.004) % 1;
            cloudMat.uniforms.uOff.value = drift;
        },
        dispose: function() {
            scene.remove(group);
            group.traverse(function(m) { if (m.geometry) m.geometry.dispose(); if (m.material) m.material.dispose(); });
        }
    };
}
