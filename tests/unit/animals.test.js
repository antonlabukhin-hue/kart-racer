import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as THREE from 'three';
import { AnimalSpawner } from '../../src/animals.js';

// Модуль видит index.html только через window: createAnimalMesh и showAnimalShout
let shout;
beforeEach(() => {
    shout = vi.fn();
    vi.stubGlobal('window', { createAnimalMesh: () => new THREE.Group() });
    vi.stubGlobal('showAnimalShout', shout);
});
afterEach(() => vi.unstubAllGlobals());

// Трасса идёт от z=0 к финишу z=-1000
const spawner = (opts = {}) => new AnimalSpawner(new THREE.Scene(), 10, 0, -1000, 15, 3, 0.5, 1, 'startZ' in opts ? opts.startZ : 0);

describe('AnimalSpawner', () => {
    it('звери выбегают на дорогу и кричат', () => {
        const sp = spawner();
        let z = 0;
        for (let i = 0; i < 600; i++) { z -= 0.5; sp.update(0.05, z); }
        expect(sp.totalSpawned).toBeGreaterThan(0);
        expect(shout).toHaveBeenCalled();
    });

    it('за финишем звери не появляются', () => {
        const sp = spawner();
        for (let i = 0; i < 200; i++) sp.update(0.05, -1001);
        expect(sp.totalSpawned).toBe(0);
    });

    it('не больше maxAnimals зверей одновременно', () => {
        const sp = spawner();
        let z = 0;
        for (let i = 0; i < 600; i++) {
            z -= 0.5; sp.update(0.05, z);
            expect(sp.animals.length).toBeLessThanOrEqual(3);
        }
    });

    // Регрессия 24.09: без startZ поправка к финишу молча не работала
    it('к финишу звери перебегают быстрее', () => {
        const run = (sp, playerZ) => {
            const a = sp.createAnimal(playerZ - 10, 'DOG');
            a.duration = 1; a._trigDist = 15;
            sp.updateAnimal(a, 0.016, playerZ);
            expect(a.triggered).toBe(true);
            return a.duration;
        };
        expect(run(spawner(), 0)).toBe(1);
        expect(run(spawner(), -990)).toBeLessThan(0.95);
        expect(run(spawner({ startZ: undefined }), -990)).toBe(1);
    });
});
