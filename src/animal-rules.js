/**
 * Одно правило на вид зверя (как враги у Марио): за пару заездов игрок «читает» зверя по силуэту.
 *   курица  — мечется: выбежала до середины, вернулась назад и только потом побежала дальше;
 *   медведь — встаёт посреди дороги: дошёл до середины, постоял и ушёл — объезжай его полосу;
 *   слон — тоже встаёт; олень, кабан, носорог — напролом: быстро и ровно, без замедления у края;
 *   остальные — обычная перебежка (разгон и торможение у края).
 * crossK(kind, t) — доля пути поперёк дороги (0 — старт у обочины, 1 — другая обочина) в момент t (0..1 времени перебежки);
 * durMul(kind) — во сколько раз дольше / короче перебежка. Логика — чистая (с тестами).
 */

const smooth = function(t) { return t * t * (3 - 2 * t); };
const seg = function(t, t0, t1, k0, k1) { const u = Math.max(0, Math.min(1, (t - t0) / (t1 - t0))); return k0 + (k1 - k0) * smooth(u); };

export const ANIMAL_RULES = {
    CHICKEN: { rule: 'zigzag', dur: 1.25, hint: 'мечется туда-сюда' },
    BEAR:    { rule: 'stand',  dur: 1.7,  hint: 'встаёт посреди дороги' },
    DEER:    { rule: 'dash',   dur: 0.75, hint: 'проносится напролом' },
    RHINO:   { rule: 'dash',   dur: 0.85, hint: 'несётся напролом' },
    ELEPHANT: { rule: 'stand', dur: 1.8,  hint: 'встаёт посреди дороги' },
    BOAR:    { rule: 'dash',   dur: 0.85, hint: 'несётся напролом' }
};

export function animalRule(kind) { return (ANIMAL_RULES[kind] || {}).rule || 'cross'; }
export function durMul(kind) { return (ANIMAL_RULES[kind] || {}).dur || 1; }
export function animalHint(kind) { return (ANIMAL_RULES[kind] || {}).hint || ''; }

export function crossK(kind, t) {
    const x = Math.max(0, Math.min(1, t));
    switch (animalRule(kind)) {
        case 'zigzag': return x < 0.35 ? seg(x, 0, 0.35, 0, 0.55) : x < 0.6 ? seg(x, 0.35, 0.6, 0.55, 0.3) : seg(x, 0.6, 1, 0.3, 1);
        case 'stand': return x < 0.3 ? seg(x, 0, 0.3, 0, 0.5) : x < 0.75 ? 0.5 : seg(x, 0.75, 1, 0.5, 1);
        case 'dash': return x;
        default: return smooth(x);
    }
}
