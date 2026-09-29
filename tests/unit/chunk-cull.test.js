import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { buildChunks, SPAN } from '../../src/chunk-cull.js';

const box = (z, len = 1) => { const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, len)); m.position.set(3, 0, z); return m; };

describe('участки трассы', () => {
    it('неподвижное — по участкам, длинное и «живое» — остаётся в сцене; мировые координаты те же', () => {
        const scene = new THREE.Scene();
        const a = box(-10), b = box(-20), c = box(-400), road = box(0, 1000), car = box(-5), animal = box(-7);
        car.userData.dynamic = true; animal.userData.type = 'dog';
        scene.add(a, b, c, road, car, animal, new THREE.DirectionalLight());
        const r = buildChunks(scene);
        expect(r.moved).toBe(3);
        expect(r.chunks).toHaveLength(2);
        expect(road.parent).toBe(scene);
        expect(car.parent).toBe(scene);
        expect(animal.parent).toBe(scene);
        expect(a.parent).toBe(b.parent);
        const w = new THREE.Vector3(); c.getWorldPosition(w);
        expect(w.z).toBeCloseTo(-400, 6);
    });
    it('видны только участки в окне вокруг машины; выключенный не обходится при пересчёте матриц', () => {
        const scene = new THREE.Scene();
        for (let z = 0; z > -1000; z -= 20) scene.add(box(z));
        const r = buildChunks(scene);
        r.update(-500, 160, 30);
        const on = r.chunks.filter(c => c.visible);
        on.forEach(c => { expect(c.userData.chunk.max).toBeGreaterThanOrEqual(-660); expect(c.userData.chunk.min).toBeLessThanOrEqual(-470); });
        expect(on.length).toBeLessThanOrEqual(Math.ceil(190 / SPAN) + 2);
        r.chunks.filter(c => !c.visible).forEach(c => expect(c.matrixWorldAutoUpdate).toBe(false));
        // машина уехала — окно сдвинулось
        r.update(-900, 160, 30);
        expect(r.chunks.filter(c => c.visible).every(c => c.userData.chunk.min <= -870)).toBe(true);
    });
    it('scene.remove находит объект в участке; сдвинувшийся объект возвращается в сцену', () => {
        const scene = new THREE.Scene();
        const a = box(-10), b = box(-12), c = box(-14);
        scene.add(a, b, c);
        const r = buildChunks(scene);
        scene.remove(a);
        expect(a.parent).toBe(null);
        c.position.z = -60; // поехал за машиной
        expect(r.sweep()).toBe(1);
        expect(c.parent).toBe(scene);
        expect(b.parent.userData.chunk).toBeTruthy();
    });
});
