import { describe, it, expect } from 'vitest';
import { createChaseState, onCrash, tickChase, CHASE_TIME } from '../../src/police-chase.js';

describe('погоня ГАИ', () => {
    it('первая авария — погоня на CHASE_TIME с; вторая за это время — поймали', () => {
        const st = createChaseState();
        expect(onCrash(st)).toBe('chase');
        expect(st.t).toBe(CHASE_TIME);
        tickChase(st, 3);
        expect(onCrash(st)).toBe('caught');
        expect(st.t).toBe(0);
    });
    it('отстала — следующая авария снова только погоня', () => {
        const st = createChaseState();
        onCrash(st);
        tickChase(st, CHASE_TIME + 1);
        expect(st.t).toBe(0);
        expect(onCrash(st)).toBe('chase');
    });
});
