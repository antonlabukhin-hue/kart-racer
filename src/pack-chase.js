/**
 * «Погоня стаи» на последних ~17% трассы: стая бежит следом по обочинам со скоростью чуть ниже
 * крейсерской. На полном ходу машина уходит (до MAX_GAP), после удара или торможения стая догоняет:
 * видно по обочинам и по шкале в HUD. Догнали — укус: +время, не авария (не двойное наказание за удар).
 */
export const PACK_START = 0.83;
export const PACK_END = 0.985;
export const START_GAP = 14;
export const MAX_GAP = 22;
export const CATCH_GAP = 1.6;
export const PACK_SPEED_K = 0.85;     // доля максимальной скорости машины
export const BITE_PENALTY = 2;        // секунды

export function createPackChase() {
    let state = 'idle', gap = START_GAP, cooldown = 0, bites = 0;
    return {
        /**
         * progress — доля трассы, playerV/packV — ед./с. Возвращает событие:
         * 'start' | 'bite' | 'end' | null
         */
        update: function(dt, progress, playerV, packV) {
            if (state === 'idle') {
                if (progress >= PACK_START && progress < PACK_END) { state = 'on'; gap = START_GAP; return 'start'; }
                return null;
            }
            if (state !== 'on') return null;
            if (progress >= PACK_END) { state = 'done'; return 'end'; }
            cooldown = Math.max(0, cooldown - dt);
            gap = Math.min(MAX_GAP, gap + (playerV - packV) * dt);
            if (gap <= CATCH_GAP && cooldown <= 0) {
                bites++;
                gap = START_GAP * 0.7;
                cooldown = 2;
                return 'bite';
            }
            gap = Math.max(CATCH_GAP * 0.5, gap);
            return null;
        },
        /** 0 — стая далеко, 1 — вот-вот укусит */
        get danger() { return state === 'on' ? Math.max(0, Math.min(1, 1 - (gap - CATCH_GAP) / (MAX_GAP - CATCH_GAP))) : 0; },
        get gap() { return gap; },
        get active() { return state === 'on'; },
        get bites() { return bites; }
    };
}
