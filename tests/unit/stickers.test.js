import { describe, it, expect } from 'vitest';
import { STICKER_IDS, SET_REWARD, grantSticker, backfillStickers, stickersHtml } from '../../src/stickers.js';
import { chapterRow } from '../../src/metrics.js';
import { CAMPAIGN_TRACKS } from '../../src/data.js';

describe('наклейки за ★★★', () => {
    it('у каждой главы — своя наклейка', () => {
        expect(STICKER_IDS).toEqual(CAMPAIGN_TRACKS.map(t => t.id));
    });
    it('только за три звезды и один раз; вся коллекция — награда', () => {
        const p = { season: { chips: 0, vhs: 0 } };
        expect(grantSticker(p, 'c01', 2)).toBe(null);
        expect(grantSticker(p, 'c01', 3).sticker.name).toBe('Выезд');
        expect(grantSticker(p, 'c01', 3)).toBe(null);
        let last = null;
        STICKER_IDS.forEach(id => { const g = grantSticker(p, id, 3); if (g) last = g; });
        expect(last.setDone).toBe(true);
        expect(p.season).toEqual({ chips: SET_REWARD.chips, vhs: SET_REWARD.vhs });
        expect(stickersHtml(p)).toContain(STICKER_IDS.length + ' / ' + STICKER_IDS.length);
    });
    it('старые профили: где ★★★ уже есть — наклейки выдаются', () => {
        const p = { campaign: { stars: { c01: 3, c02: 2, c05: 3 } } };
        expect(backfillStickers(p)).toBe(2);
        expect(Object.keys(p.stickers.got)).toEqual(['c01', 'c05']);
    });
});

describe('воронка глав', () => {
    it('события главы → строки: start, win, lose, timeout, quit; не глава — нет', () => {
        expect(chapterRow({ e: 'race_start', chapter: 'c03' }, 'a'.repeat(16), '2026-10-03')).toMatchObject({ p_chapter: 'c03', p_kind: 'start' });
        expect(chapterRow({ e: 'race_end', chapter: 'c06', state: 'crash', strikes: 5, time: 61.4, progress: 0.73 }, 'p', 'd')).toMatchObject({ p_kind: 'lose', p_strikes: 5, p_time: 61, p_progress: 73 });
        expect(chapterRow({ e: 'race_end', chapter: 'c06', state: 'win' }, 'p', 'd').p_kind).toBe('win');
        expect(chapterRow({ e: 'race_end', chapter: 'c06', state: 'timeout' }, 'p', 'd').p_kind).toBe('timeout');
        expect(chapterRow({ e: 'race_quit', chapter: 'c09' }, 'p', 'd').p_kind).toBe('quit');
        expect(chapterRow({ e: 'race_end', chapter: null }, 'p', 'd')).toBe(null);
    });
});
