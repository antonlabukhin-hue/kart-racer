import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { BIOME_PLAN, BIOME_INFO, biomeAt, biomeIndexAt, groundColorAt, forestTrees } from '../../src/biomes.js';

describe('смена окружения по ходу трассы', () => {
    it('на каждой карте три разные зоны, у всех есть цвет и название', () => {
        Object.entries(BIOME_PLAN).forEach(([map, plan]) => {
            expect(plan, map).toHaveLength(3);
            expect(new Set(plan.map(z => z.style)).size).toBe(3);
            plan.forEach(z => { expect(BIOME_INFO[z.style]).toBeTruthy(); });
        });
    });

    it('Арсеньев: город → тайга → промзона; неизвестная карта — как Арсеньев', () => {
        expect([0.1, 0.5, 0.9].map(p => biomeAt('arsenev', p))).toEqual(['town', 'forest', 'industrial']);
        expect(biomeAt('нет', 0.5)).toBe('forest');
        expect(biomeIndexAt('arsenev', 0.36)).toBe(1);
    });

    it('цвет земли меняется плавно у границы и чисто — внутри зоны', () => {
        const inside = groundColorAt('arsenev', 0.5).getHex();
        expect(inside).toBe(BIOME_INFO.forest.ground);
        const a = groundColorAt('arsenev', 0.355), b = groundColorAt('arsenev', 0.365);
        // по обе стороны границы цвета почти совпадают (смесь 50/50)
        const dist = Math.abs(a.r - b.r) + Math.abs(a.g - b.g) + Math.abs(a.b - b.b);
        expect(dist).toBeLessThan(0.05);
        expect(groundColorAt('arsenev', 0.36, new THREE.Color())).toBeInstanceOf(THREE.Color);
    });
});

describe('лес стеной', () => {
    it('деревья только в лесной зоне и не на дороге', () => {
        const zAt = p => 700 - p * 1400;
        const trees = forestTrees('arsenev', zAt, 6, 200);
        expect(trees.length).toBe(Math.round(0.34 * 200));
        trees.forEach(t => {
            expect(Math.abs(t.x)).toBeGreaterThan(6);
            const p = (700 - t.z) / 1400;
            expect(p).toBeGreaterThanOrEqual(0.36);
            expect(p).toBeLessThanOrEqual(0.7);
        });
        expect(new Set(trees.map(t => t.kind))).toEqual(new Set(['pine', 'birch']));
    });
});
