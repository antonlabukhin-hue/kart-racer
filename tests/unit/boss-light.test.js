import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';

// createArcadeBossMesh рисует canvas-текстуры — в node подставляем заглушку canvas
function fakeCanvas() {
    const ctx = new Proxy({}, { get: (t, k) => (k in t ? t[k] : () => ({ addColorStop() {} })), set: (t, k, v) => { t[k] = v; return true; } });
    return { width: 0, height: 0, getContext: () => ctx };
}

describe('облегчённый босс на слабых устройствах', () => {
    beforeEach(() => {
        globalThis.window = globalThis.window || {};
        globalThis.document = { createElement: () => fakeCanvas() };
        window.__bossMatCache = {};
    });
    const meshes = (g) => { let n = 0; g.traverse(o => { if (o.isMesh) n++; }); return n; };

    it('на «Низком» качестве у босса нет контура — мешей меньше', async () => {
        const { createArcadeBossMesh, CAMPAIGN_BOSSES } = await import('../../src/boss.js');
        window.__isMobile = false;
        window.__lastQuality = 'medium';
        const full = meshes(createArcadeBossMesh(CAMPAIGN_BOSSES[0]));
        window.__lastQuality = 'low';
        const low = createArcadeBossMesh(CAMPAIGN_BOSSES[0]);
        let outlines = 0; low.traverse(o => { if (o.userData && o.userData.isOutline) outlines++; });
        expect(outlines).toBe(0);
        expect(meshes(low)).toBeLessThan(full);
        expect(low).toBeInstanceOf(THREE.Group);
    });
});
