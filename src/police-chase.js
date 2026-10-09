/**
 * Погоня ГАИ (как охранник с собакой в Subway Surfers): после аварии в бесконечном заезде сзади появляется
 * «Жигуль» с мигалкой и CHASE_TIME секунд висит на хвосте. Ещё одна авария за это время — «ГАИ поймала»: заезд
 * кончается (дальше, как обычно, «Второй шанс»). Логика — чистая (с тестами), модель и плашка — здесь же.
 */
import * as THREE from 'three';
import { mergeCarParts } from './merge-static.js';

export const CHASE_TIME = 5;

/** Состояние погони: { t } — сколько секунд ещё висит на хвосте */
export function createChaseState() { return { t: 0 }; }

/** Авария: 'caught' — погоня уже шла (поймали), иначе погоня начинается — 'chase' */
export function onCrash(st) {
    if (st.t > 0) { st.t = 0; return 'caught'; }
    st.t = CHASE_TIME;
    return 'chase';
}
export function tickChase(st, dt) { st.t = Math.max(0, st.t - dt); return st.t; }

// ---- модель: белый седан 80-х — три объёма, синяя полоса и «ГАИ» на дверях, мигалка-«люстра» с куполами,
// двойные фары, хромированные бамперы, фара-искатель и антенна. Перёд — к −z.
function doorLabel() {
    const c = document.createElement('canvas'); c.width = 128; c.height = 48;
    const x = c.getContext('2d');
    x.fillStyle = '#f4f4f2'; x.fillRect(0, 0, 128, 48);
    x.fillStyle = '#1f4fbf'; x.font = 'bold 34px Arial'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText('ГАИ', 64, 26);
    const t = new THREE.CanvasTexture(c); t.userData.keep = true;
    return t;
}
let _label = null;
export function policeCar() {
    const g = new THREE.Group();
    const cache = {};
    const M = function(c, o) { const k = c + JSON.stringify(o || {}); return cache[k] || (cache[k] = new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.45, metalness: 0.2 }, o || {}))); };
    const BM = function(c) { return cache['b' + c] || (cache['b' + c] = new THREE.MeshBasicMaterial({ color: c })); };
    const box = function(m, w, h, l, x, y, z, rx) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, l), m); b.position.set(x, y, z); if (rx) b.rotation.x = rx; g.add(b); return b; };
    const white = M(0xf4f4f2), blueM = M(0x1f4fbf), glass = M(0x1a2a38, { roughness: 0.15, metalness: 0.5 }), dark = M(0x18181c, { roughness: 0.8 }), chrome = M(0xdfe3e8, { metalness: 0.25, roughness: 0.3 }) // светлый «хром»: металлу без карты отражений нечего отражать — он темнеет;
    // кузов: низ, капот, багажник, салон
    box(white, 1.2, 0.36, 2.24, 0, 0.4, 0);
    box(white, 1.16, 0.08, 0.66, 0, 0.6, -0.76);                          // капот
    box(white, 1.16, 0.08, 0.5, 0, 0.6, 0.86);                            // багажник
    box(white, 1.06, 0.34, 1.0, 0, 0.8, 0.1);                             // салон
    box(glass, 1.07, 0.22, 0.86, 0, 0.8, 0.1);                            // боковые стёкла
    [-0.18, 0.38].forEach(function(z) { [-1, 1].forEach(function(s) { box(white, 0.02, 0.24, 0.06, s * 0.536, 0.8, z); }); }); // стойки
    box(glass, 0.98, 0.03, 0.42, 0, 0.805, -0.51, -0.98);                 // лобовое — от капота к крыше
    box(glass, 0.96, 0.03, 0.42, 0, 0.805, 0.71, 0.98);                   // заднее — от крыши к багажнику
    // синяя полоса по борту и «ГАИ» на передних дверях
    [-1, 1].forEach(function(s) {
        box(blueM, 0.02, 0.09, 2.1, s * 0.605, 0.44, 0);
        if (!_label) _label = doorLabel();
        const lab = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.16), cache.lab || (cache.lab = new THREE.MeshStandardMaterial({ map: _label, roughness: 0.45, metalness: 0.2 }))); // освещается как кузов
        lab.position.set(s * 0.608, 0.56, -0.2); lab.rotation.y = s * Math.PI / 2; g.add(lab);
        box(dark, 0.03, 0.03, 0.12, s * 0.61, 0.63, 0.05);                 // ручки дверей
        box(dark, 0.06, 0.06, 0.09, s * 0.62, 0.76, -0.42);                // зеркала
    });
    // перёд: решётка с хромом, двойные фары, поворотники, бампер, номер
    box(dark, 0.56, 0.12, 0.03, 0, 0.47, -1.125);
    box(chrome, 0.6, 0.02, 0.035, 0, 0.54, -1.125);
    [-1, 1].forEach(function(s) {
        [0.38, 0.5].forEach(function(x) { box(BM(0xfff6d0), 0.1, 0.1, 0.03, s * x, 0.47, -1.125); });
        box(BM(0xff9a1a), 0.08, 0.05, 0.03, s * 0.5, 0.38, -1.125);
    });
    box(chrome, 1.24, 0.07, 0.08, 0, 0.3, -1.14);
    box(BM(0xf2f2ee), 0.3, 0.08, 0.02, 0, 0.36, -1.16);
    // зад: два фонаря (красный + янтарный), бампер, номер
    [-1, 1].forEach(function(s) {
        box(BM(0xff1a10), 0.2, 0.1, 0.03, s * 0.44, 0.47, 1.125);
        box(BM(0xff9a1a), 0.08, 0.1, 0.03, s * 0.29, 0.47, 1.125);
    });
    box(chrome, 1.24, 0.07, 0.08, 0, 0.3, 1.14);
    box(BM(0xf2f2ee), 0.3, 0.08, 0.02, 0, 0.38, 1.16);
    // мигалка-«люстра»: перекладина, купола красный и синий, громкоговоритель
    box(dark, 0.86, 0.05, 0.22, 0, 0.995, 0.1);
    box(M(0xd8d8d8), 0.22, 0.09, 0.16, 0, 1.06, 0.1);                     // громкоговоритель
    const dome = function(c, x) { const d = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.13, 12), BM(c)); d.position.set(x, 1.085, 0.1); g.add(d); return d; };
    const red = dome(0xff2020, -0.3), blue = dome(0x2060ff, 0.3);
    const redOff = dome(0x5a1010, -0.3), blueOff = dome(0x10204a, 0.3);   // погасший купол — тёмный, не исчезает
    red.userData.noMerge = blue.userData.noMerge = redOff.userData.noMerge = blueOff.userData.noMerge = true;
    red.scale.setScalar(1.02); blue.scale.setScalar(1.02);
    // фара-искатель у левой стойки и антенна
    const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.1, 10), chrome); sp.rotation.x = Math.PI / 2; sp.position.set(-0.56, 0.86, -0.44); g.add(sp);
    box(dark, 0.015, 0.5, 0.015, 0.45, 0.85, 0.85);
    // колёса с колпаками
    [[-0.55, -0.72], [0.55, -0.72], [-0.55, 0.72], [0.55, 0.72]].forEach(function(q) {
        const w = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.18, 14), M(0x111111, { roughness: 0.95 }));
        w.rotation.z = Math.PI / 2; w.position.set(q[0], 0.24, q[1]); g.add(w);
        const h = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.19, 12), chrome);
        h.rotation.z = Math.PI / 2; h.position.set(q[0], 0.24, q[1]); g.add(h);
        box(dark, 0.03, 0.3, 0.56, q[0] + Math.sign(q[0]) * 0.01, 0.42, q[1]); // тёмная арка
    });
    // отсветы мигалок — красно-синие пятна на асфальте и ореол над крышей. Не настоящий свет: новый источник света
    // посреди заезда заставляет видеокарту пересобрать все шейдеры — игра замирала на секунду
    const tex = glowTexture();
    const spot = function(c, x) {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 5.2), new THREE.MeshBasicMaterial({ map: tex, color: c, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
        m.rotation.x = -Math.PI / 2; m.position.set(x, 0.04, 0.1); g.add(m);
        const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: c, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
        halo.scale.set(1.4, 1.4, 1); halo.position.set(x * 0.16, 1.12, 0.1); g.add(halo);
        return [m, halo];
    };
    g.userData.lights = [red, blue];
    try { mergeCarParts(g); } catch (e) { /* склейка — только ради скорости */ } // кузов — несколько мешей; купола мигалок и отсветы — отдельно
    g.userData.glow = [spot(0xff2020, -1.1), spot(0x2060ff, 1.1)];
    g.scale.setScalar(0.85); // на 15% меньше обычной машины
    return g;
}
function blink(car, t) {
    const on = Math.floor(t * 6) % 2 === 0;
    car.userData.lights[0].visible = on; car.userData.lights[1].visible = !on;
    car.userData.glow[0].forEach(function(m, i) { m.material.opacity = on ? (i ? 0.85 : 0.45) : 0; });
    car.userData.glow[1].forEach(function(m, i) { m.material.opacity = on ? 0 : (i ? 0.85 : 0.45); });
}

// мягкое круглое пятно света (одна текстура на все отсветы)
let _glowTex = null;
function glowTexture() {
    if (_glowTex) return _glowTex;
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d'), r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.4, 'rgba(255,255,255,0.45)'); r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r; g.fillRect(0, 0, 64, 64);
    _glowTex = new THREE.CanvasTexture(c);
    _glowTex.userData.keep = true;
    return _glowTex;
}


/**
 * Погоня в сцене: police.crash() на аварии → 'caught' | 'chase'; police.tick(dt, x, z) каждый кадр; police.stop().
 * Машина держится чуть сзади в соседней полосе (прямо сзади она закрыла бы обзор — стоит между камерой и игроком);
 * плашка «ПОГОНЯ» с отсчётом.
 */
export function createPolice(scene, onChase, onEscape) { // onChase — погоня началась (ведущий: «ГАИ на хвосте!»), onEscape — ушёл от погони
    const st = createChaseState();
    let car = null, hud = null, t = 0;
    const show = function(on) {
        if (on && !car) { car = policeCar(); scene.add(car); }
        if (car) car.visible = on;
        if (on && !hud) {
            hud = document.createElement('div');
            hud.className = 'police-hud';
            hud.innerHTML = '<b>🚨 ПОГОНЯ ГАИ</b><small>ещё авария — поймают</small><i><u></u></i>';
            document.body.appendChild(hud);
        }
        if (!on && hud) { hud.remove(); hud = null; }
    };
    return {
        state: st,
        crash: function() { const r = onCrash(st); show(r === 'chase'); if (r === 'chase' && onChase) onChase(); return r; },
        stop: function() { st.t = 0; show(false); },
        tick: function(dt, x, z, gap) {
            if (st.t <= 0) return;
            t += dt;
            if (tickChase(st, dt) <= 0) { show(false); if (onEscape) onEscape(); return; }
            if (car) {
                const tx = x + (x > 0.5 ? -1.9 : 1.9); // соседняя полоса, ближе к середине дороги
                car.position.x += (tx - car.position.x) * Math.min(1, dt * 2.5);
                car.position.z = z + (gap || 1.6) + Math.sin(t * 2.2) * 0.5; // то нагоняет, то отстаёт
                car.position.y = 0;
                blink(car, t);
            }
            if (hud) hud.querySelector('u').style.width = Math.round(st.t / CHASE_TIME * 100) + '%';
        },
        /**
         * «ГАИ поймала»: ролик — машина ГАИ вплотную сбоку, камера облетает обе машины, мигалки (как финиш кампании).
         * o: { camera, renderer, x, z, dur, onDone }
         */
        arrest: function(o) {
            st.t = 0; show(true);
            if (hud) { hud.remove(); hud = null; }
            document.body.classList.add('arrest-cine'); // на время ролика панель заезда прячется (css)
            const cam = o.camera, dur = o.dur || 2.6, side = o.x > 0.5 ? -1 : 1;
            car.position.set(o.x + side * 1.35, 0, o.z - 0.5); car.rotation.y = side * 0.18;
            const cx = (o.x + car.position.x) / 2, cz = o.z - 0.25, R = 5.6;
            let k = 0, tt = 0, last = performance.now();
            const step = function(now) {
                tt += Math.min(0.1, (now - last) / 1000); last = now; k = Math.min(1, tt / dur);
                const ang = 0.5 + k * Math.PI * 1.35, h = 1.6 + Math.sin(k * Math.PI) * 1.1;
                const tx = cx + Math.sin(ang) * R, tz = cz + Math.cos(ang) * R * 0.85;
                if (k < 0.12) cam.position.lerp(new THREE.Vector3(tx, h, tz), 0.25); else cam.position.set(tx, h, tz);
                cam.lookAt(cx, 0.6, cz);
                blink(car, tt);
                o.renderer.render(scene, cam);
                if (k < 1) requestAnimationFrame(step);
                else { show(false); document.body.classList.remove('arrest-cine'); if (o.onDone) o.onDone(); }
            };
            requestAnimationFrame(step);
        },
        dispose: function() { show(false); if (car) { scene.remove(car); car = null; } }
    };
}
