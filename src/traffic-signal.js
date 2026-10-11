/**
 * Честные перестроения попуток: перед сменой полосы — поворотник SIGNAL_TIME секунд (видно, куда она пойдёт),
 * в полосу игрока — только если впереди него дальше CUT_SAFE м (тормозов нет — ближе не увернуться) или уже позади.
 * «Нарочно в его полосу» — только издалека, с CUT_FROM…CUT_TO м впереди.
 */
export const SIGNAL_TIME = 0.8;
// попутки должны успевать встать перед игроком: решают издалека (CUT_FROM…CUT_TO), после поворотника (SIGNAL_TIME) игрок
// подъезжает на ~18 м — и всё ещё дальше CUT_SAFE; перестраиваются быстро (LANE_CHANGE_RATE: полоса за ~0.38 с)
export const CUT_SAFE = 22;
export const CUT_FROM = 45;
export const CUT_TO = 80;
export const LANE_CHANGE_RATE = 2.6; // доля полосы в секунду (было 1.5 — за 0.67 с, и манёвр не успевал)

/** ahead — насколько попутка впереди игрока (м, > 0 — впереди) */
export function cutInAllowed(newLane, playerLane, ahead) {
    if (newLane !== playerLane) return true;
    return ahead > CUT_SAFE || ahead < -4;
}
/** Попутка «нарочно» встаёт перед игроком — только издалека, после поворотника он успеет уйти */
export function wantsCut(ahead) { return ahead > CUT_FROM && ahead < CUT_TO; }
/** Мигание поворотника: t — сколько ещё горит сигнал */
export function blinkOn(t) { return t > 0 && Math.floor(t * 6) % 2 === 0; }
