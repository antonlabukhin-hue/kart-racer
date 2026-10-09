import { describe, it, expect } from 'vitest';
import { hasField, fieldSide, fieldKind, createTractor, createCombine } from '../../src/farm.js';

describe('поле у деревни', () => {
    it('только в деревне, через участок, стороны чередуются, бывает и пашня, и пшеница', () => {
        expect(hasField(4, 'village')).toBe(true);
        expect(hasField(5, 'village')).toBe(false);
        expect(hasField(4, 'city')).toBe(false);
        expect(fieldSide(4)).not.toBe(fieldSide(6));
        const kinds = new Set([2, 4, 6, 8, 10, 12].map(fieldKind));
        expect(kinds.has('wheat') && kinds.has('plow')).toBe(true);
    });
    it('трактор и комбайн собираются в несколько мешей', () => {
        let n = 0; createTractor().traverse(function(o) { if (o.isMesh) n++; });
        expect(n).toBeLessThan(12);
        n = 0; createCombine().traverse(function(o) { if (o.isMesh) n++; });
        expect(n).toBeLessThan(12);
    });
});
