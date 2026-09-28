/**
 * Живой 3D-фон главного меню: машина игрока (его модель и краска) мчит навстречу камере
 * по закатной трассе, мимо леса и рекламных щитов 90-х; иногда дорогу перебегает зверь.
 * Всё из тех же моделей и материалов, что и в заезде — один стиль с игрой.
 * Работает только пока открыто меню (stopMenuBg — всё освобождает). На «низком» качестве
 * и при «уменьшении движения» — один неподвижный кадр.
 */
import * as THREE from 'three';
import { buildShowroomCar } from './cars.js';
import { CAR_PAINTS } from './content.js';
import { createSmashBoard } from './smash.js';

const ROAD_W = 6;
const SPEED = 16;          // ед./с — скорость «прокрутки» мира
const SPAN = 150;          // длина петли декораций
const CAR_ANIMALS = ['DOG', 'FOX', 'DEER', 'BOAR', 'BEAR'];

let st = null;

function roadTexture() {
    const cv = document.createElement('canvas');
    cv.width = 256; cv.height = 256;
    const cx = cv.getContext('2d');
    cx.fillStyle = '#3b3a40'; cx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 900; i++) { // зерно асфальта
        const v = 50 + Math.random() * 30 | 0;
        cx.fillStyle = 'rgba(' + v + ',' + v + ',' + (v + 6) + ',0.55)';
        cx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
    }
    cx.fillStyle = '#f2efe6'; // пунктир между полосами (x = ±1 из 6 → 85 и 171 px)
    [85, 171].forEach(function(x) { cx.fillRect(x - 3, 20, 6, 110); });
    // бордюр: красно-белые полосы по краям
    for (let y = 0; y < 256; y += 64) {
        cx.fillStyle = '#d8261b'; cx.fillRect(0, y, 10, 32); cx.fillRect(246, y, 10, 32);
        cx.fillStyle = '#f4f1ea'; cx.fillRect(0, y + 32, 10, 32); cx.fillRect(246, y + 32, 10, 32);
    }
    const tex = new THREE.CanvasTexture(cv);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 30);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
}

function skyDome() {
    const geo = new THREE.SphereGeometry(300, 24, 12);
    const mat = new THREE.ShaderMaterial({
        side: THREE.BackSide, depthWrite: false, fog: false,
        uniforms: { top: { value: new THREE.Color(0x2b2345) }, mid: { value: new THREE.Color(0xd9785a) }, bottom: { value: new THREE.Color(0xffc27a) } },
        vertexShader: 'varying float h; void main(){ h = normalize(position).y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader: 'uniform vec3 top; uniform vec3 mid; uniform vec3 bottom; varying float h;'
            + 'void main(){ vec3 c = h > 0.12 ? mix(mid, top, smoothstep(0.12, 0.6, h)) : mix(bottom, mid, smoothstep(-0.05, 0.12, h)); gl_FragColor = vec4(c, 1.0); }'
    });
    return new THREE.Mesh(geo, mat);
}

function makeTree(kind) {
    const g = new THREE.Group();
    if (kind === 'pine') {
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.13, 1.6, 6), st.mats.trunk);
        trunk.position.y = 0.8; g.add(trunk);
        for (let i = 0; i < 4; i++) {
            const c = new THREE.Mesh(new THREE.ConeGeometry(0.75 - i * 0.14, 0.8 - i * 0.1, 8), st.mats.pine);
            c.position.y = 1.3 + i * 0.45; g.add(c);
        }
    } else {
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 2.0, 6), st.mats.birch);
        trunk.position.y = 1.0; g.add(trunk);
        [[0, 2.3, 0, 0.7], [0.3, 2.0, 0.1, 0.5], [-0.28, 2.05, -0.1, 0.5]].forEach(function(c) {
            const m = new THREE.Mesh(new THREE.IcosahedronGeometry(c[3], 0), st.mats.leaf);
            m.position.set(c[0], c[1], c[2]); g.add(m);
        });
    }
    return g;
}

function paintColor(profile, carId) {
    try {
        const lo = profile && profile.carLoadout;
        const id = lo && ((lo.paintByCar && lo.paintByCar[carId]) || null);
        const p = id && CAR_PAINTS.find(function(x) { return x.id === id; });
        return p && p.color != null ? p.color : null;
    } catch (e) { return null; }
}

/** Запустить фон (idempotent). opts: { carId, profile, still } */
export function startMenuBg(opts) {
    const o = opts || {};
    if (st) { if (o.carId && o.carId !== st.carId) { stopMenuBg(); } else return; }
    let renderer;
    try {
        renderer = new THREE.WebGLRenderer({ antialias: !o.lowPower, alpha: false, powerPreference: 'low-power' });
    } catch (e) { return; }
    const canvas = renderer.domElement;
    canvas.id = 'menu-bg';
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, o.lowPower ? 1 : 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    document.body.appendChild(canvas);
    document.body.classList.add('menu-live');

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xe8a070, 26, 120);
    const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 400);

    st = {
        renderer: renderer, scene: scene, camera: camera, carId: o.carId || 'cheburashka', raf: 0, t: 0, last: performance.now(),
        still: !!o.still, deco: [], critters: [], nextCritter: 1.5,
        mats: {
            trunk: new THREE.MeshLambertMaterial({ color: 0x8a4a22 }), pine: new THREE.MeshLambertMaterial({ color: 0x24522c }),
            birch: new THREE.MeshLambertMaterial({ color: 0xe8e4d8 }), leaf: new THREE.MeshLambertMaterial({ color: 0x5a8a34 }),
            pole: new THREE.MeshLambertMaterial({ color: 0x5b5b62 })
        }
    };
    scene.add(skyDome());
    scene.add(new THREE.HemisphereLight(0xffe2c4, 0x4a3a2a, 1.0));
    const sun = new THREE.DirectionalLight(0xffb27a, 2.2);
    sun.position.set(-6, 5, 30);
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0x8fa8ff, 0.5);
    fill.position.set(6, 4, -10);
    scene.add(fill);

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(420, 420), new THREE.MeshLambertMaterial({ color: 0x9a7a55 }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, -0.01, 100);
    scene.add(ground);
    st.roadTex = roadTexture();
    const road = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_W, 240), new THREE.MeshLambertMaterial({ map: st.roadTex }));
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0, 100);
    scene.add(road);

    // лес, столбы и щиты вдоль дороги — едут навстречу и возвращаются в конец петли
    for (let i = 0; i < 46; i++) {
        const side = i % 2 ? 1 : -1;
        const t = makeTree(Math.random() < 0.62 ? 'pine' : 'birch');
        t.scale.setScalar(0.9 + Math.random() * 0.9);
        t.position.set(side * (ROAD_W / 2 + 3 + Math.random() * 16), 0, -12 + Math.random() * SPAN);
        t.rotation.y = Math.random() * 6.28;
        scene.add(t);
        st.deco.push(t);
    }
    for (let i = 0; i < 10; i++) {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 3.2, 6), st.mats.pole);
        pole.position.set((i % 2 ? 1 : -1) * (ROAD_W / 2 + 1.1), 1.6, -12 + i * (SPAN / 10));
        scene.add(pole);
        st.deco.push(pole);
    }
    for (let i = 0; i < 3; i++) {
        const b = createSmashBoard(0, 0, i * 2);
        b.group.scale.setScalar(1.6);
        b.group.rotation.y = Math.PI; // лицом к камере
        b.group.position.set((i % 2 ? 1 : -1) * (ROAD_W / 2 + 2.6), 0, 20 + i * 45);
        scene.add(b.group);
        st.deco.push(b.group);
    }

    // машина игрока
    try {
        const built = buildShowroomCar(st.carId);
        const pc = paintColor(o.profile, st.carId);
        if (pc != null && built.bodyMat) built.bodyMat.color.setHex(pc);
        st.car = built.group;
        st.wheels = (built.upgrades && built.upgrades.wheels) || [];
        st.car.position.set(0.9, 0, 0);
        scene.add(st.car);
    } catch (e) { st.car = null; st.wheels = []; }

    const onResize = function() {
        if (!st) return;
        renderer.setSize(window.innerWidth, window.innerHeight, false);
        camera.aspect = window.innerWidth / window.innerHeight;
        // узкий экран — камера дальше, чтобы машина помещалась
        camera.fov = camera.aspect < 0.9 ? 58 : 42;
        camera.updateProjectionMatrix();
    };
    st.onResize = onResize;
    window.addEventListener('resize', onResize);
    onResize();
    st.onVis = function() { if (!st) return; if (document.hidden) cancelAnimationFrame(st.raf); else { st.last = performance.now(); loop(); } };
    document.addEventListener('visibilitychange', st.onVis);

    step(st.still ? 0 : 0.016);
    renderer.render(scene, camera);
    if (!st.still) loop();
}

function spawnCritter() {
    const mk = typeof window !== 'undefined' && window.createAnimalMesh;
    if (!mk) return;
    try {
        const kind = CAR_ANIMALS[Math.floor(Math.random() * CAR_ANIMALS.length)];
        const m = mk(kind);
        const dir = Math.random() < 0.5 ? 1 : -1;
        m.visible = true;
        m.rotation.y = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
        m.position.set(-dir * 11, 0, 34 + Math.random() * 14);
        st.scene.add(m);
        st.critters.push({ mesh: m, dir: dir, t: 0 });
    } catch (e) {}
}

function step(dt) {
    st.t += dt;
    const t = st.t;
    const move = SPEED * dt;
    st.roadTex.offset.y -= move / 8;           // 240 ед. / 30 повторов = 8 ед. на повтор
    st.deco.forEach(function(d) {
        d.position.z -= move;
        if (d.position.z < -14) d.position.z += SPAN;
    });
    if (st.car) {
        st.car.position.y = Math.abs(Math.sin(t * 9)) * 0.015;
        st.car.rotation.z = Math.sin(t * 0.7) * 0.02;
        st.car.position.x = 0.9 + Math.sin(t * 0.35) * 0.35;
        st.car.rotation.y = -Math.cos(t * 0.35) * 0.04;
        st.wheels.forEach(function(w) { w.tire.rotation.x -= move / 0.34; w.disc.rotation.x -= move / 0.34; });
    }
    // зверь иногда перебегает дорогу вдали
    st.nextCritter -= dt;
    if (st.nextCritter <= 0 && st.critters.length < 2) { spawnCritter(); st.nextCritter = 3.5 + Math.random() * 3; }
    for (let i = st.critters.length - 1; i >= 0; i--) {
        const c = st.critters[i];
        c.t += dt;
        c.mesh.position.x += c.dir * 5.5 * dt;
        c.mesh.position.z -= move;
        c.mesh.position.y = Math.abs(Math.sin(c.t * 12)) * 0.07;
        c.mesh.traverse(function(n) { if (n.userData && n.userData.isLeg) n.rotation.x = Math.sin(c.t * 12 + (n.userData.legIndex === 0 || n.userData.legIndex === 3 ? 0 : Math.PI)) * 0.55; });
        if (Math.abs(c.mesh.position.x) > 12 || c.mesh.position.z < -10) {
            st.scene.remove(c.mesh);
            st.critters.splice(i, 1);
        }
    }
    const cam = st.camera;
    cam.position.set(2.6 + Math.sin(t * 0.21) * 0.5, 1.2 + Math.sin(t * 0.33) * 0.08, -5.4);
    // широкий экран: меню слева — машина справа от центра кадра
    cam.lookAt(cam.aspect > 1.3 ? 3.4 : 0.2, 0.75, 3.5);
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
