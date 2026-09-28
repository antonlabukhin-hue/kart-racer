import { describe, it, expect } from 'vitest';
import { ATTACK_HINTS, splitBossName, bossIntroHtml, bossPhaseHtml } from '../../src/boss-intro.js';
import { CAMPAIGN_BOSSES } from '../../src/boss.js';

describe('карточка босса', () => {
    it('у каждой атаки босса есть подсказка', () => {
        CAMPAIGN_BOSSES.forEach(b => expect(ATTACK_HINTS[b.attack], b.id).toBeTruthy());
    });

    it('имя делится на титул и кличку', () => {
        expect(splitBossName('Кабан «Бригада»')).toEqual({ title: 'Кабан', nick: 'Бригада' });
        expect(splitBossName('Просто Босс')).toEqual({ title: '', nick: 'Просто Босс' });
    });

    it('карточка: кличка, сердечки по HP, подсказка; текст экранируется', () => {
        const html = bossIntroHtml({ name: 'Лев «<b>»', attack: 'chain', trim: 0xff2244, eye: 0xffaa00 }, 7, 3);
        expect(html).toContain('глава 7');
        expect(html).toContain('❤❤❤');
        expect(html).toContain('&lt;b&gt;');
        expect(html).toContain(ATTACK_HINTS.chain);
        expect(html).toContain('#ff2244');
        expect(bossPhaseHtml({ name: 'Кабан «Бригада»' }, 2)).toContain('ФАЗА 2');
        expect(bossPhaseHtml({ name: 'Кабан «Бригада»' }, 3)).toContain('в ярости');
    });
});
