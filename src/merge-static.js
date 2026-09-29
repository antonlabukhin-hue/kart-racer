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
