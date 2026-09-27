/**
 * «Звериный час» — бесконечный режим волнами.
 * Каждая волна — полная трасса; карты сменяются по кругу, зверей больше с каждой волной,
 * аварии копятся между волнами. Конец — 5 аварий или время волны вышло. Счёт — в рекорд профиля.
 */
export const ENDLESS_MAPS = ['arsenev', 'promzona', 'svalka'];
export const WAVE_BASE_POINTS = 1000;

export function newEndlessRun() {
    return { wave: 1, score: 0, strikes: 0, nearMiss: 0 };
}

/** сложность волны: 1 — лёгкая, 2 — средняя, дальше — сложная */
export function waveDifficulty(wave) {
    return wave <= 1 ? 'easy' : (wave === 2 ? 'medium' : 'hard');
}

export function waveMap(wave) {
    return ENDLESS_MAPS[(Math.max(1, wave) - 1) % ENDLESS_MAPS.length];
}

/** с 4-й волны зверей больше и они чаще (до +60%), время волны не меняется */
export function waveConfig(base, wave) {
    const k = Math.min(1.6, 1 + 0.12 * Math.max(0, wave - 3));
    return Object.assign({}, base, {
        maxAnimals: Math.round((base.maxAnimals || 0) * k),
        animalSpawnRate: (base.animalSpawnRate || 0) * k
    });
}

/** очки за пройденную волну: база + запас времени + «на волоске» + звёзды */
export function waveScore(m) {
    const limit = m.timeLimit || 90;
    return WAVE_BASE_POINTS
        + Math.max(0, Math.round((limit - (m.time || limit)) * 10))
        + (m.nearMiss || 0) * 50
        + (m.starsPicked || 0) * 100;
}

/** очки за недоеханную волну — по пройденной доле трассы */
export function partialScore(progress, nearMiss) {
    const p = Math.max(0, Math.min(1, progress || 0));
    return Math.round(p * WAVE_BASE_POINTS * 0.8) + (nearMiss || 0) * 50;
}

/** { best, isNew } */
export function recordBest(prevBest, score) {
    const best = Math.max(prevBest || 0, score || 0);
    return { best: best, isNew: (score || 0) > (prevBest || 0) };
}
