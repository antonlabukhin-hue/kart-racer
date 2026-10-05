import { describe, it, expect } from 'vitest';
import { pickMeme, MEMES } from '../../src/memes.js';

describe('мем-моменты', () => {
    it('не повторяет прошлый; честный заезд — только обочина; веса учитываются', () => {
        let r = 0;
        const seq = () => { r = (r + 0.137) % 1; return r; };
        const seen = {};
        let prev = null;
        for (let i = 0; i < 300; i++) { const m = pickMeme(prev, seq); expect(m.id).not.toBe(prev); seen[m.id] = (seen[m.id] || 0) + 1; prev = m.id; }
        MEMES.forEach(m => expect(seen[m.id]).toBeGreaterThan(0));
        for (let i = 0; i < 50; i++) expect(pickMeme(null, seq, true).kind).toBe('side');
    });
});
