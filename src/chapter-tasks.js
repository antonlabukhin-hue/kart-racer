/**
 * Три задания на главу кампании — повод перепройти главу без нового контента.
 * Набор заданий на главу детерминирован (одинаков у всех игроков), первое выполнение — +3 фишки.
 * Прогресс: profile.campaign.tasks[taskKey(trackId)] = [bool, bool, bool] (по позициям набора текущей ревизии).
 * Ревизия 1 хранилась под ключом trackId — при чтении переносится по id заданий (chapterTaskProgress).
 */
export const TASK_REWARD_CHIPS = 30;

// целевое время по сложности — чуть быстрее «чистого» заезда (см. баланс v2)
const TIME_TARGET = { easy: 64, medium: 68, hard: 72 };

export const TASK_DEFS = {
    noCrash: { text: function() { return 'Без аварий'; }, check: function(m) { return m.strikes === 0; } },
    star: { text: function() { return 'Взять ⭐ нитро-прыжком'; }, check: function(m) { return (m.starsPicked || 0) >= 1; } },
    fast: {
        text: function(d) { return 'Финиш быстрее ' + fmt(TIME_TARGET[d] || 68); },
        check: function(m, d) { return m.time <= (TIME_TARGET[d] || 68); }
    },
    nearMiss: { text: function() { return '«На волоске!» ×5'; }, check: function(m) { return (m.nearMiss || 0) >= 5; } },
    noNitro: { text: function() { return 'Финиш без нитро'; }, check: function(m) { return (m.nitroPicked || 0) === 0; } },
    gum2: { text: function() { return 'Собрать 2 жвачки'; }, check: function(m) { return (m.gumPicked || 0) >= 2; } },
    maxOne: { text: function() { return 'Не больше 1 аварии'; }, check: function(m) { return m.strikes <= 1; } },
    jumpAnimal: { text: function() { return 'Перелететь зверя с трамплина'; }, check: function(m) { return (m.animalsJumped || 0) >= 1; } },
    bossRam: { text: function() { return 'Протаранить босса ×2'; }, check: function(m) { return (m.bossRams || 0) >= 2; } },
    clean: { text: function() { return 'Чистый отрезок ×2'; }, check: function(m) { return (m.cleanSegments || 0) >= 2; } }
};

function fmt(sec) { return Math.floor(sec / 60) + ':' + String(Math.floor(sec % 60)).padStart(2, '0'); }

// первые главы — попроще (учат), дальше — жёстче
const FIRST = ['maxOne', 'star', 'gum2'];
// ревизия 1 — только для переноса старого прогресса
const SETS_V1 = [
    ['noCrash', 'star', 'nearMiss'],
    ['fast', 'star', 'noNitro'],
    ['noCrash', 'nearMiss', 'fast'],
    ['star', 'gum2', 'fast']
];
// ревизия 2: + перелёт зверя, таран босса, чистый отрезок
const SETS = [
    ['noCrash', 'star', 'nearMiss'],
    ['fast', 'bossRam', 'noNitro'],
    ['clean', 'jumpAnimal', 'fast'],
    ['star', 'gum2', 'bossRam'],
    ['noCrash', 'clean', 'jumpAnimal']
];
export const TASKS_REV = 2;

function setFor(idx, sets) {
    return idx < 2 ? FIRST : sets[(idx - 2) % sets.length];
}

export function tasksForChapter(idx, diff) {
    return setFor(idx, SETS).map(function(id) { return { id: id, text: TASK_DEFS[id].text(diff) }; });
}

/** Ключ прогресса заданий главы в текущей ревизии */
export function taskKey(trackId) {
    return trackId + '@' + TASKS_REV;
}

/**
 * Прогресс главы [bool×3] в текущей ревизии. Нет записи — переносим из ревизии 1 по id заданий:
 * совпавшие задания остаются выполненными, новые — нет.
 */
export function chapterTaskProgress(tasks, trackId, idx) {
    const t = tasks || {};
    const cur = t[taskKey(trackId)];
    if (Array.isArray(cur)) return cur.slice(0, 3).map(Boolean);
    const old = t[trackId];
    if (!Array.isArray(old)) return [false, false, false];
    const oldIds = setFor(idx, SETS_V1);
    return setFor(idx, SETS).map(function(id) { const j = oldIds.indexOf(id); return j >= 0 && !!old[j]; });
}

/** Есть ли в главе задание (для особых участков трассы, например тропы с трамплином) */
export function chapterHasTask(idx, id) {
    return idx >= 0 && setFor(idx, SETS).indexOf(id) >= 0;
}

/** Какие задания выполнены в этом заезде (только при победе) */
export function evaluateTasks(idx, diff, meta) {
    return tasksForChapter(idx, diff).map(function(t) {
        return !!(meta && meta.state === 'win' && TASK_DEFS[t.id].check(meta, diff));
    });
}

/** Слить с прошлым прогрессом; вернуть { done, newly } — newly: сколько выполнено впервые */
export function mergeTaskProgress(prev, now) {
    const p = Array.isArray(prev) ? prev : [false, false, false];
    let newly = 0;
    const done = now.map(function(v, i) { if (v && !p[i]) newly++; return !!(v || p[i]); });
    return { done: done, newly: newly };
}
