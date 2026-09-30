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
 * o: { scene, startZ, trackWidth, rig (группа дороги), ground, hills (холмы обочин), lights: { ambient, hemi, sun }, lite (мобильный/низкое качество) }
 * tick(zPos) → { dist, theme, next, k } — каждый кадр: дорога, участки обочин, небо и свет
 */
export function createInfWorld(o) {
    const scene = o.scene, W = o.trackWidth;
    const base = { amb: o.lights.ambient.intensity, hemi: o.lights.hemi.intensity, sun: o.lights.sun.intensity };
    const stretches = new Map();
    const envN = o.lite ? 4 : 6, treeN = o.lite ? 12 : 22;

    function build(i) {
        const th = stretchTheme(i);
        const z0 = o.startZ - i * STRETCH;
        const r = Math.random;
        const zr = function() { return z0 - r() * STRETCH; };
        const g = new THREE.Group();
        g.name = 'inf_' + i;
        for (let n = 0; n < envN; n++) {
            const side = r() < 0.5 ? -1 : 1, x = side * (W / 2 + 3.5 + r() * 14), z = zr(), s = 0.7 + r() * 1.1;
            const b = Decor.decorFor(th.style, r());
            if (b) g.add(b(x, z, s));
            else (r() < 0.57 ? createRock : createLog)(g, x, z, s);
        }
        // мелочь у самой обочины
        {
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
        } else if (th.style === 'forest') {
            const trees = [];
            for (let n = 0; n < treeN; n++) {
                const side = r() < 0.5 ? -1 : 1;
                trees.push({ x: side * (W / 2 + 3.2 + r() * 22), z: zr(), s: 0.8 + r() * 0.8, kind: r() < 0.62 ? 'pine' : 'birch', rot: r() * Math.PI * 2 });
            }
            createForestInstanced(g, trees, mergeGeometries);
        } else if (th.style !== 'junk') {
            // и у города, и у промзоны — живые деревья подальше от дороги: берёзы и сосны группами
            const trees = [], n = Math.round(treeN * (th.style === 'industrial' ? 0.25 : 0.55));
            for (let t = 0; t < n; t++) {
                const side = r() < 0.5 ? -1 : 1;
                trees.push({ x: side * (W / 2 + 7 + r() * 24), z: zr(), s: 0.8 + r() * 0.7, kind: r() < 0.55 ? 'birch' : 'pine', rot: r() * Math.PI * 2 });
            }
            createForestInstanced(g, trees, mergeGeometries);
        }
        if (th.night) lamp(g, (i % 2 ? 1 : -1) * (W / 2 + 1.8), z0 - STRETCH / 2);
        else if (i % 3 === 0) g.add(Decor.createCinemaBanner((i % 2 ? 1 : -1) * (W / 2 + 5 + r() * 4), zr(), BANNERS[i % BANNERS.length]));
        try { mergeStaticMeshes(g.children.slice(), g); } catch (e) { /* склейка — только ради скорости */ }
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
        return t;
    }

    const world = {
        dist: 0,
        get stretches() { return stretches.size; },
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
