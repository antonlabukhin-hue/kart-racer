import { describe, it, expect } from 'vitest';
import { showMoveArrows, countArrowRun, ARROW_RUNS, REFRESH_RUNS, MOVES_VERSION } from '../../src/move-tutor.js';

const run = function(p) { countArrowRun(p); p.infinite = { runs: ((p.infinite && p.infinite.runs) || 0) + 1 }; };

describe('стрелки движений', () => {
    it('новичку — первые три заезда, потом не показываются', () => {
        const p = {};
        for (let i = 0; i < ARROW_RUNS; i++) { expect(showMoveArrows(p)).toBe(true); run(p); }
        expect(showMoveArrows(p)).toBe(false);
    });
    it('старому игроку после обновления — ещё два заезда', () => {
        const p = { infinite: { runs: 40 } };
        for (let i = 0; i < REFRESH_RUNS; i++) { expect(showMoveArrows(p)).toBe(true); run(p); }
        expect(showMoveArrows(p)).toBe(false);
    });
    it('новая версия управления — снова два заезда', () => {
        const p = { infinite: { runs: 40 }, moveTutor: { v: MOVES_VERSION - 1, runs: REFRESH_RUNS } };
        expect(showMoveArrows(p)).toBe(true);
        run(p); expect(p.moveTutor).toEqual({ v: MOVES_VERSION, runs: 1 });
    });
});
