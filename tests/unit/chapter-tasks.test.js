import { describe, it, expect } from 'vitest';
import { tasksForChapter, evaluateTasks, mergeTaskProgress, TASK_DEFS } from '../../src/chapter-tasks.js';

describe('задания глав', () => {
    it('в каждой из 17 глав три разных задания с текстом', () => {
        for (let i = 0; i < 17; i++) {
            const t = tasksForChapter(i, 'hard');
            expect(t).toHaveLength(3);
            expect(new Set(t.map(x => x.id)).size).toBe(3);
            t.forEach(x => { expect(TASK_DEFS[x.id]).toBeTruthy(); expect(x.text.length).toBeGreaterThan(3); });
        }
    });

    it('проигрыш ничего не засчитывает', () => {
        expect(evaluateTasks(0, 'easy', { state: 'crash', strikes: 0, starsPicked: 3, gumPicked: 3 })).toEqual([false, false, false]);
    });

    it('задания проверяются по итогам заезда', () => {
        // гл. 1: не больше 1 аварии, звезда, 2 жвачки
        expect(evaluateTasks(0, 'easy', { state: 'win', strikes: 1, starsPicked: 1, gumPicked: 0 })).toEqual([true, true, false]);
        // «быстрее» — по целевому времени сложности
        const idx = [...Array(17).keys()].find(i => tasksForChapter(i, 'hard').some(t => t.id === 'fast'));
        const pos = tasksForChapter(idx, 'hard').findIndex(t => t.id === 'fast');
        expect(evaluateTasks(idx, 'hard', { state: 'win', strikes: 3, time: 70 })[pos]).toBe(true);
        expect(evaluateTasks(idx, 'hard', { state: 'win', strikes: 3, time: 80 })[pos]).toBe(false);
    });

    it('прогресс копится, награда — только за первое выполнение', () => {
        const a = mergeTaskProgress(null, [true, false, false]);
        expect(a).toEqual({ done: [true, false, false], newly: 1 });
        const b = mergeTaskProgress(a.done, [true, true, false]);
        expect(b).toEqual({ done: [true, true, false], newly: 1 });
    });
});
