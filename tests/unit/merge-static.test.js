import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { mergeStaticMeshes, mergeKey, materialLook, CHUNK } from '../../src/merge-static.js';

describe('склейка неподвижного декора', () => {
    it('однотипные меши одного материала и куска трассы → один меш, координаты сохраняются', () => {
        const scene = new THREE.Scene();
        const matA = new THREE.MeshLambertMaterial({ color: 0xff0000 });
        const matB = new THREE.MeshLambertMaterial({ color: 0x00ff00 });
        const root = new THREE.Group();
        for (let i = 0; i < 10; i++) {
            const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), i < 6 ? matA : matB);
            m.position.set(i * 2, 0, 5);
            root.add(m);
        }
        const moving = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), matA);
        moving.userData.dynamic = true;
        root.add(moving);
        scene.add(root);
        const r = mergeStaticMeshes([root], scene);
        expect(r).toMatchObject({ before: 10, merged: 10, after: 2 });
        const merged = scene.children.filter(o => o.userData.mergedStatic);
        expect(merged.map(o => o.userData.mergedStatic).sort()).toEqual([4, 6]);
        // склеенная геометрия в мировых координатах: крайний ящик на x = 18 ± 0.5
        const box = new THREE.Box3().setFromObject(merged.find(o => o.material === matB));
        expect(box.max.x).toBeCloseTo(18.5, 5);
        // двигающийся меш не тронут
        expect(moving.parent).toBe(root);
    });

    it('далёкие куски трассы не склеиваются вместе (камера отсекает невидимое)', () => {
        expect(mergeKey('m', ['position'], true, 5)).not.toBe(mergeKey('m', ['position'], true, 5 + CHUNK));
        expect(mergeKey('m', ['position', 'normal'], true, 5)).toBe(mergeKey('m', ['normal', 'position'], true, 10));
    });
});

describe('внешность материала', () => {
    it('одинаковые по виду материалы склеиваются вместе, светящиеся — нет', () => {
        const scene = new THREE.Scene();
        const root = new THREE.Group();
        for (let i = 0; i < 4; i++) root.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0x3d2b1a, roughness: 0.95 })));
        for (let i = 0; i < 2; i++) root.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0xffaa00, emissive: 0xffaa00 })));
        scene.add(root);
        const r = mergeStaticMeshes([root], scene);
        // 4 дерева с разными экземплярами материала → один меш; 2 фонаря со своими материалами — как были
        expect(r).toMatchObject({ before: 6, merged: 4, after: 3 });
        expect(materialLook(new THREE.MeshLambertMaterial({ color: 1 }))).toBe(materialLook(new THREE.MeshLambertMaterial({ color: 1 })));
        expect(materialLook(new THREE.MeshLambertMaterial({ color: 1 }))).not.toBe(materialLook(new THREE.MeshLambertMaterial({ color: 2 })));
    });
});
