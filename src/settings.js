/**
 * Настройки игрока (одни на устройство, не на профиль): громкость, графика, камера, тряска.
 * Хранятся в localStorage; любые кривые значения из хранилища приводятся к допустимым.
 */
export const SETTINGS_KEY = 'road_racing_settings_v1';

export const DEFAULT_SETTINGS = {
    music: 0.35,      // громкость музыки 0..1 — тише: «Е», аварии и прыжки слышно всегда
    engine: 0.35,     // громкость двигателя 0..1
    sfx: 1.0,         // громкость эффектов 0..1
    quality: 'medium',// low | medium | high
    camera: 0,        // 0 сзади, 1 капот, 2 салон, 3 сбоку
    shake: true,      // тряска камеры при ударах
    vibrate: true,    // вибрация телефона при аварии
    ghost: true,      // призрак лучшего заезда
    lang: 'auto',     // auto (по языку браузера) | ru | en
    curve: true,      // «кривой мир»: повороты и холмы
    host: 'voice',    // ведущий-комментатор: voice — голос и текст | text — только текст | off
    controls: 'buttons', // управление на телефоне: buttons — кнопки на экране | swipe — свайпы, газ сам
    tutorial: false,  // обучение в заезде («Даю установку:», «Новое на дороге», тренер глав 1–3) — включается в «Настройках»
    v: 2              // версия настроек (v2 — тише музыка и двигатель по умолчанию)
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
        lang: ['auto', 'ru', 'en'].indexOf(r.lang) >= 0 ? r.lang : d.lang,
        curve: r.curve == null ? d.curve : !!r.curve,
        host: ['voice', 'text', 'off'].indexOf(r.host) >= 0 ? r.host : d.host,
        controls: ['buttons', 'swipe'].indexOf(r.controls) >= 0 ? r.controls : d.controls,
        tutorial: r.tutorial == null ? d.tutorial : !!r.tutorial,
        v: 2
    };
}

export function loadSettings(storage) {
    const st = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    try {
        const raw = st ? JSON.parse(st.getItem(SETTINGS_KEY) || 'null') : null;
        // v2: музыка и двигатель по умолчанию тише — кто не трогал ползунки (прежние 55% и 60%), получает новые
        if (raw && raw.v !== 2) { if (raw.music === 0.55) raw.music = DEFAULT_SETTINGS.music; if (raw.engine === 0.6) raw.engine = DEFAULT_SETTINGS.engine; }
        return normalizeSettings(raw);
    }
    catch (e) { return normalizeSettings(null); }
}

export function saveSettings(s, storage) {
    const st = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    const n = normalizeSettings(s);
    try { if (st) st.setItem(SETTINGS_KEY, JSON.stringify(n)); } catch (e) {}
    return n;
}
