import { describe, it, expect } from 'vitest';
import { bossHudState, bossHudKey, PHASE_LABELS } from '../../src/boss-hud.js';

const boss = (over) => Object.assign({ active: true, dying: false, hp: 6, maxHp: 6, vulnT: 0, name: 'Кабан «Бригада»' }, over || {});

describe('полоска босса в HUD', () => {
    it('имя без титула, HP и фаза по доле здоровья', () => {
        expect(bossHudState(boss())).toMatchObject({ nick: 'Бригада', hp: 6, maxHp: 6, phase: 1, label: PHASE_LABELS[1], open: false });
        expect(bossHudState(boss({ hp: 3 })).phase).toBe(2);
        expect(bossHudState(boss({ hp: 1 })).label).toBe(PHASE_LABELS[3]);
    });

    it('глава с ограничением фаз не показывает недоступную фазу', () => {
        expect(bossHudState(boss({ hp: 1, maxHp: 2 }), 1).phase).toBe(1);
    });

    it('окно уязвимости — open; нет босса, гибнет или сбежал — спрятать', () => {
        expect(bossHudState(boss({ vulnT: 1.2 })).open).toBe(true);
        expect(bossHudState(null)).toBeNull();
        expect(bossHudState(boss({ dying: true }))).toBeNull();
        expect(bossHudState(boss({ active: false }))).toBeNull();
        expect(bossHudState(boss({ hp: 0 }))).toBeNull();
    });

    it('шкала тарана: доля 0…1, оглушён — полная; заметное изменение меняет ключ', () => {
        expect(bossHudState(boss({ charge: 50 })).charge).toBe(0.5);
        expect(bossHudState(boss({ charge: 20, vulnT: 0.5 })).charge).toBe(1);
        expect(bossHudKey(bossHudState(boss({ charge: 50 })))).not.toBe(bossHudKey(bossHudState(boss({ charge: 0 }))));
    });

    it('ключ меняется только при видимых изменениях', () => {
        const a = bossHudState(boss());
        expect(bossHudKey(a)).toBe(bossHudKey(bossHudState(boss({ z: 5 }))));
        expect(bossHudKey(a)).not.toBe(bossHudKey(bossHudState(boss({ hp: 5 }))));
        expect(bossHudKey(null)).toBe('');
    });
});
