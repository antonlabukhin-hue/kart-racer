import { describe, it, expect } from 'vitest';
import { mistFor } from '../../src/ground-mist.js';
import { THEMES } from '../../src/infinite.js';

describe('утренний туман', () => {
    it('над полями деревни и тайги; ночью, в дождь и в городе — нет', () => {
        expect(mistFor(THEMES.find(t => t.id === 'village'))).toBe(1);
        expect(mistFor(THEMES.find(t => t.id === 'snow'))).toBeGreaterThan(0);
        ['night', 'rain', 'city', 'promzona'].forEach(id => expect(mistFor(THEMES.find(t => t.id === id))).toBe(0));
        expect(mistFor(null)).toBe(0);
    });
});
