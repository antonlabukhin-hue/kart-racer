import { describe, it, expect } from 'vitest';
import { pickForStyle, STYLE_EVENTS, STYLE_LANDMARKS } from '../../src/landmarks.js';
import { THEMES } from '../../src/infinite.js';

describe('сцены по пейзажу', () => {
    it('в каждом пейзаже есть свои приметы; градирня — только в промзоне', () => {
        THEMES.forEach(function(t) { expect(STYLE_LANDMARKS[t.style], t.id).toBeTruthy(); });
        Object.keys(STYLE_LANDMARKS).forEach(function(s) { if (s !== 'industrial') expect(STYLE_LANDMARKS[s]).not.toContain('coolingTower'); });
        expect(STYLE_EVENTS.village).toContain('tractor');
        expect(STYLE_EVENTS.junk).toContain('magnet');
    });
    it('не повторяет уже поставленное, пока есть выбор', () => {
        const seq = [0, 0.99];
        let k = 0; const r = function() { return seq[k++ % seq.length]; };
        const a = pickForStyle('junk', 'event', r);
        const b = pickForStyle('junk', 'event', r, [a]);
        expect(b).not.toBe(a);
        expect(pickForStyle('нет такого', 'event', r)).toBe(null);
    });
});
