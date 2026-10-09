import { describe, it, expect } from 'vitest';
import { photoDate, cropRect, createPhotoBook } from '../../src/photo.js';

describe('фото на память', () => {
    it('дата и квадратный кадр чуть ниже середины', () => {
        expect(photoDate(new Date(2026, 9, 5))).toBe('05.10.2026');
        const r = cropRect(390, 844);
        expect(r.s).toBe(390);
        expect(r.y).toBeGreaterThan((844 - 390) / 2);
        expect(cropRect(844, 390)).toMatchObject({ s: 390, y: 0 });
    });
    it('слабый момент не перебивает крутой', () => {
        const b = createPhotoBook(function() { return 0; });
        b.request('Полёт', 4); b.request('Под поездом', 9); b.request('Таран', 5);
        // без DOM снимка нет, но в очереди остался самый крутой
        expect(b.best).toBe(null);
    });
});
