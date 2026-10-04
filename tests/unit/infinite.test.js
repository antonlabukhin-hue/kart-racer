import { describe, it, expect } from 'vitest';
import { setThemeStart, THEMES, THEME_LEN, BLEND_LEN, themeAt, mixHex, rampAt, runScore, runXp, planStretch, GAP_EVERY, VHS_EVERY, CRATE_EVERY, SPIKES_FROM, LETTER_EVERY } from '../../src/infinite.js';

const seq = (seed) => { let s = seed; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; };

describe('бесконечная трасса: пейзажи', () => {
    it('идут по кругу, переход — в конце пейзажа', () => {
        expect(themeAt(0).theme.id).toBe('day');
        expect(themeAt(0).k).toBe(0);
        expect(themeAt(THEME_LEN - BLEND_LEN / 2).k).toBeCloseTo(0.5, 5);
        expect(themeAt(THEME_LEN + 1).theme.id).toBe(THEMES[1].id);
        expect(themeAt(THEME_LEN * THEMES.length + 5).theme.id).toBe('day');
        expect(new Set(THEMES.map(t => t.style))).toEqual(new Set(['arsenev', 'industrial', 'forest', 'junk', 'city', 'village']));
    });
    it('смешение цветов', () => {
        expect(mixHex(0x000000, 0xffffff, 0.5)).toBe(0x808080);
        expect(mixHex(0x102030, 0x102030, 0.7)).toBe(0x102030);
    });
});

describe('стартовый пейзаж', () => {
    it('каждый заезд может начаться с любого пейзажа, дальше — по кругу', () => {
        setThemeStart(3);
        expect(themeAt(0).theme.id).toBe(THEMES[3].id);
        expect(themeAt(THEME_LEN + 1).theme.id).toBe(THEMES[4].id);
        setThemeStart(THEMES.length + 1);
        expect(themeAt(0).theme.id).toBe(THEMES[1].id);
        setThemeStart(0);
        expect(themeAt(0).theme.id).toBe(THEMES[0].id);
    });
});

describe('рост сложности и счёт', () => {
    it('скорость, звери и препятствия растут и упираются в потолок', () => {
        // старт лёгкий; звери и попутки первые 1000 м как на старте, дальше плавно; потолок — к 8 км
        expect(rampAt(0)).toMatchObject({ speed: 0.765, animals: 0.55, density: 0.3, maxAnimals: 6, animalSpeed: 1, traffic: 0 });
        expect(rampAt(1000)).toMatchObject({ animals: 0.55, animalSpeed: 1, traffic: 0 });
        expect(rampAt(1000).speed).toBeGreaterThan(0.765);
        expect(rampAt(4000).speed).toBeCloseTo((0.765 + 1.3) / 2, 3);
        expect(rampAt(4000).animals).toBeGreaterThan(1);
        expect(rampAt(1e6)).toMatchObject({ t: 1, speed: 1.3, maxAnimals: 16, animalSpeed: 1.6, traffic: 8, trafficSpeed: 1.5 });
        expect(rampAt(1e6).animals).toBeCloseTo(2.6, 6);
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
    it('после магнита — «Е» вдоль обеих обочин', () => {
        const p = planStretch(0, 20000, seq(9)).items;
        const mag = p.find(i => i.kind === 'power' && i.type === 'magnet');
        const side = p.filter(i => i.side && i.d > mag.d && i.d < mag.d + 200);
        expect(side.some(i => i.x < -3)).toBe(true);
        expect(side.some(i => i.x > 3)).toBe(true);
        expect(side.length).toBeGreaterThan(40);
    });
    it('усиления — раз в 450–750 м, всех трёх видов', () => {
        const pw = planStretch(0, 20000, seq(9)).items.filter(i => i.kind === 'power');
        expect(pw.length).toBeGreaterThan(20);
        expect(new Set(pw.map(i => i.type))).toEqual(new Set(['magnet', 'x2', 'shield']));
    });
    it('буквы «Слова дня» — только пока слово не собрано, раз в 260–420 м', () => {
        expect(planStretch(0, 5000, seq(4)).items.some(i => i.kind === 'letter')).toBe(false);
        const l = planStretch(0, 5000, seq(4), { letters: true }).items.filter(i => i.kind === 'letter');
        expect(l.length).toBeGreaterThan(5000 / LETTER_EVERY[1] * 0.6);
        expect(l.length).toBeLessThan(5000 / LETTER_EVERY[0] * 1.2);
    });
    it('ящики «?» — раз в 260–420 м; шипы — только после SPIKES_FROM и чем дальше, тем чаще', () => {
        const p = planStretch(0, 20000, seq(13)).items;
        const cr = p.filter(i => i.kind === 'crate' && !i.pat); // ящики узоров — сверх этого (src/patterns.js)
        // часть мест занята узорами — одиночек чуть меньше, вместе с ящиками узоров — не больше ~1 на 160 м
        expect(cr.length).toBeGreaterThan(20000 / CRATE_EVERY[1] * 0.5);
        expect(cr.length).toBeLessThan(20000 / CRATE_EVERY[0] * 1.2);
        expect(p.filter(i => i.kind === 'crate').length).toBeLessThan(20000 / 160);
        const es = p.filter(i => i.kind === 'echip' && !i.side).map(i => i.d);
        cr.forEach(c => expect(es.every(e => Math.abs(e - c.d) > 18)).toBe(true));
        // шипы-одиночки — после SPIKES_FROM; шипы узоров — тоже
        expect(planStretch(0, SPIKES_FROM, seq(3)).items.some(i => i.kind === 'spikes')).toBe(false);
        let early = 0, late = 0;
        for (let k = 0; k < 10; k++) {
            early += planStretch(600, 2600, seq(40 + k)).items.filter(i => i.kind === 'spikes').length;
            late += planStretch(8000, 10000, seq(40 + k)).items.filter(i => i.kind === 'spikes').length;
        }
        expect(early).toBeGreaterThan(20);
        expect(late).toBeGreaterThan(early * 1.4);
    });
});

import { weekTheme } from '../../src/infinite.js';
describe('событие недели', () => {
    it('всю неделю — один пейзаж, со следующего понедельника — другой; за 7 недель — все', () => {
        const mon = new Date(2026, 8, 28, 10), sun = new Date(2026, 9, 4, 22), next = new Date(2026, 9, 5, 1);
        expect(weekTheme(mon).theme.id).toBe(weekTheme(sun).theme.id);
        expect(weekTheme(next).theme.id).not.toBe(weekTheme(mon).theme.id);
        const ids = new Set();
        for (let w = 0; w < 7; w++) ids.add(weekTheme(new Date(2026, 8, 28 + w * 7, 12)).theme.id);
        expect(ids.size).toBe(7);
        expect(weekTheme(mon).short.length).toBeLessThanOrEqual(9);
    });
});

import { warmStart, WARM_MAX } from '../../src/infinite.js';
describe('горячий старт', () => {
    it('новичку — с нуля, опытному — треть рекорда, не дальше потолка', () => {
        expect(warmStart(0)).toBe(0);
        expect(warmStart(999)).toBe(0);
        expect(warmStart(2000)).toBe(600);
        expect(warmStart(50000)).toBe(WARM_MAX);
    });
    it('сложность и план — как на warm м дальше', () => {
        expect(rampAt(0, 1500)).toEqual(rampAt(1500));
        expect(planStretch(0, 500, seq(3), { warm: 0 }).items.some(i => i.kind === 'spikes')).toBe(false);
        expect(planStretch(0, 500, seq(3), { warm: 1500 }).items.some(i => i.kind === 'spikes')).toBe(true);
        let cold = 0, warm = 0;
        for (let k = 0; k < 10; k++) {
            cold += planStretch(0, 1000, seq(70 + k)).items.filter(i => i.kind === 'spikes').length;
            warm += planStretch(0, 1000, seq(70 + k), { warm: 1500 }).items.filter(i => i.kind === 'spikes').length;
        }
        expect(warm).toBeGreaterThan(cold);
    });
});
