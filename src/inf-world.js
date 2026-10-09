/**
 * Бесконечная трасса — мир вокруг машины (план, пейзажи и счёт без сцены — src/infinite.js).
 * Дорога — «беговая дорожка»: полотно, разметка, бордюры и земля лежат в одной группе и переезжают вперёд
 * шагом RIG_STEP — узор асфальта, разметки и травы на этом шаге повторяется, шва не видно.
 * Обочины — участки по STRETCH ед.: строятся впереди по пейзажу этого места (src/decor.js, лес, снег)
 * и удаляются позади. Небо, туман, земля и свет плавно перетекают из пейзажа в пейзаж.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { themeAt, mixHex } from './infinite.js';
import * as Decor from './decor.js';
import { createRock, createLog, createForestInstanced } from './biomes.js';
import { createSpruce, createSnowBank, createSnowman } from './snow.js';
import { mergeStaticMeshes } from './merge-static.js';
import { buildScenery } from './scenery.js';
import { setKitGlow } from './scenery-kit.js';

export const RIG_STEP = 180;
export const STRETCH = 60;
const AHEAD = 280, BEHIND = 60;
const BANNERS = ['ВИДЕОПРОКАТ 24Ч', 'ТУРБО-ЖУЙ', 'ПРИСТАВКА 16 БИТ', 'VHS ONLY', 'ЛИМОНАД «ЁЛОЧКА»', 'КИНОЗАЛ «ОКТЯБРЬ»', 'ДЕМБЕЛЬ-97', 'ШИНОМОНТАЖ 24Ч'];

/** На сколько сдвинута «беговая дорожка» дороги, когда проехано dist: первые 600 ед. — на месте */
export function rigShift(dist) {
    return Math.max(0, Math.floor((dist - 600) / RIG_STEP)) * RIG_STEP;
}

/** Освободить геометрию (и подписи-текстуры) удалённого объекта; общая геометрия помечена userData.keep */
export function disposeTree(o) {
    o.traverse(function(c) {
        if (c.geometry && !(c.geometry.userData && c.geometry.userData.keep)) c.geometry.dispose();
        const m = c.material;
        if (m && !Array.isArray(m) && m.map && m.map.isCanvasTexture && !m.map.userData.keep) m.map.dispose();
    });
}

/** Пейзаж участка: в зоне перехода — уже следующий */
export function stretchTheme(i) {
    const t = themeAt(i * STRETCH + STRETCH / 2);
    return t.k > 0.5 ? t.next : t.theme;
}

function lamp(g, x, z) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 3.5, 6), new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.6, roughness: 0.4 }));
    pole.position.set(x, 1.75, z);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffeebb }));
    bulb.position.set(x - Math.sign(x) * 0.6, 3.35, z);
    g.add(pole, bulb);
}

/**
 * o: { scene, startZ, trackWidth, rig (группа дороги), ground, hills (холмы обочин), lights: { ambient, hemi, sun }, lite (мобильный/низкое качество), sky (src/sky.js) }
 * tick(zPos) → { dist, theme, next, k } — каждый кадр: дорога, участки обочин, небо и свет
 */
export function createInfWorld(o) {
    const scene = o.scene, W = o.trackWidth;
    const base = { amb: o.lights.ambient.intensity, hemi: o.lights.hemi.intensity, sun: o.lights.sun.intensity };
    const stretches = new Map();
    const envN = o.lite ? 4 : 6, treeN = o.lite ? 12 : 22;

    /** Высота холмов обочины в точке (x, z) — по сетке их геометрии (холмы едут с дорогой) */
    function heightAt(x, z) {
        const hills = o.hills || [];
        const h = hills[x < 0 ? 0 : 1];
        if (!h || !h.geometry || !h.geometry.parameters) return 0;
        const P = h.geometry.parameters, pos = h.geometry.attributes.position;
        const across = Math.abs(x) - (W / 2 + 0.6);
        if (across <= 0) return 0;
        const cx = Math.min(P.widthSegments, across / (P.width / P.widthSegments));
        const zl = z - (o.rig ? o.rig.position.z : 0) - h.position.z;
        const rz = (zl + P.height / 2) / (P.height / P.heightSegments);
        if (rz < 0 || rz > P.heightSegments) return 0;
        const c0 = Math.floor(cx), r0 = Math.floor(rz), c1 = Math.min(P.widthSegments, c0 + 1), r1 = Math.min(P.heightSegments, r0 + 1), fx = cx - c0, fz = rz - r0, n = P.widthSegments + 1;
        // ряды геометрии идут от −height/2 к +height/2 по z (после поворота плоскости)
        const yAt = function(c, r) { return pos.getY((P.heightSegments - r) * n + c); };
        const y = (yAt(c0, r0) * (1 - fx) + yAt(c1, r0) * fx) * (1 - fz) + (yAt(c0, r1) * (1 - fx) + yAt(c1, r1) * fx) * fz;
        return y + h.position.y;
    }

    function build(i) {
        const th = stretchTheme(i);
        const z0 = o.startZ - i * STRETCH;
        const r = Math.random;
        const zr = function() { return z0 - r() * STRETCH; };
        const g = new THREE.Group();
        g.name = 'inf_' + i;
        const own = th.style === 'city' || th.style === 'village'; // свой набор целиком (src/scenery.js)
        const envK = th.style === 'arsenev' ? 2 : envN; // в Арсеньеве обочину заняли дома (src/scenery.js) — общего декора меньше, чтобы не налезал
        for (let n = 0; n < (own ? 0 : envK); n++) {
            const side = r() < 0.5 ? -1 : 1, x = side * (W / 2 + 3.5 + r() * 14), z = zr(), s = 0.7 + r() * 1.1;
            const b = Decor.decorFor(th.style, r());
            if (b) { const d = b(x, z, s); d.position.y = heightAt(x, z) - 0.05; g.add(d); } // по холму, а не в воздухе
            else (r() < 0.57 ? createRock : createLog)(g, x, z, s);
        }
        // мелочь у самой обочины
        if (!own) {
            const side = r() < 0.5 ? -1 : 1, x = side * (W / 2 + 1.4 + r() * 1.6), z = zr();
            if (th.style === 'forest') (r() < 0.5 ? createRock : createLog)(g, x, z, 0.5 + r() * 0.3);
            else if (th.style === 'junk') g.add(Decor.createScrapPile(x, z, 0.5 + r() * 0.4));
            else if (th.style === 'industrial') g.add(Decor.createPipeStack(x, z, 0.5 + r() * 0.4));
            else g.add(Decor.createTireStack(x, z, 0.6 + r() * 0.3));
        }
        if (th.snow) {
            for (let n = 0; n < (o.lite ? 4 : 7); n++) {
                const side = r() < 0.5 ? -1 : 1, x = side * (W / 2 + 2.6 + r() * 16), z = zr(), q = r();
                if (q < 0.6) createSpruce(g, x, z, 0.9 + r() * 0.6);
                else if (q < 0.88) createSnowBank(g, x, z, 1 + r() * 0.6);
                else createSnowman(g, x, z, 0.85 + r() * 0.4);
            }
        } else if (th.style !== 'junk' && th.style !== 'forest' && !own) { // лес — в наборе (src/scenery.js): гуще и одним мешем
            // и у города, и у промзоны — живые деревья подальше от дороги: берёзы и сосны группами
            const trees = [], n = Math.round(treeN * (th.style === 'industrial' ? 0.25 : 0.55));
            for (let t = 0; t < n; t++) {
                const side = r() < 0.5 ? -1 : 1;
                trees.push({ x: side * (W / 2 + (th.style === 'arsenev' ? 23 + r() * 14 : 7 + r() * 16)), z: zr(), s: 0.8 + r() * 0.7, kind: r() < 0.55 ? 'birch' : 'pine', rot: r() * Math.PI * 2 });
            }
            createForestInstanced(g, trees, mergeGeometries);
        }
        if (th.night && th.style === 'city') { /* в городе свои фонари */ } else if (th.night) lamp(g, (i % 2 ? 1 : -1) * (W / 2 + 1.8), z0 - STRETCH / 2);
        else if (i % 3 === 0) g.add(Decor.createCinemaBanner((i % 2 ? 1 : -1) * (W / 2 + 5 + r() * 4), zr(), BANNERS[i % BANNERS.length]));
        try { mergeStaticMeshes(g.children.slice(), g); } catch (e) { /* склейка — только ради скорости */ }
        try { // насыщенные обочины: дома, избы, лес, озёра — один меш на участок (src/scenery.js)
            const sc = buildScenery({ style: th.style, jungle: th.id === 'jungle', snow: !!th.snow, night: !!th.night, i: i, z0: z0, len: STRETCH, W: W, lite: o.lite, rnd: r, heightAt: heightAt });
            if (sc.mesh) g.add(sc.mesh);
            if (sc.water) g.add(sc.water);
        } catch (e) { console.warn('scenery', e); }
        scene.add(g);
        stretches.set(i, g);
    }

    function atmosphere(d) {
        const t = themeAt(d), a = t.theme, b = t.next, k = t.k;
        const lerp = function(x, y) { return x + (y - x) * k; };
        if (scene.background && scene.background.isColor) scene.background.setHex(mixHex(a.sky, b.sky, k));
        if (scene.fog) {
            scene.fog.color.setHex(mixHex(a.fog, b.fog, k));
            scene.fog.near = lerp(a.fogNear, b.fogNear);
            scene.fog.far = lerp(a.fogFar, b.fogFar);
        }
        const gc = mixHex(a.ground, b.ground, k);
        if (o.ground && o.ground.material) o.ground.material.color.setHex(gc);
        (o.hills || []).forEach(function(h) { h.material.color.setHex(gc); });
        const L = lerp(a.light, b.light);
        o.lights.ambient.intensity = base.amb * L;
        o.lights.hemi.intensity = base.hemi * L;
        o.lights.sun.intensity = base.sun * L;
        setKitGlow((1 - L) * 1.7); // ночью и в дождь окна и вывески светятся
        if (o.sky) { o.sky.setTheme(a, b, k, mixHex(a.fog, b.fog, k)); o.sky.tick(1 / 60); } // небо и силуэты на горизонте (src/sky.js)
        return t;
    }

    const world = {
        dist: 0,
        get stretches() { return stretches.size; },
        heightAt: heightAt,
        tick: function(zPos, prefill) {
            const d = Math.max(0, o.startZ - zPos);
            world.dist = Math.max(world.dist, d);
            if (o.rig) o.rig.position.z = -rigShift(d);
            const lo = Math.floor((d - BEHIND) / STRETCH), hi = Math.floor((d + AHEAD) / STRETCH);
            // впереди — не больше одного участка за кадр (кроме старта): стройка не даёт рывков
            for (let i = Math.max(0, lo); i <= hi; i++) {
                if (stretches.has(i)) continue;
                build(i);
                if (!prefill) break;
            }
            stretches.forEach(function(g, i) {
                if (i >= lo) return;
                scene.remove(g);
                disposeTree(g);
                stretches.delete(i);
            });
            return atmosphere(d);
        }
    };
    return world;
}
