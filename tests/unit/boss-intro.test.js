import { describe, it, expect } from 'vitest';
import { ATTACK_HINTS, splitBossName, bossIntroHtml, bossPhaseHtml, bossEscapeHtml } from '../../src/boss-intro.js';
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

describe('босс сбежал', () => {
    it('обещает реванш в следующей главе или заезде', () => {
        const h = bossEscapeHtml({ name: 'Кабан «Бригада»' }, 3);
        expect(h).toContain('«Бригада» сбежал');
        expect(h).toContain('Догоним в главе 3');
        expect(bossEscapeHtml({ name: 'Лев' }, null)).toContain('Догоним в следующем заезде');
        expect(bossEscapeHtml({ name: '<b>' }, null)).not.toContain('<b>');
    });
});

describe('портрет в карточке босса', () => {
    it('есть — картинка в рамке цвета босса; нет — карточка без картинки', () => {
        const def = { name: 'Кабан «Бригада»', trim: 0xffcc00, attack: 'sweep' };
        expect(bossIntroHtml(def, 1, 3, 'images/boss_01.jpg')).toContain('<img class="bi-portrait" decoding="async" src="images/boss_01.jpg"');
        expect(bossIntroHtml(def, 1, 3)).not.toContain('bi-portrait');
    });
});

import { cueWord, bossHudState } from '../../src/boss-hud.js';
describe('подсказка у босса — одно слово', () => {
    it('замах — «УВЕРНИСЬ!», шкала полная — «ТАРАН!», иначе ничего', () => {
        const b = { active: true, hp: 3, maxHp: 3, name: 'Кабан «Бригада»', vulnT: 0, attackState: 'idle' };
        expect(cueWord(bossHudState(b, 3))).toBe(null);
        expect(cueWord(bossHudState(Object.assign({}, b, { attackState: 'windup' }), 3))).toBe('УВЕРНИСЬ!');
        expect(cueWord(bossHudState(Object.assign({}, b, { vulnT: 1 }), 3))).toBe('ТАРАН!');
    });
});
