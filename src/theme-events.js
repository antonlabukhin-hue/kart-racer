/**
 * Событие пейзажа бесконечной трассы: у каждого пейзажа — своё испытание посреди него (как «этап» в раннерах),
 * а не только другой цвет неба. Проехал событие без аварии — награда «Е» и рисковое действие.
 *   Арсеньев — свадебный кортеж в одной полосе (обгони всех), Промзона — прорвало трубу (кислота в двух полосах),
 *   Тайга — метель (белая мгла), Ночь — свет погас (темнота), Свалка — кран сбрасывает хлам (тень → падение),
 *   Дождь — ливень (лужи-скольжение и мгла), Джунгли — стадо слонов (перебегают волнами),
 *   Деревня — куры на дороге, Микрорайон — час пик (машины стоят в двух полосах).
 * Расписание и выбор полос — чистые функции (с тестами); сцену трогает host из main.js.
 */
import * as THREE from 'three';
import { themeAt, getThemeStart, THEME_LEN } from './infinite.js';

export const EVENT_AT = 380;      // с какого места пейзажа начинается событие, ед.
export const EVENT_REWARD = 30;   // «Е» за событие без аварии
export const THEME_EVENTS = {
    day: { id: 'convoy', icon: '💒', name: 'СВАДЕБНЫЙ КОРТЕЖ', sub: 'Кортеж едет по одной полосе — обгони всех', len: 220, done: 'Обогнал кортеж!' },
    village: { id: 'hens', icon: '🐔', name: 'КУРЫ НА ДОРОГЕ', sub: 'Деревенские куры бегут через трассу — объезжай', len: 220, done: 'Ни одной курицы не задел!' },
    city: { id: 'jam', icon: '🚦', name: 'ЧАС ПИК', sub: 'Пробка в двух полосах — ищи свободную', len: 240, done: 'Пробку проскочил!' },
    promzona: { id: 'acid', icon: '☣', name: 'ПРОРВАЛО ТРУБУ', sub: 'Кислота разлилась — держись свободной полосы', len: 240, done: 'Проскочил кислоту!' },
    snow: { id: 'blizzard', icon: '🌨', name: 'МЕТЕЛЬ', sub: 'Ничего не видно — смотри в оба', len: 260, done: 'Пережил метель!' },
    night: { id: 'blackout', icon: '🌑', name: 'СВЕТ ПОГАС', sub: 'Фонари отключили — едем по фарам', len: 260, done: 'Проехал в темноте!' },
    svalka: { id: 'junk', icon: '🏗', name: 'КРАН СБРАСЫВАЕТ ХЛАМ', sub: 'Где красная тень — туда упадёт', len: 240, done: 'Увернулся от хлама!' },
    rain: { id: 'puddles', icon: '🌧', name: 'ЛИВЕНЬ', sub: 'Лужи — занесёт; объезжай по «Е»', len: 240, done: 'Пережил ливень!' },
    jungle: { id: 'herd', icon: '🐘', name: 'СТАДО СЛОНОВ', sub: 'Перебегают волнами — тормози или проскакивай', len: 240, done: 'Прорвался сквозь стадо!' }
};

/**
 * Какое событие на расстоянии dist: { ev, key, d0, d1, k } (k 0..1 — пройденная доля) или null.
 * key — номер пейзажа по счёту (событие в каждом пейзаже — один раз).
 */
export function eventAt(dist) {
    const t = themeAt(dist);
    const ev = THEME_EVENTS[t.theme.id];
    if (!ev) return null;
    const into = (Math.max(0, dist || 0) + getThemeStart() * THEME_LEN) - t.index * THEME_LEN;
    if (into < EVENT_AT || into > EVENT_AT + ev.len) return null;
    const d0 = dist - (into - EVENT_AT);
    if (d0 < 150) return null; // самое начало заезда — без события
    return { ev: ev, key: t.index, d0: d0, d1: d0 + ev.len, k: (into - EVENT_AT) / ev.len };
}

/**
 * Ряд опасностей: свободная полоса — рядом с прошлой свободной (не дальше одной полосы — успеешь перестроиться),
 * busy — полосы, где на этом месте уже что-то стоит (узор, одиночка): свободной они быть не могут, перекрывать их не нужно.
 * Возвращает { free, block: [..] } или null — свободной рядом нет, ряд пропускаем.
 */
export function rowLanes(prevFree, busy, rnd) {
    const r = rnd || Math.random;
    const b = busy || [];
    const cand = [prevFree - 1, prevFree, prevFree + 1].filter(function(l) { return l >= 0 && l <= 2 && b.indexOf(l) < 0; });
    if (!cand.length) return null;
    const free = cand[Math.floor(r() * cand.length)];
    return { free: free, block: [0, 1, 2].filter(function(l) { return l !== free && b.indexOf(l) < 0; }) };
}

/** Сила мглы в событии: плавно наползает за первые 40 ед. и уходит за последние 40 */
export function hazeK(e) {
    if (!e) return 0;
    const into = e.k * e.ev.len, left = e.ev.len - into;
    return Math.max(0, Math.min(1, into / 40, left / 40));
}

// ---- меши ----
function balloons() {
    const g = new THREE.Group();
    [0xff6aa8, 0xffffff, 0xff2a6a].forEach(function(c, i) {
        const b = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), new THREE.MeshStandardMaterial({ color: c, roughness: 0.35, emissive: c, emissiveIntensity: 0.15 }));
        b.position.set(-0.3 + i * 0.3, 2.0 + (i % 2) * 0.25, 0.4);
        const s = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.9, 3), new THREE.MeshBasicMaterial({ color: 0xeeeeee }));
        s.position.set(-0.15 + i * 0.15, 1.45, 0.4);
        g.add(b, s);
    });
    const ribbon = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, 1.6), new THREE.MeshStandardMaterial({ color: 0xff4f8b }));
    ribbon.position.set(0, 1.25, 0);
    g.add(ribbon);
    return g;
}
function shadowRing() {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.45, 1.05, 24), new THREE.MeshBasicMaterial({ color: 0xff2a2a, transparent: true, opacity: 0.75, depthWrite: false }));
    m.rotation.x = -Math.PI / 2;
    m.position.y = 0.03;
    return m;
}

/**
 * host: { scene, LX, obstacles, cars, addObstacle(type, x, z, label) → obs, addCar(z, lane) → car, removeCar(car),
 *         addAnimal(typeId, z, fromLeft), fog, lights: { ambient, hemi, sun }, strikes() → число,
 *         plaque(title, sub, cls), popup(text), reward(e) — «Е» и рисковое действие, scrap(x, z) → меш хлама }
 * tick(dist, zPos, dt) — каждый кадр после infWorld.tick (мгла и свет поверх пейзажа).
 */
export function createThemeEvents(host) {
    let cur = null, keyDone = -1, strikes0 = 0, next = 0, free = 1, convoy = [], falls = [], rings = [];
    const LX = host.LX || [-2, 0, 2];
    const fogBase = { near: 0, far: 0 };

    function start(e) {
        cur = e; keyDone = e.key; strikes0 = host.strikes(); next = e.d0 + 40; free = Math.floor(Math.random() * 3);
        try { host.plaque(e.ev.icon + ' ' + e.ev.name, e.ev.sub, 'crate-bad'); } catch (err) {}
        if (e.ev.id === 'convoy') {
            const lane = Math.floor(Math.random() * 3);
            for (let i = 0; i < 4; i++) {
                const c = host.addCar(host.zAhead(70 + i * 9), lane);
                c.speed = 0.012; c.laneChangeTimer = 1e9; c.convoy = true;
                const b = balloons(); c.mesh.add(b); c._balloons = b;
                convoy.push(c);
            }
        }
    }
    function finish() {
        const ok = host.strikes() === strikes0;
        if (ok) { try { host.reward(EVENT_REWARD); host.plaque('✔ ' + cur.ev.done, '+' + EVENT_REWARD + ' Е за ' + cur.ev.name.toLowerCase(), 'crate-good'); } catch (err) {} }
        convoy.forEach(function(c) { host.removeCar(c); });
        rings.forEach(function(r) { host.scene.remove(r.m); });
        convoy = []; rings = []; falls = [];
        cur = null;
        return ok;
    }
    // ряд опасностей впереди: d — где (расстояние от старта), z — его координата
    function row(z) {
        const near = function(l) { return (host.obstacles || []).some(function(o) { return o.active && Math.abs(o.z - z) < 6 && Math.abs(o.x - LX[l]) < 1.1; }); };
        const busy = [0, 1, 2].filter(near);
        const rl = rowLanes(free, busy);
        if (!rl) return;
        free = rl.free;
        const id = cur.ev.id;
        if (id === 'acid' || id === 'puddles') {
            rl.block.forEach(function(l) {
                [-0.5, 0.5].forEach(function(dx) { host.addObstacle(id === 'acid' ? 'acid' : 'ice', LX[l] + dx, z, id === 'acid' ? 'Кислота!' : 'Лужа!'); });
            });
            host.addE(LX[free], z + 3, 4);
        } else if (id === 'junk') {
            // хлам — в одну-две полосы: тень сейчас, падение — когда машина в 26 ед.
            const lanes = Math.random() < 0.5 ? rl.block.slice(0, 1) : rl.block;
            lanes.forEach(function(l) {
                const m = shadowRing(); m.position.set(LX[l], 0.03, z); host.scene.add(m);
                rings.push({ m: m, x: LX[l], z: z, fallen: false, t: 0 });
            });
        } else if (id === 'jam') {
            rl.block.forEach(function(l) { const c = host.addCar(z, l); c.speed = 0.004; c.laneChangeTimer = 1e9; convoy.push(c); });
        } else if (id === 'hens') {
            const left = Math.random() < 0.5;
            for (let k = 0; k < 3; k++) host.addAnimal('CHICKEN', z - k * 2.5, left);
        } else if (id === 'herd') {
            const left = Math.random() < 0.5;
            host.addAnimal('ELEPHANT', z, left);
            host.addAnimal('ELEPHANT', z - 14, !left);
        }
    }

    return {
        get active() { return cur; },
        tick: function(dist, zPos, dt) {
            const e = eventAt(dist);
            if (!cur && e && e.key !== keyDone) start(e);
            if (cur && (!e || e.key !== cur.key)) finish();
            // мгла и свет — поверх пейзажа (infWorld.tick уже выставил свои)
            const k = hazeK(cur && e);
            const id = cur && cur.ev.id;
            if (k > 0 && host.fog && (id === 'blizzard' || id === 'blackout' || id === 'puddles')) {
                const col = id === 'blizzard' ? 0xeef3f8 : id === 'blackout' ? 0x03050a : 0x56626c;
                const far = id === 'blizzard' ? 42 : id === 'blackout' ? 46 : 70;
                host.fog.color.lerp(new THREE.Color(col), k);
                host.fog.near = host.fog.near + (Math.min(host.fog.near, 6) - host.fog.near) * k;
                host.fog.far = host.fog.far + (far - host.fog.far) * k;
                if (host.bg && host.bg.isColor) host.bg.lerp(new THREE.Color(col), k);
                if (id === 'blackout' && host.lights) ['ambient', 'hemi', 'sun'].forEach(function(n) { const L = host.lights[n]; if (L) L.intensity *= 1 - 0.55 * k; });
            }
            if (!cur) return null;
            // ряды опасностей — впереди, за 65 ед.
            if (id === 'acid' || id === 'puddles' || id === 'junk' || id === 'herd' || id === 'jam' || id === 'hens') {
                const step = id === 'herd' ? 60 : id === 'hens' ? 45 : id === 'jam' ? 34 : id === 'junk' ? 30 : 28;
                while (next < cur.d1 - 20 && next < dist + 65) { row(zPos - (next - dist)); next += step; }
            }
            // хлам падает, когда машина подъезжает
            for (let i = rings.length - 1; i >= 0; i--) {
                const r = rings[i];
                r.m.material.opacity = 0.45 + 0.35 * Math.abs(Math.sin(performance.now() * 0.012));
                if (!r.fallen && zPos - r.z < 26 && zPos - r.z > 0) {
                    r.fallen = true;
                    const pile = host.scrap(); pile.position.set(r.x, 6, r.z); host.scene.add(pile);
                    falls.push({ m: pile, x: r.x, z: r.z, v: 0, ring: r });
                }
                if (zPos < r.z - 10) { host.scene.remove(r.m); rings.splice(i, 1); }
            }
            for (let i = falls.length - 1; i >= 0; i--) {
                const f = falls[i];
                f.v += 30 * dt; f.m.position.y = Math.max(0, f.m.position.y - f.v * dt);
                if (f.m.position.y === 0) { host.scene.remove(f.ring.m); const o = host.addObstacle('bump', f.x, f.z, 'Хлам!'); o.mesh.add(f.m); f.m.position.set(0, 0, 0); falls.splice(i, 1); }
            }
            return cur;
        },
        finish: function() { if (cur) finish(); }
    };
}
