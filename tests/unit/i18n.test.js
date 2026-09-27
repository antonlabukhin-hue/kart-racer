import { describe, it, expect } from 'vitest';
import { resolveLang, translateText } from '../../src/i18n.js';
import EN from '../../src/locales/en.js';
import { tasksForChapter } from '../../src/chapter-tasks.js';
import { TUTORIAL } from '../../src/tutorial.js';

describe('локализация', () => {
    it('язык: «авто» — русский для русскоязычных браузеров, иначе английский', () => {
        expect(resolveLang('auto', ['ru-RU', 'en'])).toBe('ru');
        expect(resolveLang('auto', ['uk'])).toBe('ru');
        expect(resolveLang('auto', ['en-US', 'de'])).toBe('en');
        expect(resolveLang('auto', [])).toBe('ru');
        expect(resolveLang('en', ['ru'])).toBe('en');
        expect(resolveLang('ru', ['en'])).toBe('ru');
    });

    it('строки и шаблоны переводятся, пробелы по краям сохраняются', () => {
        expect(translateText('  ⏸ ПАУЗА ', 'en')).toBe('  ⏸ PAUSED ');
        expect(translateText('ГЛАВА 3 ПРОЙДЕНА', 'en')).toBe('CHAPTER 3 COMPLETE');
        expect(translateText('Время: 1:02 · Аварий: 1 / 5', 'en')).toBe('Time: 1:02 · Crashes: 1 / 5');
        expect(translateText('нет такого', 'en')).toBeNull();
        expect(translateText('Already English', 'en')).toBeNull();
        expect(translateText('⏸ ПАУЗА', 'ru')).toBeNull();
    });

    it('в словаре нет кириллицы в переводах', () => {
        Object.entries(EN.strings).forEach(([ru, en]) => expect(/[А-Яа-яЁё]/.test(en), ru).toBe(false));
    });

    it('задания глав и подсказки тренера переведены целиком', () => {
        for (let i = 0; i < 17; i++) {
            tasksForChapter(i, 'hard').forEach(t => expect(translateText(t.text, 'en'), t.text).not.toBeNull());
        }
        TUTORIAL.flat().forEach(s => expect(translateText(s.text, 'en'), s.text).not.toBeNull());
    });
});
