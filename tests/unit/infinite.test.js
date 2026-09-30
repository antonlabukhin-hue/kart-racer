import { describe, it, expect } from 'vitest';
import { THEMES, THEME_LEN, BLEND_LEN, themeAt, mixHex, rampAt, runScore, runXp, planStretch, GAP_EVERY } from '../../src/infinite.js';

const seq = (seed) => { let s = seed; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; };

describe('бесконечная трасса: пейзажи', () => {
    it('идут по кругу, переход — в конце пейзажа', () => {
        expect(themeAt(0).theme.id).toBe('day');
        expect(themeAt(0).k).toBe(0);
        expect(themeAt(THEME_LEN - BLEND_LEN / 2).k).toBeCloseTo(0.5, 5);
        expect(themeAt(THEME_LEN + 1).theme.id).toBe(THEMES[1].id);
        expect(themeAt(THEME_LEN * THEMES.length + 5).theme.id).toBe('day');
        expect(new Set(THEMES.map(t => t.style))).toEqual(new Set(['arsenev', 'industrial', 'forest', 'junk']));
    });
    it('смешение цветов', () => {
        expect(mixHex(0x000000, 0xffffff, 0.5)).toBe(0x808080);
        expect(mixHex(0x102030, 0x102030, 0.7)).toBe(0x102030);
    });
});

describe('рост сложности и счёт', () => {
    it('скорость, звери и препятствия растут и упираются в потолок', () => {
        expect(rampAt(0)).toMatchObject({ speed: 1, animals: 1, density: 0.5 });
        expect(rampAt(3000).speed).toBeGreaterThan(1.2);
        expect(rampAt(1e6)).toMatchObject({ t: 1, speed: 1.35, animals: 1.8 });
    });
    it('очки и опыт', () => {
        expect(runScore(1234.4, 7, 150)).toBe(1234 + 70 + 150);
        expect(runXp(1000)).toBe(50);
    });
});

describe('план участка', () => {
    it('разломы не чаще GAP_EVERY; вокруг разлома нет препятствий; над разломом — дуга «Е»', () => {
        const p = planStretch(0, 3000, seq(7), { slide: 'ice' });
        const gaps = p.items.filter(i => i.kind === 'gap').map(i => i.d);
        expect(gaps.length).toBeGreaterThan(3);
        for (let i = 1; i < gaps.length; i++) expect(gaps[i] - gaps[i - 1]).toBeGreaterThanOrEqual(GAP_EVERY[0]);
        p.items.filter(i => i.kind === 'obstacle').forEach(o => gaps.forEach(g => expect(o.d <= g - 50 || o.d >= g + 20).toBe(true)));
        expect(p.items.some(i => i.kind === 'obstacle' && i.type === 'ice')).toBe(true);
        const arc = p.items.filter(i => i.kind === 'echip' && i.y > 1);
        expect(arc.length).toBeGreaterThan(0);
    });
    it('участки стыкуются: следующий разлом переносится', () => {
        const a = planStretch(0, 500, seq(3));
        const b = planStretch(500, 1000, seq(4), { nextGap: a.nextGap });
        const all = a.items.concat(b.items).filter(i => i.kind === 'gap').map(i => i.d);
        for (let i = 1; i < all.length; i++) expect(all[i] - all[i - 1]).toBeGreaterThanOrEqual(GAP_EVERY[0]);
    });
    it('чем дальше, тем больше препятствий; «Е» есть всегда', () => {
        const early = planStretch(0, 1000, seq(11)).items.filter(i => i.kind === 'obstacle').length;
        const late = planStretch(6000, 7000, seq(11)).items.filter(i => i.kind === 'obstacle').length;
        expect(late).toBeGreaterThan(early);
        expect(planStretch(0, 1000, seq(5)).items.filter(i => i.kind === 'echip').length).toBeGreaterThan(20);
    });
});
