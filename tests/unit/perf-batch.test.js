import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { shareMaterial, shareMaterials, shareKey } from '../../src/merge-static.js';
import { freezeStatic } from '../../src/inf-world.js';
import { createEChipBatch } from '../../src/echip.js';

describe('общие материалы', () => {
    it('одинаковые по виду — один экземпляр; светящиеся и разные — свои', () => {
        const a = new THREE.MeshStandardMaterial({ color: 0x123456, roughness: 0.7 });
        const b = new THREE.MeshStandardMaterial({ color: 0x123456, roughness: 0.7 });
        const c = new THREE.MeshStandardMaterial({ color: 0x654321, roughness: 0.7 });
        const glow = new THREE.MeshStandardMaterial({ color: 0x123456, roughness: 0.7, emissive: 0xffaa00 });
        expect(shareMaterial(a)).toBe(a);
        expect(shareMaterial(b)).toBe(a);
        expect(shareMaterial(c)).toBe(c);
        expect(shareKey(glow)).toBe(null);
        expect(shareMaterial(glow)).toBe(glow);
        const t1 = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.5 });
        const t2 = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.9 });
        expect(shareMaterial(t2)).not.toBe(shareMaterial(t1)); // прозрачность разная — не путать
    });
    it('shareMaterials заменяет материалы у мешей объекта', () => {
        const g = new THREE.Group();
        const m1 = new THREE.MeshStandardMaterial({ color: 0x0a0b0c }), m2 = new THREE.MeshStandardMaterial({ color: 0x0a0b0c });
        g.add(new THREE.Mesh(new THREE.BoxGeometry(), m1), new THREE.Mesh(new THREE.BoxGeometry(), m2));
        shareMaterials(g);
        expect(g.children[0].material).toBe(g.children[1].material);
    });
});

describe('участок обочины неподвижен', () => {
    it('пустые группы убираются, матрицы считаются один раз', () => {
        const g = new THREE.Group(), keep = new THREE.Group(), m = new THREE.Mesh(new THREE.BoxGeometry());
        m.position.set(1, 2, 3);
        keep.add(m);
        g.add(keep, new THREE.Group(), new THREE.Group());
        expect(freezeStatic(g)).toBe(2);
        expect(g.children.length).toBe(1);
        expect(g.matrixWorldAutoUpdate).toBe(false);
        expect(m.matrixAutoUpdate).toBe(false);
        expect(m.matrixWorld.elements[12]).toBe(1); // мировая матрица уже посчитана
    });
});

describe('все «Е» — одним вызовом отрисовки', () => {
    it('видимые держатели — экземпляры; спрятанные и убранные — нет', () => {
        const scene = new THREE.Scene();
        const batch = createEChipBatch(scene, 50);
        const chips = [];
        for (let i = 0; i < 5; i++) { const c = batch.chip(false); c.position.x = i; scene.add(c); chips.push(c); }
        const star = new THREE.Group(); star.add(batch.chip(true)); scene.add(star);
        scene.updateMatrixWorld(true);
        batch.sync();
        expect(batch.count).toBe(6);
        chips[0].visible = false;          // подобрали
        scene.remove(chips[1]);            // уехали позади
        star.visible = false;              // родитель спрятан
        batch.sync();
        expect(batch.count).toBe(3);
        expect(scene.children.filter(function(o) { return o.isInstancedMesh; }).length).toBe(2);
    });
});
