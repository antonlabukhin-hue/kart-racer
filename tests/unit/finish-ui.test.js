import { describe, it, expect } from 'vitest';
import { finishActions, finishButtonsHtml, rewardChipsHtml, statTilesHtml } from '../../src/ui/finish-ui.js';

const ids = (l) => l.map(b => b.id + ':' + b.kind);

describe('экран финиша: одна главная кнопка по исходу', () => {
    it('победа в кампании — «Дальше», затем повтор, гараж, меню', () => {
        expect(ids(finishActions({ camp: true, state: 'win', hasNext: true }))).toEqual([
            'finish-next-btn:primary', 'finish-restart-btn:secondary', 'finish-garage-btn:secondary', 'finish-menu-btn:ghost']);
        expect(finishActions({ camp: true, state: 'win', hasNext: false })[0].label).toBe('📖 К списку глав');
    });
    it('поражение — «Повторить» главная; гараж подсказывает прокачку', () => {
        const l = finishActions({ camp: true, state: 'crash', canUpgrade: true });
        expect(ids(l)).toEqual(['finish-restart-btn:primary', 'finish-garage-btn:secondary', 'finish-menu-btn:ghost']);
        expect(l[1].label).toContain('можно прокачать');
        expect(finishActions({ state: 'timeout' })[1].label).toBe('🔧 Гараж');
    });
    it('«Звериный час» — плюс «Вызвать друга»', () => {
        expect(ids(finishActions({ endless: true, state: 'crash' }))).toContain('finish-challenge-btn:secondary');
    });
    it('золотая кнопка ровно одна', () => {
        for (const o of [{ camp: true, state: 'win', hasNext: true }, { state: 'win' }, { state: 'crash', endless: true }]) {
            expect((finishButtonsHtml(o).match(/fin-btn primary/g) || []).length).toBe(1);
        }
    });
    it('награды «фишками»: нулевые не показываются, итог — отдельной строкой', () => {
        const h = rewardChipsHtml({ chips: 3, gum: 0, xp: 40 }, { chips: 15, gum: 7 });
        expect((h.match(/class="fin-chip"/g) || []).length).toBe(2);
        expect(h).toContain('data-to="40"');
        expect(h).toContain('всего: Е 15 · 🍬 7');
        expect(rewardChipsHtml({ chips: 0, gum: 0, xp: 0 })).toBe('');
    });
    it('статистика плитками', () => {
        const h = statTilesHtml([['📊', 'Макс. скорость', '120 км/ч'], ['⛽', 'Нитро', 3]]);
        expect((h.match(/<div><i>/g) || []).length).toBe(2);
        expect(h).toContain('<b>120 км/ч</b><small>Макс. скорость</small>');
        expect(statTilesHtml(null)).toBe('');
    });
});
