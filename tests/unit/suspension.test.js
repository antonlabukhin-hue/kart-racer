import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { liftCar, LIFT } from '../../src/suspension.js';

describe('высокая подвеска', () => {
    it('кузов поднят, а колёса и литьё (wheelPart) остаются внизу', () => {
        const car = new THREE.Group();
        [-0.5, 0.5].forEach(function(x) { const w = new THREE.Group(); w.userData.isWheel = true; w.position.set(x, 0.25, 0); car.add(w); });
        const body = new THREE.Mesh(new THREE.BoxGeometry(1, 0.4, 2)); body.position.y = 0.5; car.add(body);
        const rims = new THREE.Group(); rims.userData.wheelPart = true; rims.add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.3, 0.3))); rims.children[0].position.set(0.6, 0.25, 0); car.add(rims);
        const s = liftCar(car, 0.25);
        expect(s.fallback).toBe(false);
        expect(rims.parent).toBe(car);       // не в кузове
        expect(body.parent).toBe(s.body);
        expect(s.body.position.y).toBeCloseTo(LIFT);
        car.updateMatrixWorld(true);
        expect(new THREE.Box3().setFromObject(rims).min.y).toBeCloseTo(0.1);
    });
});
