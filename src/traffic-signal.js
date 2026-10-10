/**
 * Честные перестроения попуток: перед сменой полосы — поворотник SIGNAL_TIME секунд (видно, куда она пойдёт),
 * в полосу игрока — только если впереди него дальше CUT_SAFE м (тормозов нет — ближе не увернуться) или уже позади.
 * «Нарочно в его полосу» — только издалека, с CUT_FROM…CUT_TO м впереди.
 */
export const SIGNAL_TIME = 0.8;
export const CUT_SAFE = 35;
export const CUT_FROM = 38;
export const CUT_TO = 60;

/** ahead — насколько попутка впереди игрока (м, > 0 — впереди) */
export function cutInAllowed(newLane, playerLane, ahead) {
    if (newLane !== playerLane) return true;
    return ahead > CUT_SAFE || ahead < -4;
}
/** Попутка «нарочно» встаёт перед игроком — только издалека, после поворотника он успеет уйти */
export function wantsCut(ahead) { return ahead > CUT_FROM && ahead < CUT_TO; }
/** Мигание поворотника: t — сколько ещё горит сигнал */
export function blinkOn(t) { return t > 0 && Math.floor(t * 6) % 2 === 0; }
