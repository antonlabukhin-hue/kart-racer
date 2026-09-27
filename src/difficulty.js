/**
 * Параметры сложностей (лимит времени, длина трассы, звери, препятствия).
 * Главы «сложно» дополнительно интерполируются в src/balance.js (campaignHardConfig).
 */

export const DIFFICULTY_CONFIG = {
    // lookahead ~14–18: впереди, но доезжаешь; crossMul чтобы зверь был на полосе у машины
    // animalSpawnRate: секунды между спавнами (больше = реже)
    easy: {
        label: '🟢 Лёгкий',
        trackLength: 1400,
        timeLimit: 90,
        maxAnimals: 9,
        maxCars: 4,
        maxObstacles: 9,
        trees: 16,
        animalSpawnRate: 3.6, // v2: трасса длиннее на 40% — реже, чтобы зверей за заезд было ~+20%, а не +40%
        hasNightZone: false,
        // ещё −10% к жёсткости
        triggerLookahead: 17.5,
        animalCrossMul: 0.64,
        timePenaltyMul: 0.55,
        laneChangeMul: 0.28
    },
    medium: {
        label: '🟡 Средний',
        trackLength: 1500,
        timeLimit: 90,
        maxAnimals: 14,
        maxCars: 7,
        maxObstacles: 15,
        trees: 26,
        animalSpawnRate: 2.15,
        hasNightZone: false,
        // ещё −10% к жёсткости
        triggerLookahead: 15.2,
        animalCrossMul: 0.70,
        timePenaltyMul: 0.78,
        laneChangeMul: 0.52
    },
    hard: {
        label: '🔴 Сложный',
        trackLength: 1550,
        timeLimit: 90,
        maxAnimals: 24,
        maxCars: 13,
        maxObstacles: 26,
        trees: 38,
        animalSpawnRate: 1.15,
        hasNightZone: false,
        triggerLookahead: 13,
        animalCrossMul: 1.4,
        timePenaltyMul: 1.05,
        laneChangeMul: 0.95
    }
};
