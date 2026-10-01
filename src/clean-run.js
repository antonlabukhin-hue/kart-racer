/**
 * «Чистый отрезок»: CLEAN_SEGMENT секунд езды без ударов — награда.
 * Первая — броня (следующий удар не считается аварией), пока броня цела — +CLEAN_CHIPS фишек за отрезок.
 * Стоя на месте отрезок не копится.
 */
export const CLEAN_SEGMENT = 10;
export const CLEAN_CHIPS = 20;

export function createCleanRun() {
    let t = 0, shield = 0, chips = 0, segments = 0; // shield — сколько ударов ещё держит броня
    return {
        /** Кадр езды; moving — машина едет. Возвращает 'shield' | 'chips' | null */
        tick: function(dt, moving) {
            if (!moving) return null;
            t += Math.max(0, dt || 0);
            if (t < CLEAN_SEGMENT) return null;
            t -= CLEAN_SEGMENT;
            segments++;
            if (!shield) { shield = 1; return 'shield'; }
            chips += CLEAN_CHIPS;
            return 'chips';
        },
        /** Удар: броня его съедает (true — аварии нет); отрезок в любом случае начинается заново */
        useShield: function() {
            t = 0;
            if (!shield) return false;
            shield--;
            return true;
        },
        /** Броня сразу (усиление «Броня», «Второй шанс»); hits — сколько ударов держит (прокачка), не меньше уже имеющейся */
        grantShield: function(hits) { shield = Math.max(shield, hits || 1); },
        /** Удар, который броня не спасает (падение в разлом, снаряд босса) */
        reset: function() { t = 0; },
        get progress() { return Math.min(1, t / CLEAN_SEGMENT); },
        get shield() { return shield > 0; },
        get shieldHits() { return shield; },
        get chips() { return chips; },
        get segments() { return segments; }
    };
}
