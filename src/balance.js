/**
 * Нарастание сложности по кампании.
 * «Сложные» главы начинаются с 6-й из 17: раньше 6-я и 17-я были одинаково жёсткими
 * (зверь срывается за 13 ед. и бежит в 1.4 раза быстрее) — скачок после средних глав.
 * Теперь параметры реакции плавно идут от средней сложности к полной сложной к финалу.
 * Длина трассы и лимит времени остаются от сложной.
 */
const CURVE_KEYS = ['triggerLookahead', 'animalCrossMul', 'timePenaltyMul', 'animalSpawnRate', 'laneChangeMul'];

export function campaignHardConfig(hard, medium, idx, total) {
    const k = Math.max(0, Math.min(1, idx / Math.max(1, total - 1)));
    const out = Object.assign({}, hard);
    CURVE_KEYS.forEach(function(key) {
        if (typeof hard[key] === 'number' && typeof medium[key] === 'number') {
            out[key] = medium[key] + (hard[key] - medium[key]) * k;
        }
    });
    out.curveK = k;
    return out;
}
