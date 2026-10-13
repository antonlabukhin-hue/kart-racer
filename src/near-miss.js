/**
 * «На волоске» — уворот в последний момент: помеха была на твоей полосе впереди (ближе THREAT_AHEAD),
 * ты ушёл в соседнюю, и она прошла рядом. Раньше считалось только «впритирку сбоку» (< ~1.2 м по x) —
 * а по центру соседней полосы зазор 2 м, и со свайпами «на волоске» почти не срабатывал.
 * Старое правило тоже работает: проскочил совсем близко — засчитано.
 * o — попутка или зверь (сюда пишутся _thr и _nm); dx = x игрока − x помехи; dz = z игрока − z помехи
 * (> 0 — помеха впереди); hw — полуширина столкновения; now — время заезда, с.
 */
export const THREAT_AHEAD = 14;
export const THREAT_MEMORY = 0.9;
export const ADJ_LANE = 2.6;

export function nearMissStep(o, dx, dz, hw, now) {
    if (dz > 6) o._nm = false; // попутку переставили вперёд — снова может дать «на волоске»
    if (dz > 0.5 && dz < THREAT_AHEAD && Math.abs(dx) < hw + 0.35) { o._thr = now; o._thrDz = dz; } // на твоей полосе, впереди (и как близко)
    if (o._nm || !(dz < -0.6 && dz > -3)) return false;
    const close = Math.abs(dx) < hw + 0.75;
    const dodged = o._thr != null && now - o._thr < THREAT_MEMORY && Math.abs(dx) < ADJ_LANE;
    if (close || dodged) { o._nm = true; return nearGrade(Math.abs(dx) - hw, dodged ? o._thrDz : null); }
    return false;
}

/**
 * Качество «на волоске» (truthy-строка — прежние проверки if (nearMissStep(...)) работают как раньше):
 *   'perfect' — зазор меньше PERFECT_GAP или ушёл из полосы, когда до помехи было меньше PERFECT_LATE м;
 *   'close'   — зазор меньше CLOSE_GAP или ушёл ближе CLOSE_LATE м;
 *   'clean'   — обычный.
 * gap — зазор по x между краями (м), late — сколько метров было до помехи, когда ушёл с её полосы (null — не был на ней). Метры, а не секунды: не зависит от скорости.
 */
export const PERFECT_GAP = 0.22, CLOSE_GAP = 0.55, PERFECT_LATE = 2.5, CLOSE_LATE = 5;
export function nearGrade(gap, late) {
    if (gap < PERFECT_GAP || (late != null && late < PERFECT_LATE)) return 'perfect';
    if (gap < CLOSE_GAP || (late != null && late < CLOSE_LATE)) return 'close';
    return 'clean';
}

/** Как показать и наградить качество (бесконечная трасса): вид рискового действия, надпись со шкалой точности, цвет, доля бака нитро, нитро, второй звук */
export const NEAR_STYLE = {
    clean:   { risk: 'nearMiss',    text: '⚡ На волоске!',      bar: '▮▯▯', color: '#66ffcc', charge: 1,   nitro: 0,   sfx: null },
    close:   { risk: 'nearClose',   text: '⚡⚡ Впритирку!',      bar: '▮▮▯', color: '#ffe066', charge: 1.6, nitro: 0,   sfx: 'pickup' },
    perfect: { risk: 'nearPerfect', text: '⚡⚡⚡ ИДЕАЛЬНО!',     bar: '▮▮▮', color: '#ff7ad8', charge: 2.5, nitro: 0,   sfx: 'nitro_pick' }
};
export function nearStyle(grade) { return NEAR_STYLE[grade] || NEAR_STYLE.clean; }
