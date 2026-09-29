import { describe, it, expect } from 'vitest';
import { points, statDeltas, carStatsHtml } from '../../src/ui/car-stats.js';
import { statBars } from '../../src/upgrades.js';
import { CAR_PRESETS } from '../../src/data.js';

describe('сравнение машин', () => {
    it('баллы 1..10', () => {
        expect(points(0)).toBe(1);
        expect(points(0.44)).toBe(4);
        expect(points(1)).toBe(10);
    });
    it('у всех машин одни и те же пять шкал', () => {
        const ids = Object.keys(CAR_PRESETS);
        const names = ids.map(id => statBars(CAR_PRESETS[id], {}).map(b => b.name).join(','));
        expect(new Set(names).size).toBe(1);
        expect(names[0]).toBe('Скорость,Разгон,Управление,Прочность,Нитро');
    });
    it('Волга быстрее Ушастика, Нива прочнее', () => {
        const ch = statBars(CAR_PRESETS.cheburashka, {});
        const d1 = statDeltas(statBars(CAR_PRESETS.turbo, {}), ch);
        const d2 = statDeltas(statBars(CAR_PRESETS.kirpich, {}), ch);
        expect(d1[0]).toBeGreaterThan(0);
        expect(d2[3]).toBeGreaterThan(0);
        expect(statDeltas(ch, null)).toEqual([0, 0, 0, 0, 0]);
    });
    it('разметка: способность, шкалы, разница и экранирование', () => {
        const bars = statBars(CAR_PRESETS.turbo, {});
        const html = carStatsHtml(bars, { ability: { name: 'Ракета', desc: 'a<b' }, compare: statBars(CAR_PRESETS.cheburashka, {}), compareName: 'Ушастик', note: 'Стоимость: 20' });
        expect(html).toContain('★ Ракета');
        expect(html).toContain('a&lt;b');
        expect((html.match(/class="cs-bar"/g) || []).length).toBe(5);
        expect(html).toContain('class="up">+');
        expect(html).toContain('сравнение с «Ушастик»');
        expect(html).toContain('Стоимость: 20');
    });
});
