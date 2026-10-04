/**
 * Погоня ГАИ (как охранник с собакой в Subway Surfers): после аварии в бесконечном заезде сзади появляется
 * «Жигуль» с мигалкой и CHASE_TIME секунд висит на хвосте. Ещё одна авария за это время — «ГАИ поймала»: заезд
 * кончается (дальше, как обычно, «Второй шанс»). Логика — чистая (с тестами), модель и плашка — здесь же.
 */
import * as THREE from 'three';

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

// ---- модель: белый «Жигуль» с синей полосой и мигалкой
function policeCar() {
    const g = new THREE.Group();
    const M = function(c, e) { return new THREE.MeshStandardMaterial({ color: c, roughness: 0.5, metalness: 0.2, emissive: e || 0x000000 }); };
    const box = function(m, w, h, l, x, y, z) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, l), m); b.position.set(x, y, z); g.add(b); return b; };
    box(M(0xf2f2f2), 1.2, 0.42, 2.2, 0, 0.42, 0);                 // кузов
    box(M(0xf2f2f2), 1.05, 0.36, 1.1, 0, 0.8, 0.1);               // кабина
    box(M(0x1a3048), 1.07, 0.26, 0.9, 0, 0.82, 0.1);              // стёкла
    [-1, 1].forEach(function(s) { box(M(0x1f4fbf), 0.02, 0.1, 2.0, s * 0.605, 0.46, 0); }); // синяя полоса
    box(M(0x111111), 0.7, 0.06, 0.2, 0, 1.0, 0.1);                // основание мигалки
    const red = box(new THREE.MeshBasicMaterial({ color: 0xff2020 }), 0.32, 0.1, 0.18, -0.18, 1.07, 0.1);
    const blue = box(new THREE.MeshBasicMaterial({ color: 0x2060ff }), 0.32, 0.1, 0.18, 0.18, 1.07, 0.1);
    [-1, 1].forEach(function(s) { box(new THREE.MeshBasicMaterial({ color: 0xfff4c0 }), 0.22, 0.1, 0.03, s * 0.38, 0.45, -1.11); }); // фары
    [[-0.55, -0.7], [0.55, -0.7], [-0.55, 0.7], [0.55, 0.7]].forEach(function(q) {
        const w = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.18, 12), M(0x111111));
        w.rotation.z = Math.PI / 2; w.position.set(q[0], 0.24, q[1]); g.add(w);
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
