import { describe, it, expect } from 'vitest';
import { takeRotateHint, rotatedOnce, rotateHintText, HINT_RACES } from '../../src/rotate-hint.js';

const mem = () => { const d = {}; return { getItem: k => (k in d ? d[k] : null), setItem: (k, v) => { d[k] = String(v); } }; };

describe('подсказка «можно повернуть телефон»', () => {
    it('первые заезды — да, потом нет; повернул сам — больше никогда', () => {
        const st = mem();
        for (let i = 0; i < HINT_RACES; i++) expect(takeRotateHint(st)).toBe(true);
        expect(takeRotateHint(st)).toBe(false);
        const st2 = mem();
        expect(takeRotateHint(st2)).toBe(true);
        rotatedOnce(st2);
        expect(takeRotateHint(st2)).toBe(false);
    });
    it('текст — под положение телефона', () => {
        expect(rotateHintText(true)).toContain('боком');
        expect(rotateHintText(false)).toContain('вертикально');
    });
});
