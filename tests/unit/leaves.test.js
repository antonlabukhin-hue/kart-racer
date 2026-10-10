import { describe, it, expect } from 'vitest';
import { leafStep, LEAF_FALL } from '../../src/leaves.js';

describe('листопад', () => {
    it('лист падает вниз, ветер сносит вбок, на скорости — сильнее назад', () => {
        const a = leafStep(0.1, 0, 0, 0), b = leafStep(0.1, 1, 0, 0);
        expect(a[1]).toBeLessThan(0);
        expect(a[1]).toBeGreaterThan(-(LEAF_FALL + 1) * 0.1);
        expect(a[0]).toBeGreaterThan(0);
        expect(b[2]).toBeGreaterThan(a[2]);
    });
});
