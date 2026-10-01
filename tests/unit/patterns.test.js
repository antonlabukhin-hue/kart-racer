import { describe, it, expect } from 'vitest';
import { PATTERNS, pickPattern, expandPattern, patternSpan, patternGap, PATTERN_GAP } from '../../src/patterns.js';
import { planStretch } from '../../src/infinite.js';

const seq = (seed) => { let s = seed; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; };
const LX = [-2, 0, 2];
// полоса перекрыта предметом, если машина (по центру полосы) его заденет: шипы — 0.95, яма/кочка — 0.42, пятно — 0.55
const R = { spikes: 0.95, pothole: 0.42, bump: 0.42, oil: 0.55 };
function blocked(items, lane, d) {
    return items.some(it => (it.kind === 'obstacle' || it.kind === 'spikes') && Math.abs(it.d - d) < 0.5
        && Math.abs((it.x != null ? it.x : LX[it.lane]) - LX[lane]) < (R[it.kind === 'spikes' ? 'spikes' : it.type] || 0.55) + 0.5);
}

describe('узоры бесконечной трассы', () => {
    it('в каждом ряду узора хотя бы одна полоса свободна, и «Е» лежат только на свободных', () => {
        PATTERNS.forEach(p => [false, true].forEach(mirror => {
            const items = expandPattern(p, 0, mirror);
            const rows = [...new Set(items.filter(i => i.kind === 'obstacle' || i.kind === 'spikes').map(i => i.d))];
            rows.forEach(d => expect([0, 1, 2].some(l => !blocked(items, l, d)), p.id + ' ряд ' + d).toBe(true));
            items.filter(i => i.kind === 'echip' || i.kind === 'crate').forEach(e => expect(blocked(items, e.lane, e.d), p.id + ' «Е» на ' + e.d).toBe(false));
        }));
    });
    it('чем дальше, тем больше разных узоров и тем они чаще', () => {
        const ids = (t, sp) => { const r = seq(12345); return new Set(Array.from({ length: 300 }, () => pickPattern(t, sp, r).id)); };
        expect(ids(0, false).size).toBeLessThan(ids(1, true).size);
        expect(ids(1, true).size).toBe(PATTERNS.length);
        expect([...ids(1, false)].some(id => PATTERNS.find(p => p.id === id).spikes)).toBe(false);
        expect(patternGap(0)).toBe(PATTERN_GAP[0]);
        expect(patternGap(1)).toBe(PATTERN_GAP[1]);
    });
    it('зеркало меняет крайние полосы', () => {
        const p = PATTERNS.find(x => x.id === 'gate');
        expect(expandPattern(p, 100, false).filter(i => i.kind === 'echip').every(i => i.lane === 2)).toBe(true);
        expect(expandPattern(p, 100, true).filter(i => i.kind === 'echip').every(i => i.lane === 0)).toBe(true);
        expect(patternSpan(p)[0]).toBeLessThan(0);
    });
    it('план участка: узоры есть, не у разломов, не налезают друг на друга; шипы узоров — после 600 м', () => {
        const items = planStretch(0, 20000, seq(5)).items;
        const pats = {};
        items.filter(i => i.pat).forEach(i => { (pats[i.pat] = pats[i.pat] || []).push(i.d); });
        const spans = Object.values(pats).map(ds => [Math.min(...ds), Math.max(...ds)]).sort((a, b) => a[0] - b[0]);
        expect(spans.length).toBeGreaterThan(20000 / (PATTERN_GAP[0] + 60));
        for (let i = 1; i < spans.length; i++) expect(spans[i][0]).toBeGreaterThan(spans[i - 1][1]);
        const gaps = items.filter(i => i.kind === 'gap').map(i => i.d);
        spans.forEach(s => gaps.forEach(g => expect(s[1] < g - 50 || s[0] > g + 20).toBe(true)));
        expect(items.some(i => i.pat && i.kind === 'spikes' && i.d < 600)).toBe(false);
        // скользкие пятна узора — по пейзажу участка
        expect(planStretch(0, 3000, seq(8), { slide: 'ice' }).items.some(i => i.pat && i.type === 'ice')).toBe(true);
    });
});

import { dropBusy } from '../../src/patterns.js';
describe('узор целиком или никак', () => {
    it('задетый занятым местом узор убирается весь, одиночки — по месту', () => {
        const items = [{ d: 10, pat: 1 }, { d: 20, pat: 1 }, { d: 30 }, { d: 40, pat: 2 }, { d: 55 }];
        expect(dropBusy(items, d => d > 15 && d < 25).map(i => i.d)).toEqual([30, 40, 55]);
        expect(dropBusy(items, d => d === 55).map(i => i.d)).toEqual([10, 20, 30, 40]);
    });
});
