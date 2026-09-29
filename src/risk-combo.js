/**
 * Множитель за риск: «на волоске», прыжок над зверем, чистая посадка, снесённый щит — каждое действие даёт
 * очки × текущий множитель и поднимает множитель на ступень (×1 → ×5). Пауза без риска дольше CHAIN_WINDOW
 * гасит цепочку, авария — сбрасывает сразу. Очки риска на финише превращаются в опыт сезона.
 */
export const RISK_POINTS = { nearMiss: 50, jump: 80, landing: 60, billboard: 40 };
export const MAX_MULT = 5;
export const CHAIN_WINDOW = 5; // с

export function createRisk() {
    return { mult: 1, points: 0, best: 1, timer: 0, events: 0 };
}

/** Рисковое действие: возвращает { gained, mult } — сколько очков и какой множитель теперь */
export function riskEvent(r, kind) {
    const base = RISK_POINTS[kind] || 40;
    const gained = base * r.mult;
    r.points += gained;
    r.events++;
    r.mult = Math.min(MAX_MULT, r.mult + 1);
    r.best = Math.max(r.best, r.mult);
    r.timer = CHAIN_WINDOW;
    return { gained: gained, mult: r.mult };
}

/** Каждый кадр: true — цепочка только что погасла */
export function riskTick(r, dt) {
    if (r.timer <= 0) return false;
    r.timer = Math.max(0, r.timer - dt);
    if (r.timer === 0 && r.mult > 1) { r.mult = 1; return true; }
    return false;
}

/** Авария: множитель сгорает. Возвращает, какой был (для надписи «×4 сгорел») */
export function riskCrash(r) {
    const was = r.mult;
    r.mult = 1;
    r.timer = 0;
    return was;
}

/** Очки риска → опыт сезона на финише */
export function riskToXp(points) {
    return Math.max(0, Math.round((points || 0) / 20));
}
