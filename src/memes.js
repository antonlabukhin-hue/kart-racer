/**
 * Мем-моменты 90-х вдоль дороги — то, что хочется заснять и показать другу. Только картинка, без аварий:
 *   попутки — «Буханка» с коровой на крыше, «Зубило» со шкафом на багажнике;
 *   обочина — бабка с тележкой-«кравчучкой» (катит по обочине), рыбак с удочками голосует,
 *   гаишник с радаром-«феном» в кустах (список MEMES).
 * Модели — низкополигональные, в стиле машин игры. Расстановка и смена — src/modes/infinite-run.js (pickMeme — чистая, с тестами).
 */
import * as THREE from 'three';

const mats = {};
function mat(hex, rough) {
    const k = hex + '|' + (rough || 0.8);
    if (!mats[k]) mats[k] = new THREE.MeshStandardMaterial({ color: hex, roughness: rough || 0.8, metalness: 0.05 });
    return mats[k];
}
function box(g, w, h, d, hex, x, y, z, rough) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(hex, rough));
    m.position.set(x, y, z); m.castShadow = true; g.add(m);
    return m;
}
function cyl(g, r0, r1, h, hex, x, y, z, n) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, h, n || 10), mat(hex));
    m.position.set(x, y, z); m.castShadow = true; g.add(m);
    return m;
}

/** Клетчатая сумка челнока — канвас-текстура «красно-синяя клетка» */
let checkTex = null;
function checkMat() {
    if (!checkTex) {
        const c = document.createElement('canvas'); c.width = c.height = 64;
        const x = c.getContext('2d');
        x.fillStyle = '#f2f2f2'; x.fillRect(0, 0, 64, 64);
        x.fillStyle = 'rgba(200,30,40,0.85)'; for (let i = 0; i < 64; i += 16) { x.fillRect(i, 0, 6, 64); x.fillRect(0, i, 64, 6); }
        x.fillStyle = 'rgba(30,60,170,0.75)'; for (let i = 8; i < 64; i += 16) { x.fillRect(i, 0, 3, 64); x.fillRect(0, i, 64, 3); }
        checkTex = new THREE.CanvasTexture(c); checkTex.colorSpace = THREE.SRGBColorSpace;
        checkTex.magFilter = THREE.NearestFilter;
    }
    return new THREE.MeshStandardMaterial({ map: checkTex, roughness: 0.9 });
}

/** Корова (смотрит в +z): чёрно-белая, розовый нос, рожки. ~1 м длиной */
export function createCow() {
    const g = new THREE.Group();
    box(g, 0.5, 0.42, 0.95, 0xf2f0ea, 0, 0.62, 0);                 // туловище
    box(g, 0.51, 0.2, 0.3, 0x1c1c1c, 0, 0.7, 0.15);                // пятна
    box(g, 0.3, 0.18, 0.22, 0x1c1c1c, 0.11, 0.62, -0.28);
    box(g, 0.3, 0.3, 0.32, 0xf2f0ea, 0, 0.78, 0.6);                // голова
    box(g, 0.31, 0.12, 0.14, 0x1c1c1c, 0, 0.88, 0.62);
    box(g, 0.24, 0.14, 0.1, 0xf4a6b4, 0, 0.7, 0.77);               // нос
    box(g, 0.05, 0.12, 0.05, 0xe8dcc0, 0.12, 0.98, 0.58); box(g, 0.05, 0.12, 0.05, 0xe8dcc0, -0.12, 0.98, 0.58); // рожки
    box(g, 0.1, 0.06, 0.08, 0x1c1c1c, 0.19, 0.86, 0.55); box(g, 0.1, 0.06, 0.08, 0x1c1c1c, -0.19, 0.86, 0.55); // уши
    [[0.16, 0.32], [-0.16, 0.32], [0.16, -0.32], [-0.16, -0.32]].forEach(function(p) { box(g, 0.1, 0.42, 0.1, 0xf2f0ea, p[0], 0.21, p[1]); box(g, 0.11, 0.06, 0.11, 0x2a2018, p[0], 0.03, p[1]); });
    box(g, 0.16, 0.08, 0.14, 0xf4a6b4, 0, 0.4, -0.12);             // вымя
    const tail = box(g, 0.04, 0.38, 0.04, 0xf2f0ea, 0, 0.56, -0.5); tail.rotation.x = 0.35;
    return g;
}

/** Бабка в платке (смотрит в +z), рядом — тележка-«кравчучка» с клетчатой сумкой */
export function createBabka() {
    const g = new THREE.Group();
    const coat = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.27, 0.62, 10), mat(0x3a4a6a)); coat.position.y = 0.48; coat.castShadow = true; g.add(coat);
    box(g, 0.1, 0.16, 0.12, 0x2a2018, 0.08, 0.08, 0.02); box(g, 0.1, 0.16, 0.12, 0x2a2018, -0.08, 0.08, 0.02); // боты
    box(g, 0.2, 0.2, 0.2, 0xe9c2a0, 0, 0.88, 0.02);                // лицо
    box(g, 0.26, 0.14, 0.24, 0xc22a2a, 0, 0.98, -0.01);            // платок
    box(g, 0.22, 0.2, 0.06, 0xc22a2a, 0, 0.86, -0.12);
    box(g, 0.08, 0.1, 0.08, 0xc22a2a, 0, 0.78, 0.13);              // узелок
    box(g, 0.08, 0.36, 0.09, 0x3a4a6a, 0.22, 0.6, 0.12).rotation.x = -0.6; // рука к тележке
    box(g, 0.08, 0.34, 0.09, 0x3a4a6a, -0.22, 0.56, 0).rotation.x = 0.15;
    // тележка: ручка, рама, два колеса, сумка в клетку
    const cart = new THREE.Group(); cart.position.set(0.3, 0, 0.42); g.add(cart);
    const handle = box(cart, 0.04, 0.52, 0.04, 0x9a9a9a, 0, 0.34, -0.1, 0.4); handle.rotation.x = -0.45;
box(cart, 0.16, 0.04, 0.04, 0x9a9a9a, 0, 0.57, -0.21, 0.4); // перекладина ручки
    box(cart, 0.26, 0.04, 0.2, 0x8a8a8a, 0, 0.1, 0.06, 0.4);
    const bag = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.36, 0.22), checkMat()); bag.position.set(0, 0.32, 0.06); bag.castShadow = true; cart.add(bag);
    [0.16, -0.16].forEach(function(x) { const w = cyl(cart, 0.08, 0.08, 0.04, 0x1a1a1a, x, 0.08, 0.06, 12); w.rotation.z = Math.PI / 2; });
    return g;
}

/** Рыбак с удочками и ведром голосует (поднятый большой палец), смотрит на дорогу (+x к дороге задаётся снаружи) */
export function createFisherman() {
    const g = new THREE.Group();
    box(g, 0.34, 0.5, 0.22, 0x4a5a2a, 0, 0.75, 0);                 // ватник цвета хаки
    box(g, 0.13, 0.5, 0.15, 0x2a2a30, 0.08, 0.25, 0); box(g, 0.13, 0.5, 0.15, 0x2a2a30, -0.08, 0.25, 0); // штаны и сапоги
    box(g, 0.14, 0.12, 0.2, 0x1e2a1a, 0.08, 0.06, 0.03); box(g, 0.14, 0.12, 0.2, 0x1e2a1a, -0.08, 0.06, 0.03);
    box(g, 0.2, 0.2, 0.2, 0xe2b48e, 0, 1.12, 0);                   // лицо
    box(g, 0.24, 0.07, 0.24, 0x2f3a24, 0, 1.24, 0); box(g, 0.16, 0.03, 0.12, 0x2f3a24, 0, 1.2, 0.15); // кепка с козырьком
    const arm = box(g, 0.09, 0.4, 0.1, 0x4a5a2a, 0.3, 1.0, 0.04); arm.rotation.z = 1.0; // рука в сторону — голосует (дорога — справа, +x)
    box(g, 0.08, 0.09, 0.08, 0xe2b48e, 0.48, 1.12, 0.04);          // кулак
    box(g, 0.035, 0.09, 0.035, 0xe2b48e, 0.48, 1.2, 0.04);         // большой палец вверх
    box(g, 0.09, 0.36, 0.1, 0x4a5a2a, -0.22, 0.7, 0.05);            // другая рука — удочки
    [0, 0.07].forEach(function(dx) { const r = cyl(g, 0.012, 0.02, 2.2, 0x6a4a2a, -0.3 + dx, 1.5, -0.15, 6); r.rotation.x = -0.35; r.rotation.z = 0.12; });
    const b = cyl(g, 0.13, 0.1, 0.24, 0x8a96a2, -0.45, 0.12, 0.2, 12); b.material = mat(0x8a96a2, 0.35); // ведро
    return g;
}

/** Гаишник в кустах с радаром-«феном» и полосатым жезлом */
export function createGaishnik() {
    const g = new THREE.Group();
    box(g, 0.34, 0.52, 0.22, 0x6a7072, 0, 0.78, 0);                // серая форма
    box(g, 0.36, 0.06, 0.24, 0xf2f2f2, 0, 0.62, 0);                // белая портупея
    box(g, 0.13, 0.52, 0.15, 0x3a3e40, 0.08, 0.26, 0); box(g, 0.13, 0.52, 0.15, 0x3a3e40, -0.08, 0.26, 0);
    box(g, 0.2, 0.2, 0.2, 0xe2b48e, 0, 1.15, 0);
    box(g, 0.28, 0.06, 0.28, 0x3a3e40, 0, 1.27, 0); box(g, 0.2, 0.08, 0.2, 0xf2f2f2, 0, 1.32, 0); // фуражка
    box(g, 0.18, 0.025, 0.1, 0x1a1a1a, 0, 1.24, 0.15);
    const arm = box(g, 0.09, 0.36, 0.1, 0x6a7072, 0.2, 1.0, 0.14); arm.rotation.x = -1.35; // рука с радаром — на дорогу
    box(g, 0.1, 0.14, 0.26, 0x1a1a1a, 0.2, 1.06, 0.38);            // радар-«фен»
    box(g, 0.08, 0.08, 0.06, 0x3a3a3a, 0.2, 1.06, 0.53);
    const st = new THREE.Group(); st.position.set(-0.24, 0.72, 0.06); st.rotation.z = 0.25; g.add(st); // жезл
    for (let i = 0; i < 6; i++) box(st, 0.045, 0.08, 0.045, i % 2 ? 0xf2f2f2 : 0x1a1a1a, 0, i * 0.08 - 0.2, 0);
    // куст спереди — прячется
    [[0.05, 0.3, 0.42, 0.42], [0.35, 0.22, 0.38, 0.32], [-0.3, 0.24, 0.36, 0.34]].forEach(function(b) {
        const m = new THREE.Mesh(new THREE.IcosahedronGeometry(b[3], 0), mat(0x3e6a2a)); m.position.set(b[0], b[1], b[2]); m.castShadow = true; g.add(m);
    });
    return g;
}

/** Шкаф на крышу «Зубила»: полированный, с зеркалом, примотан верёвкой */
export function createWardrobe() {
    const g = new THREE.Group();
    box(g, 0.55, 0.32, 1.0, 0x6a3a1e, 0, 0.16, 0, 0.45);
    box(g, 0.56, 0.02, 0.02, 0x1a1a1a, 0, 0.33, 0.1); box(g, 0.56, 0.02, 0.02, 0x1a1a1a, 0, 0.33, -0.2); // верёвки
    box(g, 0.02, 0.2, 0.36, 0xbfd6e6, 0.28, 0.16, 0.18, 0.1);      // зеркало на дверце
    return g;
}

export const MEMES = [
    { id: 'cow_bus', kind: 'car', car: 'buhanka', w: 3 },      // «Буханка» с коровой на крыше
    { id: 'wardrobe', kind: 'car', car: 'zubilo', w: 2 },      // «Зубило» со шкафом на крыше
    { id: 'babka', kind: 'side', w: 3 },                       // бабка с тележкой — катит по обочине
    { id: 'fisher', kind: 'side', w: 2 },                      // рыбак с удочками голосует
    { id: 'gai', kind: 'side', w: 2 }                          // гаишник с радаром в кустах
];
export const MEME_EVERY = [380, 620]; // метров между мем-моментами

/** Следующий мем: взвешенно, не тот же, что прошлый. rnd — генератор 0..1; sideOnly — только обочина (честный заезд: попутки не трогаем) */
export function pickMeme(prevId, rnd, sideOnly) {
    const r = rnd || Math.random;
    const list = MEMES.filter(function(m) { return m.id !== prevId && (!sideOnly || m.kind === 'side'); });
    const sum = list.reduce(function(s, m) { return s + m.w; }, 0);
    let t = r() * sum;
    for (let i = 0; i < list.length; i++) { t -= list[i].w; if (t <= 0) return list[i]; }
    return list[list.length - 1];
}

/** Модель мема на обочине по id */
export function createSideMeme(id) {
    return id === 'babka' ? createBabka() : id === 'fisher' ? createFisherman() : createGaishnik();
}

/** Мем на крышу попутки: корова на «Буханку», шкаф на «Зубило». group — модель машины (смотрит в +z), ставим по габаритам крыши */
export function decorateMemeCar(group, id) {
    // габарит — только по видимым деталям: у машины в группе есть скрытые детали тюнинга (багажник, дуги…)
    const bb = new THREE.Box3(), tmp = new THREE.Box3();
    group.updateMatrixWorld(true);
    group.traverse(function(o) { let v = o.visible; for (let p = o.parent; p && v; p = p.parent) v = p.visible; if (o.isMesh && v) bb.union(tmp.setFromObject(o)); });
    const top = bb.max.y, cz = (bb.min.z + bb.max.z) / 2, len = bb.max.z - bb.min.z;
    const load = id === 'cow_bus' ? createCow() : createWardrobe();
    if (id === 'cow_bus') load.scale.setScalar(Math.min(1.25, len * 0.8)); // корова крупнее — видно с дороги
    load.position.set(0, top - 0.02, cz - (id === 'cow_bus' ? len * 0.05 : 0));
    load.userData.memeLoad = true;
    group.add(load);
    return load;
}
