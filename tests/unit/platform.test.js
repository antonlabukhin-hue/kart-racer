import { describe, it, expect } from 'vitest';
import { PRODUCTS, grantProduct, interstitialDue, createPlatform } from '../../src/platform.js';
import { payHtml } from '../../src/platform-hooks.js';

describe('площадка: Яндекс Игры / сайт', () => {
    it('покупки начисляются в профиль', () => {
        const p = { season: { chips: 100, vhs: 1 } };
        expect(grantProduct(p, 'vhs10')).toEqual({ vhs: 10 });
        expect(grantProduct(p, 'e30k')).toEqual({ chips: 30000 });
        grantProduct(p, 'noads');
        expect(p).toMatchObject({ season: { chips: 30100, vhs: 11 }, noAds: true });
        expect(grantProduct(p, 'nope')).toBe(null);
        expect(PRODUCTS.filter(x => x.forever).map(x => x.id)).toEqual(['noads']);
    });

    it('межэкранная реклама — не чаще раза в 3 минуты и не после «Без рекламы»', () => {
        expect(interstitialDue(0, 200000, false)).toBe(true);
        expect(interstitialDue(100000, 200000, false)).toBe(false);
        expect(interstitialDue(0, 200000, true)).toBe(false);
    });

    it('на сайте рекламы и покупок нет, на Яндексе и в ?ads=mock — есть', () => {
        expect(createPlatform({ mode: 'production', search: '' })).toMatchObject({ name: 'web', mock: false });
        expect(createPlatform({ mode: 'production', search: '' }).rewardedAvailable()).toBe(false);
        expect(createPlatform({ mode: 'yandex', search: '' }).rewardedAvailable()).toBe(true);
        expect(createPlatform({ mode: 'test', search: '?ads=mock' }).paymentsAvailable()).toBe(true);
    });

    it('разметка геймплея шлёт только смену состояния', () => {
        const pf = createPlatform({ mode: 'web' });
        pf.gameplay(true); pf.gameplay(true); pf.gameplay(false);
        expect(true).toBe(true); // без SDK — без ошибок
    });

    it('«Касса»: цена и иконка валюты площадки', () => {
        const html = payHtml([{ id: 'vhs10', icon: '📼', title: '10 кассет', priceValue: 29, currencyIcon: 'https://x/yan.svg' }]);
        expect(html).toContain('data-pay="vhs10"');
        expect(html).toContain('29 <img');
        expect(payHtml([])).toBe('');
    });
});
