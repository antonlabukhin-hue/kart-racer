import { describe, it, expect, afterEach, vi } from 'vitest';
import * as THREE from 'three';
import { ParticleSystem } from '../../src/particles.js';

// explode() и emit() берут качество из window.__lastQuality
function burst(quality, fn) {
    vi.stubGlobal('window', { __lastQuality: quality });
    const ps = new ParticleSystem(new THREE.Scene());
    fn(ps);
    return ps.particleIndex;
}

describe('ParticleSystem', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('взрыв гуще на высоком качестве', () => {
        const boom = ps => ps.explode({ x: 0, y: 0, z: 0 }, 1);
        expect(burst('low', boom)).toBe(17);
        expect(burst('medium', boom)).toBe(27);
        expect(burst('high', boom)).toBe(40);
    });

    it('пыль: на низком качестве вдвое реже, но хотя бы одна частица', () => {
        const dust = n => ps => ps.emit({ x: 0, y: 0, z: 0 }, null, n);
        expect(burst('high', dust(4))).toBe(8);
        expect(burst('medium', dust(4))).toBe(4);
        expect(burst('low', dust(4))).toBe(2);
        expect(burst('low', dust(1))).toBe(1);
    });

    it('выключенная система ничего не создаёт', () => {
        vi.stubGlobal('window', {});
        const ps = new ParticleSystem(new THREE.Scene());
        ps.enabled = false;
        ps.explode({ x: 0, y: 0, z: 0 }, 1);
        ps.emit({ x: 0, y: 0, z: 0 });
        expect(ps.particleIndex).toBe(0);
    });

    it('dispose убирает частицы со сцены', () => {
        vi.stubGlobal('window', {});
        const scene = new THREE.Scene();
        const ps = new ParticleSystem(scene);
        expect(scene.children).toContain(ps.points);
        ps.dispose();
        expect(scene.children).not.toContain(ps.points);
    });
});
