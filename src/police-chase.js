/**
 * Погоня ГАИ (как охранник с собакой в Subway Surfers): после аварии в бесконечном заезде сзади появляется
 * «Жигуль» с мигалкой и CHASE_TIME секунд висит на хвосте. Ещё одна авария за это время — «ГАИ поймала»: заезд
 * кончается (дальше, как обычно, «Второй шанс»). Логика — чистая (с тестами), модель и плашка — здесь же.
 */
import * as THREE from 'three';

export const CHASE_TIME = 8;

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
    // настоящий свет мигалок — красно-синие отблески на дороге и машинах
    const lr = new THREE.PointLight(0xff2020, 0, 7), lb = new THREE.PointLight(0x2060ff, 0, 7);
    lr.position.set(-0.2, 1.3, 0.1); lb.position.set(0.2, 1.3, 0.1); g.add(lr, lb);
    g.userData.lights = [red, blue];
    g.userData.glow = [lr, lb];
    g.scale.setScalar(0.85); // на 15% меньше обычной машины
    return g;
}
function blink(car, t) {
    const on = Math.floor(t * 6) % 2 === 0;
    car.userData.lights[0].visible = on; car.userData.lights[1].visible = !on;
    car.userData.glow[0].intensity = on ? 3 : 0; car.userData.glow[1].intensity = on ? 0 : 3;
}

/**
 * Погоня в сцене: police.crash() на аварии → 'caught' | 'chase'; police.tick(dt, x, z) каждый кадр; police.stop().
 * Машина держится чуть сзади в соседней полосе (прямо сзади она закрыла бы обзор — стоит между камерой и игроком);
 * плашка «ПОГОНЯ» с отсчётом.
 */
export function createPolice(scene) {
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
        crash: function() { const r = onCrash(st); show(r === 'chase'); return r; },
        stop: function() { st.t = 0; show(false); },
        tick: function(dt, x, z, gap) {
            if (st.t <= 0) return;
            t += dt;
            if (tickChase(st, dt) <= 0) { show(false); return; }
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
