/**
 * Стрелки-подсказки движений (← → ▲ ▼ на экране, как в Subway Surfers).
 * Новичку — первые ARROW_RUNS заездов бесконечной трассы. Старым игрокам после обновления управления
 * (MOVES_VERSION растёт) — ещё REFRESH_RUNS заездов: они не знают, что появились прыжок и подныр.
 * Состояние — profile.moveTutor = { v, runs }.
 */
export const ARROW_RUNS = 3;
export const REFRESH_RUNS = 2;
export const MOVES_VERSION = 1; // 1 — прыжок, подныр и автогаз (10.2026); поднять при новом изменении управления

const infRuns = function(p) { return p && p.infinite ? p.infinite.runs || 0 : 0; };

/** Показывать стрелки в этом заезде? */
export function showMoveArrows(profile) {
    if (infRuns(profile) < ARROW_RUNS) return true;
    const t = profile && profile.moveTutor;
    return !t || (t.v || 0) < MOVES_VERSION || (t.runs || 0) < REFRESH_RUNS;
}

/** Заезд закончен — учесть (до того, как вырастет число заездов бесконечной трассы) */
export function countArrowRun(profile) {
    if (!profile) return;
    if (infRuns(profile) < ARROW_RUNS) { profile.moveTutor = { v: MOVES_VERSION, runs: REFRESH_RUNS }; return; } // новичок учится по своим трём заездам
    const t = profile.moveTutor && profile.moveTutor.v === MOVES_VERSION ? profile.moveTutor : { v: MOVES_VERSION, runs: 0 };
    t.runs = Math.min(REFRESH_RUNS, (t.runs || 0) + 1);
    profile.moveTutor = t;
}

/**
 * Стрелки — только в начале заезда: по очереди все четыре действия (влево, вправо, прыжок, подныр).
 * Каждая гаснет, когда игрок её выполнил (или сама через INTRO_MAX с), после четвёртой — до конца заезда ничего.
 */
export const INTRO_ACTS = ['left', 'right', 'jump', 'duck'];
export const INTRO_MIN = 0.6, INTRO_MAX = 4;
export function createIntro() { return { step: 0, t: 0 }; }
/** Кадр: did — { left, right, jump, duck } что игрок делает сейчас; вернёт стрелку или null (обучение кончилось) */
export function introAct(st, dt, did) {
    if (st.step >= INTRO_ACTS.length) return null;
    st.t += dt;
    const act = INTRO_ACTS[st.step];
    if (did && did[act]) st.done = true; // выполнил хоть раз, даже сразу — засчитано (стрелка всё же горит INTRO_MIN, чтобы её заметили)
    if ((st.t > INTRO_MIN && st.done) || st.t > INTRO_MAX) { st.step++; st.t = 0; st.done = false; return st.step < INTRO_ACTS.length ? INTRO_ACTS[st.step] : null; }
    return act;
}
