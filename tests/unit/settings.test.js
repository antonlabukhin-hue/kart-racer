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
        saveSettings({ music: 0.2, engine: 0, sfx: 0.5, quality: 'high', camera: 2, shake: false, vibrate: false, ghost: false, lang: 'en', curve: false }, st);
        expect(loadSettings(st)).toEqual({ music: 0.2, engine: 0, sfx: 0.5, quality: 'high', camera: 2, shake: false, vibrate: false, ghost: false, lang: 'en', curve: false });
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
