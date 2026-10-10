import { describe, it, expect } from 'vitest';
import { causeInfo, runGoal, runGoalHtml, TIPS } from '../../src/run-goal.js';

const NAMES = { BEAR: 'Медведь', CHICKEN: 'Курица' };

describe('одна цель на итогах', () => {
    it('причина — по-человечески и с классом угрозы', () => {
        expect(causeInfo('car:bus')).toEqual({ name: 'автобус', cls: 'car' });
        expect(causeInfo('car:sedan').name).toBe('попутка');
        expect(causeInfo('BEAR', NAMES)).toEqual({ name: 'медведь', cls: 'threat' });
        expect(causeInfo('pipe').cls).toBe('jump');
        expect(causeInfo('barrier').cls).toBe('duck');
        expect(causeInfo('gap').cls).toBe('gap');
        Object.values({ a: causeInfo('car:x'), b: causeInfo('BEAR'), c: causeInfo('pipe'), d: causeInfo('gap'), e: causeInfo('ремонт'), f: causeInfo('zzz') })
            .forEach(ci => expect(TIPS[ci.cls], ci.cls).toBeTruthy());
    });

    it('что остановило, цель из «почти» и совет', () => {
        const g = runGoal({ dist: 1234, best: 1400, crashes: [{ cause: 'car:bus', dist: 1234 }], near: [{ icon: '🏆', text: 'До рекорда не хватило 166 м' }] });
        expect(g.why).toBe('💥 Конец заезда: автобус, ' + (1234).toLocaleString('ru-RU') + ' м');
        expect(g.goal).toBe('🎯 До рекорда не хватило 166 м');
        expect(g.tip).toContain('Поворотник');
    });

    it('одно и то же несколько раз — так и сказать', () => {
        const g = runGoal({ dist: 900, crashes: [{ cause: 'car:bus', dist: 300 }, { cause: 'BEAR', dist: 500 }, { cause: 'car:van', dist: 900 }], animalNames: NAMES });
        expect(g.why).toBe('💥 2 аварии из 3 — попутки');
        const all = runGoal({ dist: 900, crashes: [{ cause: 'BEAR', dist: 300 }, { cause: 'CHICKEN', dist: 900 }], animalNames: NAMES });
        expect(all.why).toBe('💥 Все аварии — звери');
    });

    it('без «почти» — цель чуть дальше рекорда; новый рекорд — следующая веха', () => {
        expect(runGoal({ dist: 500, best: 1210, crashes: [] }).goal).toBe('🎯 Цель — ' + (1400).toLocaleString('ru-RU') + ' м');
        expect(runGoal({ dist: 2000, best: 1000, isNew: true, crashes: [] }).goal).toContain('Новый рекорд');
        expect(runGoal({ dist: 500, crashes: [] }).tip).toBe('');
    });

    it('разметка экранирует текст', () => {
        expect(runGoalHtml({ why: '<b>', goal: 'x', tip: '' })).toContain('&lt;b&gt;');
    });
});
