/**
 * Ранг заезда D–S — только для свободного заезда и «Звериного часа» (у кампании свои звёзды).
 * Свободный заезд: 100 очков = время (40) + аварии (25) + стиль (25: «На волоске!», чистые отрезки, перелёты, снесённые щиты) + босс (10).
 * «Звериный час»: по номеру волны.
 */
export const RANKS = ['D', 'C', 'B', 'A', 'S'];
const LIMITS = { S: 90, A: 75, B: 55, C: 35 };

const clamp01 = function(v) { return Math.max(0, Math.min(1, v)); };

function letterFor(score) {
    if (score >= LIMITS.S) return 'S';
    if (score >= LIMITS.A) return 'A';
    if (score >= LIMITS.B) return 'B';
    if (score >= LIMITS.C) return 'C';
    return 'D';
}

/**
 * m: { time, timeLimit, strikes, maxStrikes, nearMiss, cleanSegments, animalsJumped, bossDefeated }.
 * Возвращает { letter, score, parts, tip } — tip: что прибавит больше всего очков.
 */
export function raceRank(m) {
    const tl = m.timeLimit || 90;
    // финиш за 60% лимита — полные очки за время, на последней секунде — ноль
    const time = 40 * clamp01((tl - (m.time || tl)) / (tl * 0.4));
    const crash = 25 * clamp01(1 - (m.strikes || 0) / Math.max(1, (m.maxStrikes || 5) - 1));
    const style = Math.min(25, Math.min(8, m.nearMiss || 0) * 1.5 + Math.min(3, m.cleanSegments || 0) * 3
        + Math.min(2, m.animalsJumped || 0) * 2.5 + Math.min(3, m.billboards || 0) * 2);
    const boss = m.bossDefeated ? 10 : 0;
    const parts = { time: time, crash: crash, style: style, boss: boss };
    const score = Math.round(time + crash + style + boss);
    const miss = [
        ['time', 40 - time, 'Быстрее к финишу'],
        ['crash', 25 - crash, 'Меньше аварий'],
        ['style', 25 - style, '«На волоске!», чистые отрезки, щиты и перелёты'],
        ['boss', 10 - boss, 'Сбей босса']
    ].sort(function(a, b) { return b[1] - a[1]; })[0];
    const letter = letterFor(score);
    return { letter: letter, score: score, parts: parts, tip: letter === 'S' ? '' : miss[2] };
}

/** «Звериный час»: ранг по волне, до которой дожил */
export function beastRank(wave) {
    const w = wave || 1;
    const letter = w >= 8 ? 'S' : w >= 6 ? 'A' : w >= 4 ? 'B' : w >= 2 ? 'C' : 'D';
    const next = { D: 2, C: 4, B: 6, A: 8 }[letter];
    return { letter: letter, score: w, tip: next ? 'До ранга ' + RANKS[RANKS.indexOf(letter) + 1] + ' — волна ' + next : '' };
}

/** Лучше ли ранг a, чем b */
export function rankBetter(a, b) {
    return RANKS.indexOf(a) > RANKS.indexOf(b);
}
