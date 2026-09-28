/**
 * «Чистый отрезок»: CLEAN_SEGMENT секунд езды без ударов — награда.
 * Первая — щит (следующий удар не считается аварией), пока щит цел — +CLEAN_CHIPS фишек за отрезок.
 * Стоя на месте отрезок не копится.
 */
export const CLEAN_SEGMENT = 10;
export const CLEAN_CHIPS = 2;

export function createCleanRun() {
    let t = 0, shield = false, chips = 0, segments = 0;
    return {
        /** Кадр езды; moving — машина едет. Возвращает 'shield' | 'chips' | null */
        tick: function(dt, moving) {
            if (!moving) return null;
            t += Math.max(0, dt || 0);
            if (t < CLEAN_SEGMENT) return null;
            t -= CLEAN_SEGMENT;
            segments++;
            if (!shield) { shield = true; return 'shield'; }
            chips += CLEAN_CHIPS;
            return 'chips';
        },
        /** Удар: щит его съедает (true — аварии нет); отрезок в любом случае начинается заново */
        useShield: function() {
            t = 0;
            if (!shield) return false;
            shield = false;
            return true;
        },
        /** Удар, который щит не спасает (падение в разлом, снаряд босса) */
        reset: function() { t = 0; },
        get progress() { return Math.min(1, t / CLEAN_SEGMENT); },
        get shield() { return shield; },
        get chips() { return chips; },
        get segments() { return segments; }
    };
}
