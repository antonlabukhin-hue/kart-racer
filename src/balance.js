/**
 * Нарастание сложности по кампании.
 * «Сложные» главы начинаются с 6-й из 17: раньше 6-я и 17-я были одинаково жёсткими
 * (зверь срывается за 13 ед. и бежит в 1.4 раза быстрее) — скачок после средних глав.
 * Параметры реакции и число зверей, машин и препятствий плавно идут от средней сложности
 * к финалу — но только до CAMPAIGN_HARD_CAP пути к полной «сложной»: на 100% последние главы
 * были почти непроходимыми (зверь каждые 1.15 с, бежит вдвое быстрее, чем на средней).
 * Полная «сложная» — в свободном заезде. Длина трассы и лимит времени остаются от сложной.
 */
export const CAMPAIGN_HARD_CAP = 0.7;
const CURVE_KEYS = ['triggerLookahead', 'animalCrossMul', 'timePenaltyMul', 'animalSpawnRate', 'laneChangeMul',
    'maxAnimals', 'maxCars', 'maxObstacles'];
const INT_KEYS = ['maxAnimals', 'maxCars', 'maxObstacles'];

export function campaignHardConfig(hard, medium, idx, total) {
    const k = Math.max(0, Math.min(1, idx / Math.max(1, total - 1))) * CAMPAIGN_HARD_CAP;
    const out = Object.assign({}, hard);
    CURVE_KEYS.forEach(function(key) {
        if (typeof hard[key] === 'number' && typeof medium[key] === 'number') {
            out[key] = medium[key] + (hard[key] - medium[key]) * k;
            if (INT_KEYS.indexOf(key) >= 0) out[key] = Math.round(out[key]);
        }
    });
    out.curveK = k;
    return out;
}
