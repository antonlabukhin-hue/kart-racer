/**
 * Правила волн «Звериного часа»: у каждой волны (со второй) — своя задачка, а не только «зверей больше».
 * Правило — по сиду забега и номеру волны (у друга по ссылке-вызову — те же правила). Логика — чистая (с тестами).
 *   pool — какие звери бегут, animalMul — сколько (×), speedMul — как быстро (×), weather — погода волны,
 *   jumpBonus — очков за каждого перепрыгнутого зверя.
 */
export const WAVE_RULES = [
    { id: 'rams', icon: '🦏', name: 'Таранная волна', desc: 'Только носороги и кабаны — тяжёлые и злые', pool: ['RHINO', 'BOAR'], animalMul: 1.1 },
    { id: 'night', icon: '🌙', name: 'Ночная волна', desc: 'Темно — звери видны по глазам', weather: 'night' },
    { id: 'jumps', icon: '🦘', name: 'Прыгай!', desc: '+250 очков за каждого перепрыгнутого зверя', jumpBonus: 250 },
    { id: 'zoo', icon: '🐘', name: 'Зверинец', desc: 'Зверей вдвое больше, но они медленные', animalMul: 2, speedMul: 0.6 },
    { id: 'sprint', icon: '⚡', name: 'Спринтеры', desc: 'Зверей меньше, но носятся как угорелые', animalMul: 0.6, speedMul: 1.5 },
    { id: 'birds', icon: '🐔', name: 'Птичий двор', desc: 'Куры и павлины — мелкие, юркие, их много', pool: ['CHICKEN', 'PEACOCK'], animalMul: 1.6 },
    { id: 'savanna', icon: '🦒', name: 'Саванна', desc: 'Жирафы, зебры и слоны — длинные и высокие', pool: ['GIRAFFE', 'ZEBRA', 'ELEPHANT'] }
];

/** Правило волны: первая — без правил (разминка), дальше — по сиду, без повтора подряд */
export function waveRule(seed, wave) {
    const w = wave | 0;
    if (w <= 1) return null;
    const pick = function(n) { let h = ((seed >>> 0) ^ Math.imul(n, 0x9E3779B1)) >>> 0; h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0; return ((h ^ (h >>> 16)) >>> 0) % WAVE_RULES.length; };
    let prev = -1, i = 0;
    for (let n = 2; n <= w; n++) { i = pick(n); if (i === prev) i = (i + 1) % WAVE_RULES.length; prev = i; } // без повтора подряд
    return WAVE_RULES[i];
}

/** Выбор между волнами: «+1 сердце» (минус одна авария) или «×2 очки» за следующую волну */
export const CHOICES = [
    { id: 'heart', icon: '❤', name: '+1 сердце', desc: 'Одна авария прощена' },
    { id: 'double', icon: '✖2', name: '×2 очки', desc: 'За следующую волну' }
];
export const CHOICE_SECONDS = 10;
/** Применить выбор к забегу. heart без аварий — превращается в ×2 */
export function applyChoice(run, id) {
    if (id === 'heart' && run.strikes > 0) { run.strikes--; return 'heart'; }
    run.mul = 2;
    return 'double';
}
/** Выбор по умолчанию (время вышло): есть аварии — сердце, нет — ×2 */
export function defaultChoice(run) { return run.strikes > 0 ? 'heart' : 'double'; }
