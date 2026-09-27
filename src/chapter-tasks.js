/**
 * Три задания на главу кампании — повод перепройти главу без нового контента.
 * Набор заданий на главу детерминирован (одинаков у всех игроков), первое выполнение — +3 фишки.
 * Прогресс: profile.campaign.tasks[trackId] = [bool, bool, bool].
 */
export const TASK_REWARD_CHIPS = 3;

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
    maxOne: { text: function() { return 'Не больше 1 аварии'; }, check: function(m) { return m.strikes <= 1; } }
};

function fmt(sec) { return Math.floor(sec / 60) + ':' + String(Math.floor(sec % 60)).padStart(2, '0'); }

// первые главы — попроще (учат), дальше — жёстче
const SETS = [
    ['maxOne', 'star', 'gum2'],
    ['noCrash', 'star', 'nearMiss'],
    ['fast', 'star', 'noNitro'],
    ['noCrash', 'nearMiss', 'fast'],
    ['star', 'gum2', 'fast']
];

export function tasksForChapter(idx, diff) {
    const set = idx < 2 ? SETS[0] : SETS[1 + ((idx - 2) % (SETS.length - 1))];
    return set.map(function(id) { return { id: id, text: TASK_DEFS[id].text(diff) }; });
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
