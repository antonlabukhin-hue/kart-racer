/**
 * Слипстрим и нитро по кнопке (бесконечная трасса) — глагол машины, которого нет у бегунов:
 *   держишься в «мешке» за попуткой (та же полоса, SLIP_NEAR..SLIP_FAR впереди) — копится бак нитро, чем ближе, тем быстрее;
 *   вышел из-за неё в последний момент (просидел в мешке ≥ SLIP_MIN с и был ближе SLING_DZ) — «Рывок»: короткое нитро и рисковое действие;
 *   «на волоске» тоже доливает бак; полный бак — нитро по кнопке (E / 🔥 на экране / X на геймпаде): когда жать — решает игрок.
 * Трафик из препятствия становится ресурсом: попутки ищешь, а не только объезжаешь.
 * Логика — чистая (с тестами); кнопка и шлейф воздуха — здесь же.
 */
import * as THREE from 'three';

export const SLIP_NEAR = 2.2;   // ближе — бампер в бампер: бак копится по максимуму, а уйти вбок здесь — лучший «Рывок»
export const SLIP_MIN_DZ = 0.4; // ещё ближе — это уже удар
export const SLIP_FAR = 18;     // дальше — воздух уже спокойный (попутки почти стоят относительно нас: мешок проезжается за ~1 с)
export const SLIP_HW = 0.9;     // насколько по x можно отойти от оси попутки и остаться в мешке
export const SLIP_RATE = 0.2;   // бак в секунду на дальнем краю мешка; у бампера — ×(1 + SLIP_CLOSE)
export const SLIP_CLOSE = 2;
export const SLIP_MIN = 0.3;    // с в мешке, чтобы выход дал «Рывок»
export const SLING_DZ = 7;      // и при выходе попутка была ближе стольких ед.
export const SLING_MOVE = 0.5;  // ушёл вбок сам (попутка перестроилась — не «Рывок»)
export const SLING_TIME = 0.8;  // с нитро за «Рывок»
export const NM_CHARGE = 0.15;  // бак за «на волоске»
export const HINT_KEY = 'road_racing_slip_hint'; // первая подсказка про мешок — раз на устройство

/** Показать ли подсказку «за попуткой копится нитро»: впервые набрал в мешке заметно (storage — localStorage) */
export function slipHintDue(s, storage) {
    if (!(s.charge > 0.12) || !s.car || s.hinted) return false;
    s.hinted = true;
    try { if (storage.getItem(HINT_KEY)) return false; storage.setItem(HINT_KEY, '1'); } catch (e) { return false; }
    return true;
}

export function createSlip() {
    return { charge: 0, car: null, t: 0, dz: 99, k: 0, ready: false, slips: 0, uses: 0, slungAt: -9 };
}

/** Попутка, за которой машина сейчас в мешке: { car, dz } | null (ближайшая в своей полосе) */
export function draftTarget(cars, x, z) {
    let best = null, bdz = SLIP_FAR + 1;
    for (let i = 0; cars && i < cars.length; i++) {
        const c = cars[i];
        if (!c || c._fly || c.hitCooldown > 0) continue; // снесённая / только что задетая — не мешок
        const dz = z - c.z; // > 0 — впереди (трасса идёт к −z)
        if (dz < SLIP_MIN_DZ || dz > SLIP_FAR || Math.abs(c.x - x) > SLIP_HW) continue;
        if (dz < bdz) { bdz = dz; best = c; }
    }
    return best ? { car: best, dz: bdz } : null;
}

/**
 * Кадр: on — можно ли сейчас копить (бесконечная трасса, едем, не «В ударе» и не на транспорте).
 * Возвращает { drafting, k (0..1 — насколько плотно в мешке), sling (true — «Рывок» в этом кадре), ready (бак только что заполнился) }.
 */
export function stepSlip(s, cars, x, z, dt, on) {
    const out = { drafting: false, k: 0, sling: false, ready: false };
    s.now = (s.now || 0) + (dt || 0);
    if (!on) { s.car = null; s.t = 0; s.k = 0; return out; }
    const d = draftTarget(cars, x, z);
    if (d) {
        const k = Math.min(1, 1 - (d.dz - SLIP_NEAR) / (SLIP_FAR - SLIP_NEAR));
        s.charge = Math.min(1, s.charge + dt * SLIP_RATE * (1 + SLIP_CLOSE * k));
        if (d.car !== s.car) s.x0 = x; // где был игрок, когда сел в мешок
        s.t = d.car === s.car ? s.t + dt : dt;
        s.car = d.car; s.dz = d.dz; s.k = k;
        out.drafting = true; out.k = k;
    } else {
        const c = s.car;
        // вышел из мешка вбок сам, пока попутка ещё впереди или рядом, — «Рывок»; отстал, врезался или она ушла из полосы — нет
        if (c && s.t >= SLIP_MIN && s.dz < SLING_DZ && Math.abs(c.x - x) > SLIP_HW && Math.abs(x - s.x0) > SLING_MOVE && z - c.z > -3 && !(c.hitCooldown > 0)) {
            out.sling = true; s.slips++; s.slungAt = s.now || 0;
        }
        s.car = null; s.t = 0; s.k = 0;
    }
    if (!s.ready && s.charge >= 1) { s.ready = true; out.ready = true; }
    return out;
}

/** «На волоске» сразу после «Рывка» — одна надпись на двоих */
export function justSlung(s, within) { return (s.now || 0) - s.slungAt <= (within || 1.2); }

export function addSlipCharge(s, v) {
    s.charge = Math.min(1, s.charge + (v || 0));
    return s.charge;
}

/** Нажали «нитро»: true — бак был полон и потрачен */
export function useNitro(s) {
    if (!(s.charge >= 1)) return false;
    s.charge = 0; s.ready = false; s.uses++;
    return true;
}

/**
 * Кнопка нитро: круг с заливкой бака (conic-gradient), полный — пульсирует. На ПК подпись клавиши.
 * o: { onFire, keyHint } → { el, render(slip, nitroOn), remove() }
 */
export function createNitroButton(o) {
    const el = document.createElement('button');
    el.type = 'button';
    el.id = 'nitro-btn';
    el.className = 'control-btn';
    el.setAttribute('aria-label', 'Нитро');
    el.innerHTML = '<i>🔥</i><b>НИТРО</b>' + (o && o.keyHint ? '<kbd>' + o.keyHint + '</kbd>' : '');
    const fire = function(e) { if (e) { e.preventDefault(); e.stopPropagation(); } if (o && o.onFire) o.onFire(); };
    el.addEventListener('touchstart', fire, { passive: false });
    el.addEventListener('mousedown', fire);
    document.body.appendChild(el);
    let lastK = -1, lastCls = '';
    return {
        el: el,
        render: function(s, nitroOn) {
            const k = Math.round(Math.max(0, Math.min(1, s.charge)) * 100);
            if (k !== lastK) { el.style.setProperty('--k', k + '%'); lastK = k; }
            const cls = (s.ready ? ' ready' : '') + (nitroOn ? ' burning' : '') + (s.k > 0 ? ' drafting' : '');
            if (cls !== lastCls) { el.className = 'control-btn' + cls; lastCls = cls; }
        },
        remove: function() { el.remove(); }
    };
}

/** Шлейф воздуха за попуткой: светлые полосы от её бампера обтекают машину игрока по бокам (между машинами их закрыл бы кузов), ярче — чем плотнее мешок */
export function createDraftFx(scene) {
    const g = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({ color: 0xeaf6ff, transparent: true, opacity: 0, depthWrite: false });
    const geo = new THREE.PlaneGeometry(0.07, 1);
    geo.rotateX(-Math.PI / 2);
    const lines = [];
    for (let i = 0; i < 6; i++) {
        const m = new THREE.Mesh(geo, mat);
        m.userData.ox = (i < 3 ? -1 : 1) * (0.55 + (i % 3) * 0.16);
        m.userData.ph = i * 0.37;
        m.userData.dynamic = true; // двигается каждый кадр: заморозка сцены при старте (freezeStaticScene) его не трогает
        m.frustumCulled = false;
        m.userData.y = 0.3 + ((i * 2) % 3) * 0.16;
        g.add(m); lines.push(m);
    }
    g.visible = false;
    g.userData.dynamic = true;
    scene.add(g);
    let t = 0, a = 0, last = null;
    return {
        update: function(dt, s, px, pz) {
            t += dt;
            a += ((s.car ? 0.35 + 0.45 * s.k : 0) - a) * Math.min(1, dt * 8);
            if (s.car) last = s.car; // мешок кончился — полосы гаснут на месте, а не пропадают
            g.visible = a > 0.02 && !!last;
            if (!g.visible) return;
            mat.opacity = a;
            const c = last, z0 = c.z + 1, len = Math.max(1, pz + 3 - z0); // от попутки — до чуть позади игрока
            lines.forEach(function(m) {
                const f = (t * 1.8 + m.userData.ph) % 1; // полосы бегут от попутки к игроку
                m.scale.set(1, 1, len * (0.25 + 0.2 * f)); // после поворота плоскости длина — вдоль z
                m.position.set(px + m.userData.ox, m.userData.y, z0 + len * (0.2 + 0.6 * f));
            });
        },
        group: g,
        dispose: function() { scene.remove(g); geo.dispose(); mat.dispose(); }
    };
}
