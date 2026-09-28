import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { curveAt, MAX_TURN, MAX_HILL, install, CURVE } from '../../src/curved-world.js';

describe('кривой мир', () => {
    it('на старте мир ровный, дальше изгиб в пределах', () => {
        expect(curveAt(0, 1)).toEqual({ x: 0, y: 0 });
        for (let d = 0; d < 3000; d += 37) {
            const c = curveAt(d, 2.5);
            expect(Math.abs(c.x)).toBeLessThanOrEqual(MAX_TURN + 1e-9);
            expect(Math.abs(c.y)).toBeLessThanOrEqual(MAX_HILL + 1e-9);
        }
    });

    it('повороты бывают в обе стороны, сила 0 — прямо', () => {
        const xs = [];
        for (let d = 60; d < 2000; d += 20) xs.push(curveAt(d, 0.7).x);
        expect(Math.min(...xs)).toBeLessThan(-MAX_TURN * 0.4);
        expect(Math.max(...xs)).toBeGreaterThan(MAX_TURN * 0.4);
        expect(curveAt(500, 1, 0)).toEqual({ x: 0, y: 0 });
    });

    it('шейдеры получают изгиб, тени — нет', () => {
        install();
        const sh = { vertexShader: THREE.ShaderLib.standard.vertexShader, uniforms: {} };
        new THREE.MeshStandardMaterial().onBeforeCompile(sh);
        expect(sh.vertexShader).toContain('bendView( mvPosition )');
        expect(sh.uniforms.uWorldCurve).toBe(CURVE);
        const depth = { vertexShader: THREE.ShaderLib.depth.vertexShader, uniforms: {} };
        new THREE.MeshDepthMaterial().onBeforeCompile(depth);
        expect(depth.vertexShader).not.toContain('bendView');
        // свой шейдер с gl_Position = projectionMatrix * mvPosition (частицы) — тоже
        const pts = { vertexShader: 'void main() {\n vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);\n gl_Position = projectionMatrix * mvPosition;\n}', uniforms: {} };
        new THREE.ShaderMaterial().onBeforeCompile(pts);
        expect(pts.vertexShader).toContain('bendView( mvPosition )');
    });
});
