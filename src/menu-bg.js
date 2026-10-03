/**
 * Живой 3D-фон главного меню: машина игрока (его модель и краска) мчит навстречу камере
 * по закатной трассе, мимо леса и рекламных щитов 90-х; иногда дорогу перебегает зверь.
 * Сцена — общая диорама (art-scene.js): тот же стиль, что у всех картинок игры.
 * Работает только пока открыто меню (stopMenuBg — всё освобождает). На «низком» качестве
 * и при «уменьшении движения» — один неподвижный кадр.
 * intro: заставка — «кино»: камера меняет крупные планы едущей машины (спереди низко, сбоку, сзади с нитро, облёт).
 */
import * as THREE from 'three';
import { createDiorama, ROAD_W } from './art-scene.js';
import { addNitroFlames } from './cars.js';

const SPEED = 16;          // ед./с — скорость «прокрутки» мира
const SPAN = 150;          // длина петли декораций
const CRITTERS = ['DOG', 'FOX', 'DEER', 'BOAR', 'BEAR'];
const CROSS_X = 11;          // от обочины до обочины: −11 → +11
const CROSS_SPEED = 8;       // ед./с поперёк дороги
// за время перебежки мир уезжает на SPEED·(2·CROSS_X/CROSS_SPEED) ≈ 44 ед. — стартуем дальше, чтобы зверь
// ушёл с дороги задолго до машины (z = 0) и не прошёл сквозь неё
const CRITTER_Z = SPEED * (2 * CROSS_X / CROSS_SPEED) + 14;

let st = null;

function carPaint(profile, carId) {
    try {
        const lo = profile && profile.carLoadout;
        return (lo && lo.paintByCar && lo.paintByCar[carId]) || null;
    } catch (e) { return null; }
}

/** Запустить фон (idempotent). opts: { carId, profile, still, lowPower, intro, dress(built), look } — look: «как одета» машина (сменилась — перестроить) */
export function startMenuBg(opts) {
    const o = opts || {};
    if (st) { if ((o.carId && o.carId !== st.carId) || (o.look != null && o.look !== st.look)) { stopMenuBg(); } else { st.intro = !!o.intro; st.shotT = 0; return; } }
    let renderer;
    try {
        renderer = new THREE.WebGLRenderer({ antialias: !o.lowPower, alpha: false, powerPreference: 'low-power' });
    } catch (e) { return; }
    const canvas = renderer.domElement;
    canvas.id = 'menu-bg';
    // браузер погасил контекст (слишком много 3D-холстов разом) — фон перезапускается, а не остаётся чёрным
    canvas.addEventListener('webglcontextlost', function(e) {
        e.preventDefault();
        setTimeout(function() { if (st && st.renderer.domElement === canvas) { stopMenuBg(); startMenuBg(o); } }, 300);
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, o.lowPower ? 1 : 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    document.body.appendChild(canvas);
    document.body.classList.add('menu-live');

    const carId = o.carId || 'cheburashka';
    const d = createDiorama({
        map: 'arsenev', time: 'sunset', seed: 5,
        // машина едет от камеры, в сторону движения (перёд модели — к −z, поэтому разворот на π)
        car: { id: carId, x: 0.9, rotY: Math.PI, paint: carPaint(o.profile, carId), dress: o.dress },
        boards: [{ x: -(ROAD_W / 2 + 2.6), z: 20, ad: 0 }, { x: ROAD_W / 2 + 2.6, z: 65, ad: 2 }, { x: -(ROAD_W / 2 + 2.6), z: 110, ad: 4 }]
    });
    d.apply(renderer);
    st = {
        renderer: renderer, d: d, scene: d.scene, camera: d.camera, carId: carId, look: o.look, raf: 0, t: 0, last: performance.now(),
        still: !!o.still, critters: [], nextCritter: 1.5, intro: !!o.intro, shotT: 0,
        car: d.cars[0] ? d.cars[0].group : null, wheels: d.cars[0] ? d.cars[0].wheels : []
    };
    try { if (st.car) st.flames = addNitroFlames(st.car); } catch (e) { st.flames = null; }
    const onResize = function() {
        if (!st) return;
        renderer.setSize(window.innerWidth, window.innerHeight, false);
        st.camera.aspect = window.innerWidth / window.innerHeight;
        // узкий экран — шире угол, чтобы машина помещалась
        st.camera.fov = st.camera.aspect < 0.9 ? 58 : 42;
        st.camera.updateProjectionMatrix();
    };
    st.onResize = onResize;
    window.addEventListener('resize', onResize);
    onResize();
    st.onVis = function() { if (!st) return; if (document.hidden) cancelAnimationFrame(st.raf); else { st.last = performance.now(); loop(); } };
    document.addEventListener('visibilitychange', st.onVis);

    step(st.still ? 0 : 0.016);
    renderer.render(st.scene, st.camera);
    if (!st.still) loop();
}

function spawnCritter() {
    const mk = typeof window !== 'undefined' && window.createAnimalMesh;
    if (!mk) return;
    try {
        const kind = CRITTERS[Math.floor(Math.random() * CRITTERS.length)];
        const m = mk(kind);
        const dir = Math.random() < 0.5 ? 1 : -1;
        m.visible = true;
        m.rotation.y = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
        m.position.set(-dir * CROSS_X, 0, CRITTER_Z + Math.random() * 10);
        st.scene.add(m);
        st.critters.push({ mesh: m, dir: dir, t: 0 });
    } catch (e) {}
}

function step(dt) {
    st.t += dt;
    const t = st.t;
    const move = SPEED * dt;
    st.d.roadTex.offset.y -= move / 8;           // 240 ед. / 30 повторов = 8 ед. на повтор
    st.d.deco.forEach(function(o) {
        o.position.z -= move;
        if (o.position.z < -14) o.position.z += SPAN;
    });
    if (st.car) {
        st.car.position.y = Math.abs(Math.sin(t * 9)) * 0.015;
        st.car.rotation.z = Math.sin(t * 0.7) * 0.02;
        st.car.position.x = 0.9 + Math.sin(t * 0.35) * 0.35;
        st.car.rotation.y = Math.PI - Math.cos(t * 0.35) * 0.04;
        st.wheels.forEach(function(w) { if (w.hub) w.hub.rotation.x += move / 0.24; });
        // иногда — рывок на нитро
        if (st.flames) st.flames.update(t, st.intro ? introNitro(t) : (t % 7) > 5.6);
    }
    // зверь иногда перебегает дорогу вдали
    st.nextCritter -= dt;
    // по одному зверю за раз — друг сквозь друга не проходят
    if (st.nextCritter <= 0 && st.critters.length === 0) { spawnCritter(); st.nextCritter = 2.5 + Math.random() * 3; }
    for (let i = st.critters.length - 1; i >= 0; i--) {
        const c = st.critters[i];
        c.t += dt;
        c.mesh.position.x += c.dir * CROSS_SPEED * dt;
        c.mesh.position.z -= move;
        c.mesh.position.y = Math.abs(Math.sin(c.t * 12)) * 0.07;
        c.mesh.traverse(function(n) { if (n.userData && n.userData.isLeg) n.rotation.x = Math.sin(c.t * 12 + (n.userData.legIndex === 0 || n.userData.legIndex === 3 ? 0 : Math.PI)) * 0.55; });
        if (Math.abs(c.mesh.position.x) > CROSS_X + 1 || c.mesh.position.z < 4) {
            st.scene.remove(c.mesh);
            st.critters.splice(i, 1);
        }
    }
    const cam = st.camera;
    if (st.intro && st.car) { introCamera(cam, st.car.position, t); return; }
    cam.position.set(2.4 + Math.sin(t * 0.21) * 0.4, 1.35 + Math.sin(t * 0.33) * 0.08, -5.2);
    // широкий экран: меню справа — машина слева от центра кадра (камера смотрит к +z: +x на экране слева)
    cam.lookAt(cam.aspect > 1.3 ? -2.6 : 0.6, 0.8, 6);
}

/**
 * Заставка: 4 плана по 4 с — машина крупно. Перёд машины — к +z (едет «от» мира к камере спереди).
 * Каждый план медленно «наезжает», чтобы кадр жил.
 */
const SHOT = 4;
function introCamera(cam, car, t) {
    const i = Math.floor(t / SHOT) % 4, k = (t % SHOT) / SHOT;
    const narrow = cam.aspect < 0.9; // телефон вертикально — отъехать, чтобы машина целиком влезла
    const far = narrow ? 1.5 : 1;
    let px, py, pz, lx = car.x, ly = 0.45, lz = car.z;
    if (i === 0) {        // спереди низко, 3/4 — машина «наезжает» на зрителя
        px = car.x + 1.6 * far; py = 0.45; pz = car.z + (3.6 - k * 0.8) * far; lz = car.z + 0.2;
    } else if (i === 1) { // сбоку, проводка вдоль машины
        px = car.x + 3.2 * far; py = 0.75; pz = car.z + (1.6 - k * 3.0) * far; ly = 0.5;
    } else if (i === 2) { // сзади низко — рывок на нитро
        px = car.x - 0.7 * far; py = 0.7; pz = car.z - (3.2 + k * 0.6) * far; lz = car.z + 3;
    } else {              // облёт сверху
        const a = 0.6 + k * 1.6;
        px = car.x + Math.sin(a) * 4.4 * far; py = 2.2 + k * 0.6; pz = car.z + Math.cos(a) * 4.4 * far;
    }
    cam.position.set(px, py, pz);
    cam.lookAt(lx, ly, lz);
}
function introNitro(t) {
    return Math.floor(t / SHOT) % 4 === 2 && (t % SHOT) > 1.2;
}

function loop() {
    if (!st || st.still) return;
    st.raf = requestAnimationFrame(loop);
    const now = performance.now();
    const dt = Math.min(0.05, (now - st.last) / 1000);
    st.last = now;
    step(dt);
    st.renderer.render(st.scene, st.camera);
}

/** Остановить и освободить всё (перед заездом и при уходе из меню) */
export function stopMenuBg() {
    if (!st) return;
    cancelAnimationFrame(st.raf);
    window.removeEventListener('resize', st.onResize);
    document.removeEventListener('visibilitychange', st.onVis);
    // материалы и геометрии зверей и щитов общие с заездом — их не трогаем (dispose отозвался бы
    // и в рендерере игры); у фона свой WebGL-контекст — его освобождение снимает всё с видеокарты
    try {
        st.renderer.dispose();
        st.renderer.forceContextLoss();
    } catch (e) {}
    try { st.renderer.domElement.remove(); } catch (e) {}
    document.body.classList.remove('menu-live');
    st = null;
}

export function menuBgRunning() { return !!st; }
