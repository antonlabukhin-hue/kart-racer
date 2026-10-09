/**
 * Склейка неподвижного декора: сотни мелких мешей (столбики, ящики, руины, щиты) → несколько
 * больших по материалу. Меньше объектов — меньше пересчёта матриц, проверок видимости и вызовов отрисовки.
 * Склеивается только то, что точно не двигается (вызывающий передаёт корни неподвижного окружения).
 * Куски по CHUNK единиц вдоль трассы — невидимые участки по-прежнему отсекаются камерой.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const CHUNK = 60;

/** Ключ корзины склейки: один материал, одинаковый набор атрибутов, один кусок трассы */
export function mergeKey(materialId, attrNames, indexed, z) {
    return materialId + '|' + attrNames.slice().sort().join(',') + '|' + (indexed ? 'i' : 'n') + '|' + Math.floor(z / CHUNK);
}

/**
 * «Внешность» материала: декор часто создаёт по новому материалу на каждый предмет (дерево, руина),
 * хотя цвета одинаковые. Одинаковые по виду склеиваем вместе. Светящиеся (emissive) — только сами с собой:
 * их могут мигать по ссылке.
 */
export function materialLook(m) {
    if (m.emissive && (m.emissive.r || m.emissive.g || m.emissive.b)) return m.uuid;
    const hex = function(c) { return c ? c.getHexString() : ''; };
    return [m.type, hex(m.color), m.roughness, m.metalness, m.flatShading, m.side, m.vertexColors,
        m.map ? m.map.uuid : '', m.fog, m.wireframe, m.onBeforeCompile ? m.onBeforeCompile.toString().length : 0].join('|');
}

export function mergeStaticMeshes(roots, scene) {
    const buckets = new Map();
    const tmp = new THREE.Vector3();
    let before = 0;
    roots.forEach(function(r) { r.updateMatrixWorld(true); });
    roots.forEach(function(r) {
        r.traverse(function(o) {
            if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || Array.isArray(o.material) || !o.visible) return;
            if (o.userData && (o.userData.dynamic || o.userData.noMerge)) return;
            if (o.material.transparent || o.material.map && o.material.map.isCanvasTexture) return; // прозрачное и подписи — как есть
            before++;
            o.getWorldPosition(tmp);
            const g = o.geometry;
            const key = mergeKey(materialLook(o.material), Object.keys(g.attributes), !!g.index, tmp.z);
            if (!buckets.has(key)) buckets.set(key, []);
            buckets.get(key).push(o);
        });
    });
    let after = 0, merged = 0;
    buckets.forEach(function(list) {
        if (list.length < 2) { after += list.length; return; }
        const geos = list.map(function(o) { return o.geometry.clone().applyMatrix4(o.matrixWorld); });
        const mg = mergeGeometries(geos, false);
        geos.forEach(function(g) { g.dispose(); });
        if (!mg) { after += list.length; return; }
        const mesh = new THREE.Mesh(mg, list[0].material);
        mesh.castShadow = list.some(function(o) { return o.castShadow; });
        mesh.receiveShadow = list.some(function(o) { return o.receiveShadow; });
        mesh.matrixAutoUpdate = false;
        mesh.matrixWorldAutoUpdate = false;
        mesh.updateMatrix();
        mesh.updateMatrixWorld(true);
        mesh.userData.mergedStatic = list.length;
        scene.add(mesh);
        list.forEach(function(o) { if (o.parent) o.parent.remove(o); });
        after += 1;
        merged += list.length;
    });
    // опустевшие группы тоже убираем — их матрицы больше не нужны
    roots.forEach(function(r) {
        let hasMesh = false;
        r.traverse(function(o) { if (o.isMesh) hasMesh = true; });
        if (!hasMesh && r.parent) r.parent.remove(r);
    });
    return { before: before, after: after, merged: merged };
}

function flipWinding(g) {
    if (g.index) {
        const a = g.index.array;
        for (let i = 0; i < a.length; i += 3) { const t = a[i + 1]; a[i + 1] = a[i + 2]; a[i + 2] = t; }
        g.index.needsUpdate = true;
        return;
    }
    Object.keys(g.attributes).forEach(function(k) {
        const at = g.attributes[k], n = at.itemSize, a = at.array;
        for (let i = 0; i + 3 * n <= a.length; i += 3 * n) {
            for (let j = 0; j < n; j++) { const t = a[i + n + j]; a[i + n + j] = a[i + 2 * n + j]; a[i + 2 * n + j] = t; }
        }
        at.needsUpdate = true;
    });
}

/**
 * Склейка деталей машины внутри неё самой: машина едет и кренится целиком, а мелочь кузова
 * (решётка, ручки, зеркала, бамперы) — одна деталь на каждый вид материала.
 * Отдельно остаются: краска кузова (вмятины, ночная подсветка), фары и стопы (ксенон, яркость),
 * стёкла и прочее прозрачное, скрытые детали. Колёса склеиваются внутри своей ступицы — и дальше крутятся.
 * opts.all — клеить всё видимое (для призрака: он не мнётся и не светит фарами).
 */
export function mergeCarParts(car, opts) {
    const all = !!(opts && opts.all);
    car.updateMatrixWorld(true);
    const buckets = new Map();
    let before = 0;
    car.traverse(function(o) {
        if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || Array.isArray(o.material)) return;
        let pivot = car, shown = true;
        for (let p = o; p && p !== car; p = p.parent) {
            if (!p.visible) shown = false;
            if (p !== o && pivot === car && p.userData && p.userData.isWheel) pivot = p;
        }
        if (!shown || (o.userData && o.userData.noMerge)) return;
        if (!all && (o.userData.bodyPaint || o.userData.isLight || o.material.transparent)) return;
        before++;
        const key = pivot.uuid + '|' + materialLook(o.material) + '|' + Object.keys(o.geometry.attributes).sort().join(',') + '|' + !!o.geometry.index;
        if (!buckets.has(key)) buckets.set(key, { pivot: pivot, list: [] });
        buckets.get(key).list.push(o);
    });
    let after = 0;
    const inv = new THREE.Matrix4(), rel = new THREE.Matrix4();
    buckets.forEach(function(b) {
        if (b.list.length < 2) { after += b.list.length; return; }
        inv.copy(b.pivot.matrixWorld).invert();
        const geos = b.list.map(function(o) {
            rel.multiplyMatrices(inv, o.matrixWorld);
            const g = o.geometry.clone().applyMatrix4(rel);
            if (rel.determinant() < 0) flipWinding(g); // отражённая деталь не должна вывернуться наизнанку
            return g;
        });
        const mg = mergeGeometries(geos, false);
        geos.forEach(function(g) { g.dispose(); });
        if (!mg) { after += b.list.length; return; }
        const src = b.list[0];
        const mesh = new THREE.Mesh(mg, src.material);
        mesh.castShadow = b.list.some(function(o) { return o.castShadow; });
        mesh.receiveShadow = b.list.some(function(o) { return o.receiveShadow; });
        mesh.renderOrder = src.renderOrder;
        mesh.userData.mergedCar = b.list.length;
        b.pivot.add(mesh);
        b.list.forEach(function(o) { if (o.parent) o.parent.remove(o); });
        after += 1;
    });
    return { before: before, after: after };
}

/**
 * Один экземпляр материала на каждый «вид»: попутки и участки обочин создают по новому материалу
 * на каждую деталь (сотни одинаковых), и каждый новый экземпляр при первом показе заново подбирает
 * параметры шейдера — лишняя работа в кадре. Светящиеся (их меняют по ссылке) и с подписями — как есть.
 */
const CANON = new Map();
export function shareKey(m) {
    if (!m || m.isShaderMaterial || m.userData.noShare) return null;
    if (m.emissive && (m.emissive.r || m.emissive.g || m.emissive.b)) return null;
    if (m.map && m.map.isCanvasTexture && !(m.map.userData && m.map.userData.keep)) return null;
    const hex = function(c) { return c ? c.getHexString() : ''; };
    return [m.type, hex(m.color), m.roughness, m.metalness, m.flatShading, m.side, m.vertexColors, m.map ? m.map.uuid : '',
        m.transparent, m.opacity, m.depthWrite, m.depthTest, m.blending, m.fog, m.wireframe, m.alphaTest].join('|');
}
export function shareMaterial(m) {
    const k = shareKey(m);
    if (k == null) return m;
    const c = CANON.get(k);
    if (c) return c;
    if (CANON.size > 2000) CANON.clear(); // на всякий случай — не копить без конца
    CANON.set(k, m);
    return m;
}
/** Заменить материалы всех мешей объекта на общие экземпляры. Возвращает, сколько заменено */
export function shareMaterials(root) {
    let n = 0;
    root.traverse(function(o) {
        if (!o.isMesh || Array.isArray(o.material)) return;
        const s = shareMaterial(o.material);
        if (s !== o.material) { o.material = s; n++; }
    });
    return n;
}
