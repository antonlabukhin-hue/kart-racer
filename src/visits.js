/**
 * Заходы в игру — чтобы не вываливать на новичка всё сразу.
 * profile.visits = { n — заходов (раз за загрузку страницы), days — разных дней, last — последний день 'ГГГГ-ММ-ДД' }.
 * Окна новостей («Появились новые машины», «Привет, …») — с NEWS_FROM_VISIT-го захода;
 * «Слово дня», «Рекорды», «Заезд дня», «Тест-драйв» в меню — с EXTRAS_FROM_DAY-го дня игры.
 */
export const NEWS_FROM_VISIT = 3;
export const EXTRAS_FROM_DAY = 2;

const counted = new Set(); // профили, чей заход уже засчитан на этой загрузке страницы

/** Засчитать заход (мутирует профиль; повторный вход в тот же профиль без перезагрузки — не заход) */
export function markVisit(profile, today, createdDay) {
    if (!profile.visits) {
        // профиль из прежних версий: играет не первый день — всё уже открыто
        const old = createdDay && createdDay < today;
        profile.visits = old ? { n: NEWS_FROM_VISIT - 1, days: EXTRAS_FROM_DAY - 1, last: null } : { n: 0, days: 0, last: null };
    }
    const key = profile.id || profile.name;
    if (counted.has(key)) return profile.visits;
    counted.add(key);
    const v = profile.visits;
    v.n++;
    if (v.last !== today) { v.days++; v.last = today; }
    return v;
}

/** localStorage road_racing_open_all = '1' — всё открыто сразу (e2e-тесты и поддержка) */
export const OPEN_ALL_KEY = 'road_racing_open_all';
function openAll() {
    try { return typeof localStorage !== 'undefined' && localStorage.getItem(OPEN_ALL_KEY) === '1'; } catch (e) { return false; }
}

export function newsReady(profile) {
    return openAll() || !!(profile && profile.visits && profile.visits.n >= NEWS_FROM_VISIT);
}

export function extrasReady(profile) {
    return openAll() || !!(profile && profile.visits && profile.visits.days >= EXTRAS_FROM_DAY);
}
