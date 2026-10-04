import { describe, it, expect } from 'vitest';
import { cellRect, createBatch, box, cyl, gable, template, place, CELLS, COLS, ROWS } from '../../src/scenery-kit.js';

describe('набор пейзажей: геометрия одним пластом', () => {
    it('клетки атласа — внутри картинки и не налезают на соседей', () => {
        Object.keys(CELLS).forEach(function(k) {
            const r = cellRect(k);
            expect(r.u0).toBeGreaterThanOrEqual(0); expect(r.u1).toBeLessThanOrEqual(1);
            expect(r.v0).toBeGreaterThanOrEqual(0); expect(r.v1).toBeLessThanOrEqual(1);
            expect(r.u1 - r.u0).toBeLessThan(1 / COLS); expect(r.v1 - r.v0).toBeLessThan(1 / ROWS);
        });
        const s0 = cellRect('signsA', 0, 4), s3 = cellRect('signsA', 3, 4);
        expect(s0.v0).toBeGreaterThan(s3.v1 - 1e-6); // полосы вывесок — сверху вниз
    });
    it('коробка — 5 граней по 6 вершин, нормали смотрят наружу', () => {
        const b = createBatch();
        box(b, 0, 0, 0, 2, 2, 2);
        expect(b.p.length / 3).toBe(30);
        // для каждой вершины: нормаль · (вершина − центр) > 0
        for (let i = 0; i < b.p.length; i += 3) {
            const d = b.n[i] * b.p[i] + b.n[i + 1] * (b.p[i + 1] - 1) + b.n[i + 2] * b.p[i + 2];
            expect(d).toBeGreaterThan(0);
        }
    });
    it('треугольники закручены наружу (иначе грань не видна)', () => {
        const b = createBatch();
        box(b, 0, 0, 0, 2, 2, 2); cyl(b, 5, 0, 0, 1, 0.5, 2, 6); gable(b, -5, 0, 0, 2, 2, 1);
        for (let i = 0; i < b.p.length; i += 9) {
            const a = [b.p[i], b.p[i + 1], b.p[i + 2]], c = [b.p[i + 3], b.p[i + 4], b.p[i + 5]], d = [b.p[i + 6], b.p[i + 7], b.p[i + 8]];
            const u = [c[0] - a[0], c[1] - a[1], c[2] - a[2]], v = [d[0] - a[0], d[1] - a[1], d[2] - a[2]];
            const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
            expect(n[0] * b.n[i] + n[1] * b.n[i + 1] + n[2] * b.n[i + 2]).toBeGreaterThan(0);
        }
    });
    it('шаблон строится один раз; поворот на 180° — фасад к дороге справа', () => {
        let built = 0;
        const t1 = template('test_t', function(b) { built++; box(b, 1, 0, 0, 0.2, 1, 1); });
        const t2 = template('test_t', function(b) { built++; });
        expect(t1).toBe(t2); expect(built).toBe(1);
        const b = createBatch();
        place(b, t1, 10, 0, -5, 2);
        expect(Math.min(...b.p.filter((_, i) => i % 3 === 0))).toBeCloseTo(8.9, 5); // был x=+1 — стал −1 от точки
        const nx = b.n.filter((_, i) => i % 3 === 0);
        expect(Math.min(...nx)).toBe(-1);
    });
});
