import { describe, it, expect } from 'vitest';
import { loadSettings, saveSettings, normalizeSettings, DEFAULT_SETTINGS, SETTINGS_KEY } from '../../src/settings.js';

function memStorage() {
    const m = {};
    return { getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, raw: m };
}

describe('настройки', () => {
    it('без сохранённых — значения по умолчанию', () => {
        expect(loadSettings(memStorage())).toEqual(DEFAULT_SETTINGS);
    });

    it('сохраняются и читаются', () => {
        const st = memStorage();
        saveSettings({ music: 0.2, engine: 0, sfx: 0.5, quality: 'high', camera: 2, shake: false, vibrate: false, ghost: false, lang: 'en', curve: false, host: 'text', controls: 'swipe', tutorial: true }, st);
        expect(loadSettings(st)).toEqual({ music: 0.2, engine: 0, sfx: 0.5, quality: 'high', camera: 2, shake: false, vibrate: false, ghost: false, lang: 'en', curve: false, host: 'text', controls: 'swipe', tutorial: true, v: 2 });
        expect(normalizeSettings({ host: 'loud' }).host).toBe('voice');
        expect(normalizeSettings({ controls: 'tilt' }).controls).toBe('buttons'); // основа — кнопки, свайпы по желанию
        expect(DEFAULT_SETTINGS.tutorial).toBe(false); // обучение в заезде — только по желанию, в «Настройках»
    });

    it('кривые значения приводятся к допустимым', () => {
        const n = normalizeSettings({ music: 5, engine: -1, sfx: 'x', quality: 'ultra', camera: 9 });
        expect(n.music).toBe(1);
        expect(n.engine).toBe(0);
        expect(n.sfx).toBe(DEFAULT_SETTINGS.sfx);
        expect(n.quality).toBe('medium');
        expect(n.camera).toBe(0);
    });

    it('битый JSON в хранилище не ломает игру', () => {
        const st = memStorage();
        st.setItem(SETTINGS_KEY, '{oops');
        expect(loadSettings(st)).toEqual(DEFAULT_SETTINGS);
    });
});

describe('громкость по умолчанию (v2)', () => {
    it('музыка и двигатель тише; кто не трогал старые 55%/60% — получает новые, свои значения не трогаем', () => {
        const mem = { d: {}, getItem(k) { return this.d[k] || null; }, setItem(k, v) { this.d[k] = v; } };
        expect(DEFAULT_SETTINGS).toMatchObject({ music: 0.35, engine: 0.35, sfx: 1 });
        mem.setItem(SETTINGS_KEY, JSON.stringify({ music: 0.55, engine: 0.6 }));
        expect(loadSettings(mem)).toMatchObject({ music: 0.35, engine: 0.35 });
        mem.setItem(SETTINGS_KEY, JSON.stringify({ music: 0.8, engine: 0.2 }));
        expect(loadSettings(mem)).toMatchObject({ music: 0.8, engine: 0.2 });
    });
});
