import { describe, it, expect } from 'vitest';
import { tasksForChapter, evaluateTasks, mergeTaskProgress, TASK_DEFS, chapterTaskProgress, taskKey, chapterHasTask } from '../../src/chapter-tasks.js';

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

describe('новые задания и перенос прогресса', () => {
    it('в главах есть перелёт зверя, таран босса и чистый отрезок', () => {
        const ids = new Set();
        for (let i = 0; i < 17; i++) tasksForChapter(i, 'easy').forEach(t => ids.add(t.id));
        ['jumpAnimal', 'bossRam', 'clean'].forEach(id => expect(ids.has(id)).toBe(true));
        const i = [...Array(17).keys()].find(k => chapterHasTask(k, 'bossRam'));
        const pos = tasksForChapter(i, 'easy').findIndex(t => t.id === 'bossRam');
        expect(evaluateTasks(i, 'easy', { state: 'win', strikes: 9, bossRams: 2 })[pos]).toBe(true);
        expect(evaluateTasks(i, 'easy', { state: 'win', strikes: 9, bossRams: 1 })[pos]).toBe(false);
        expect(chapterHasTask(0, 'jumpAnimal')).toBe(false);
    });

    it('старый прогресс переносится по id заданий, новый ключ важнее старого', () => {
        // глава 1 не менялась — всё как было
        expect(chapterTaskProgress({ c01: [true, false, true] }, 'c01', 0)).toEqual([true, false, true]);
        // глава 3 (idx 2): было noCrash, star, nearMiss — осталось так же
        expect(chapterTaskProgress({ c03: [true, true, false] }, 'c03', 2)).toEqual([true, true, false]);
        // глава 4 (idx 3): было fast, star, noNitro → стало fast, bossRam, noNitro
        expect(chapterTaskProgress({ c04: [true, true, true] }, 'c04', 3)).toEqual([true, false, true]);
        expect(chapterTaskProgress({ c04: [true, true, true], [taskKey('c04')]: [false, true, false] }, 'c04', 3)).toEqual([false, true, false]);
        expect(chapterTaskProgress(null, 'c04', 3)).toEqual([false, false, false]);
    });
});
