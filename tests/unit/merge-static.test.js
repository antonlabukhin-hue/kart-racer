import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { mergeStaticMeshes, mergeKey, materialLook, mergeCarParts, CHUNK } from '../../src/merge-static.js';

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

describe('склейка деталей машины', () => {
    function toyCar() {
        const car = new THREE.Group();
        const black = new THREE.MeshStandardMaterial({ color: 0x151515 });
        const paint = new THREE.MeshStandardMaterial({ color: 0xff2200 });
        const glass = new THREE.MeshStandardMaterial({ color: 0x1a3048, transparent: true, opacity: 0.8 });
        const lamp = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffcc66 });
        for (let i = 0; i < 5; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), black.clone()); m.position.set(i * 0.2, 0.5, 1); car.add(m); }
        for (let i = 0; i < 3; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(1, 0.2, 1), paint); m.userData.bodyPaint = true; car.add(m); }
        car.add(new THREE.Mesh(new THREE.BoxGeometry(1, 0.3, 0.1), glass), new THREE.Mesh(new THREE.BoxGeometry(1, 0.3, 0.1), glass));
        for (let i = 0; i < 2; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.1), lamp); m.userData.isLight = true; car.add(m); }
        const hub = new THREE.Group(); hub.userData.isWheel = true; hub.position.set(0.6, 0.24, 0.7); car.add(hub);
        for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.02), black); b.position.set(0.1, Math.cos(i) * 0.1, Math.sin(i) * 0.1); hub.add(b); }
        const hidden = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), black); hidden.visible = false; car.add(hidden);
        car.scale.setScalar(0.62); car.position.set(3, 0, -40); car.rotation.y = 0.3;
        return { car, hub, hidden };
    }
    it('мелочь кузова — одна деталь на материал; краска, фары, стёкла, скрытое — как были; колесо — внутри ступицы', () => {
        const { car, hub, hidden } = toyCar();
        const box0 = new THREE.Box3().setFromObject(car);
        const r = mergeCarParts(car);
        expect(r).toEqual({ before: 9, after: 2 });
        expect(car.children.filter(o => o.userData.bodyPaint).length).toBe(3);
        expect(car.children.filter(o => o.userData.isLight).length).toBe(2);
        expect(hidden.parent).toBe(car);
        expect(hub.children.length).toBe(1);
        expect(hub.children[0].userData.mergedCar).toBe(4);
        // габариты машины не сдвинулись ни на миллиметр
        const box1 = new THREE.Box3().setFromObject(car);
        expect(box1.min.distanceTo(box0.min)).toBeLessThan(1e-6);
        expect(box1.max.distanceTo(box0.max)).toBeLessThan(1e-6);
    });
    it('призрак склеивается весь, кроме скрытого', () => {
        const { car } = toyCar();
        const r = mergeCarParts(car, { all: true });
        expect(r.before).toBe(16);
        expect(r.after).toBe(5); // чёрное кузова, краска, стекло, фары, колесо
    });
});
