/**
 * Короткая вибрация телефона на сочных моментах заезда — не только при аварии: подхватил нитро, оторвался от трамплина,
 * приземлился, снёс щит. Короткие импульсы (15–40 мс) — чувствуются, но не раздражают. Выключается в «Настройках»
 * («Вибрация телефона»). Частые события не дребезжат: не чаще раза в MIN_GAP мс.
 */
export const BUZZ = { nitro: 25, takeoff: 12, land: 30, cleanLand: [20, 30, 35], board: 40 };
export const MIN_GAP = 120;

let last = -1e9;

/** kind — из BUZZ; on — включена ли вибрация в настройках; now — мс (для тестов) */
export function buzz(kind, on, now) {
    const t = now != null ? now : (typeof performance !== 'undefined' ? performance.now() : Date.now());
    if (!on || t - last < MIN_GAP) return false;
    const p = BUZZ[kind];
    if (p == null) return false;
    try { if (typeof navigator === 'undefined' || !navigator.vibrate) return false; navigator.vibrate(p); } catch (e) { return false; }
    last = t;
    return true;
}
