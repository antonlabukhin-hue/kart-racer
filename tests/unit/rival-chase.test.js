import { describe, it, expect } from 'vitest';
import { chaseTargets, nextTarget, stepChase } from '../../src/rival-chase.js';

describe('«До соперника N м»', () => {
    const rows = [{ name: 'Юл', dist: 5160 }, { name: 'Аня', dist: 900 }, { name: 'Юл', dist: 4000 }, { name: 'Я', dist: 3000 }, { name: 'Ноль', dist: 0 }];
    it('лесенка: лучший результат каждого, без себя, плюс свой рекорд — по возрастанию', () => {
        const t = chaseTargets(rows, 'Я', 3000);
        expect(t.map(x => x.name)).toEqual(['Аня', 'твой рекорд', 'Юл']);
        expect(t.find(x => x.name === 'Юл').dist).toBe(5160);
        expect(chaseTargets(rows, 'Я', 0).some(x => x.mine)).toBe(false);
    });
    it('ближайшая цель впереди и сколько до неё', () => {
        const t = chaseTargets(rows, 'Я', 3000);
        expect(nextTarget(t, 100)).toEqual({ target: t[0], left: 800 });
        expect(nextTarget(t, 4000).target.name).toBe('Юл');
        expect(nextTarget(t, 6000)).toBe(null);
    });
    it('обгон сообщается один раз; строка HUD — «До …» или «впереди всех»', () => {
        const st = { targets: chaseTargets(rows, 'Я', 3000), passed: new Set() };
        const el = { textContent: '' };
        expect(stepChase(st, 100, el)).toBe(null);
        expect(el.textContent).toBe('🎯 До Аня: 800 м');
        expect(stepChase(st, 950, el).name).toBe('Аня');
        expect(stepChase(st, 960, el)).toBe(null);
        expect(el.textContent).toContain('До рекорда');
        stepChase(st, 3100, el);
        stepChase(st, 6000, el);
        expect(el.textContent).toContain('впереди всех');
    });
});
