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
    g.userData.lights = [red, blue];
    return g;
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
                const blink = Math.floor(t * 6) % 2 === 0;
                car.userData.lights[0].visible = blink; car.userData.lights[1].visible = !blink;
            }
            if (hud) hud.querySelector('u').style.width = Math.round(st.t / CHASE_TIME * 100) + '%';
        },
        dispose: function() { show(false); if (car) { scene.remove(car); car = null; } }
    };
}
