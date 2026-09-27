/**
 * Настройки игрока (одни на устройство, не на профиль): громкость, графика, камера, тряска.
 * Хранятся в localStorage; любые кривые значения из хранилища приводятся к допустимым.
 */
export const SETTINGS_KEY = 'road_racing_settings_v1';

export const DEFAULT_SETTINGS = {
    music: 0.55,      // громкость музыки 0..1
    engine: 0.6,      // громкость двигателя 0..1
    sfx: 1.0,         // громкость эффектов 0..1
    quality: 'medium',// low | medium | high
    camera: 0,        // 0 сзади, 1 капот, 2 салон, 3 сбоку
    shake: true,      // тряска камеры при ударах
    vibrate: true,    // вибрация телефона при аварии
    ghost: true,      // призрак лучшего заезда
    lang: 'auto'      // auto (по языку браузера) | ru | en
};

const clamp01 = function(v, d) { const n = Number(v); return isFinite(n) ? Math.max(0, Math.min(1, n)) : d; };

export function normalizeSettings(raw) {
    const r = (raw && typeof raw === 'object') ? raw : {};
    const d = DEFAULT_SETTINGS;
    return {
        music: clamp01(r.music, d.music),
        engine: clamp01(r.engine, d.engine),
        sfx: clamp01(r.sfx, d.sfx),
        quality: ['low', 'medium', 'high'].indexOf(r.quality) >= 0 ? r.quality : d.quality,
        camera: [0, 1, 2, 3].indexOf(Number(r.camera)) >= 0 ? Number(r.camera) : d.camera,
        shake: r.shake == null ? d.shake : !!r.shake,
        vibrate: r.vibrate == null ? d.vibrate : !!r.vibrate,
        ghost: r.ghost == null ? d.ghost : !!r.ghost,
        lang: ['auto', 'ru', 'en'].indexOf(r.lang) >= 0 ? r.lang : d.lang
    };
}

export function loadSettings(storage) {
    const st = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    try { return normalizeSettings(st ? JSON.parse(st.getItem(SETTINGS_KEY) || 'null') : null); }
    catch (e) { return normalizeSettings(null); }
}

export function saveSettings(s, storage) {
    const st = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    const n = normalizeSettings(s);
    try { if (st) st.setItem(SETTINGS_KEY, JSON.stringify(n)); } catch (e) {}
    return n;
}
