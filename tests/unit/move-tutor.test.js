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

import { createIntro, introAct, INTRO_ACTS, INTRO_MAX } from '../../src/move-tutor.js';
describe('стрелки в начале заезда', () => {
    it('по очереди четыре действия: выполнил — следующее, потом — ничего', () => {
        const st = createIntro(), seen = [];
        for (let i = 0; i < 400; i++) {
            const a = introAct(st, 0.05, {});
            if (a && seen[seen.length - 1] !== a) seen.push(a);
            if (a) introAct(st, 0.05, { [a]: true });
        }
        expect(seen).toEqual(INTRO_ACTS);
        expect(introAct(st, 0.05, {})).toBe(null);
    });
    it('не выполнил — стрелка сама гаснет и показывается следующая', () => {
        const st = createIntro();
        let a; for (let t = 0; t < INTRO_MAX + 0.2; t += 0.1) a = introAct(st, 0.1, {});
        expect(a).toBe('right');
    });
});
describe('стрелки: нажал сразу', () => {
    it('нажатие раньше INTRO_MIN не теряется', () => {
        const st = createIntro();
        introAct(st, 0.1, { left: true });
        let a; for (let i = 0; i < 10; i++) a = introAct(st, 0.1, {});
        expect(a).toBe('right');
    });
});
