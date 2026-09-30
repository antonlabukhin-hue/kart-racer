import { describe, it, expect } from 'vitest';
import { THEMES, THEME_LEN, BLEND_LEN, themeAt, mixHex, rampAt, runScore, runXp, planStretch, GAP_EVERY, VHS_EVERY } from '../../src/infinite.js';

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
        // старт лёгкий, первый километр почти не усложняется, потолок — к 8 км
        expect(rampAt(0)).toMatchObject({ speed: 0.85, animals: 0.55, density: 0.3, maxAnimals: 6 });
        expect(rampAt(1000).speed).toBeLessThan(0.9);
        expect(rampAt(4000).speed).toBeCloseTo(1.075, 3);
        expect(rampAt(1e6)).toMatchObject({ t: 1, speed: 1.3, animals: 2.2, maxAnimals: 14 });
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
    it('видеокассеты редкие: ~1 на 1.7 км', () => {
        let n = 0;
        for (let k = 0; k < 20; k++) n += planStretch(k * 1720, (k + 1) * 1720, seq(100 + k)).items.filter(i => i.kind === 'vhs').length;
        expect(n).toBeGreaterThanOrEqual(12);
        expect(n).toBeLessThanOrEqual(35);
        expect(VHS_EVERY).toBe(1700);
        // «Мечта» (vhsMul 2) — вдвое чаще
        let n2 = 0;
        for (let k = 0; k < 20; k++) n2 += planStretch(k * 1720, (k + 1) * 1720, seq(100 + k), { vhsMul: 2 }).items.filter(i => i.kind === 'vhs').length;
        expect(n2).toBeGreaterThan(n * 1.5);
        // кассета и усиление — не в цепочке «Е»: ближайшая «Е» дальше 18 ед.
        const p = planStretch(0, 20000, seq(21)).items;
        const es = p.filter(i => i.kind === 'echip').map(i => i.d);
        p.filter(i => i.kind === 'vhs' || i.kind === 'power').forEach(v => expect(es.every(e => Math.abs(e - v.d) > 18)).toBe(true));
    });
    it('усиления — раз в 450–750 м, всех трёх видов', () => {
        const pw = planStretch(0, 20000, seq(9)).items.filter(i => i.kind === 'power');
        expect(pw.length).toBeGreaterThan(20);
        expect(new Set(pw.map(i => i.type))).toEqual(new Set(['magnet', 'x2', 'shield']));
    });
});
