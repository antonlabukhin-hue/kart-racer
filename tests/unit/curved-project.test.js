import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { projectBent, BEND_START } from '../../src/curved-world.js';

describe('проекция с изгибом мира', () => {
    const cam = new THREE.PerspectiveCamera(60, 2, 0.1, 500);
    cam.position.set(0, 2, 0); cam.lookAt(0, 2, -10); cam.updateMatrixWorld(); cam.updateProjectionMatrix();
    it('без изгиба — обычная проекция: точка по оси — в центре кадра', () => {
        const r = projectBent(new THREE.Vector3(0, 2, -30), cam, 800, 400, new THREE.Vector2(0, 0));
        expect(r.x).toBeCloseTo(400, 5); expect(r.y).toBeCloseTo(200, 5); expect(r.visible).toBe(true);
    });
    it('изгиб вправо сдвигает дальнюю точку вправо, ближнюю (до BEND_START) не трогает', () => {
        const curve = new THREE.Vector2(0.001, 0);
        expect(projectBent(new THREE.Vector3(0, 2, -40), cam, 800, 400, curve).x).toBeGreaterThan(401);
        expect(projectBent(new THREE.Vector3(0, 2, -(BEND_START - 1)), cam, 800, 400, curve).x).toBeCloseTo(400, 5);
    });
    it('позади камеры — не видно', () => {
        expect(projectBent(new THREE.Vector3(0, 2, 10), cam, 800, 400, new THREE.Vector2(0, 0)).visible).toBe(false);
    });
});
