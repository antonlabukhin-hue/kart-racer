import { describe, it, expect } from 'vitest';
import { BADGES, dropBadge, badgesHtml, DUP_E, SET_REWARD } from '../../src/badges.js';

describe('значки 90-х', () => {
    it('новый — в коллекцию, повтор — «Е»; вся коллекция — награда один раз', () => {
        const p = { season: { chips: 0, vhs: 0 } };
        const at = i => () => (i + 0.5) / BADGES.length;
        expect(dropBadge(p, at(0))).toMatchObject({ isNew: true, badge: BADGES[0] });
        expect(dropBadge(p, at(0))).toMatchObject({ isNew: false, dupChips: DUP_E });
        expect(p.season.chips).toBe(DUP_E);
        let last;
        for (let i = 1; i < BADGES.length; i++) last = dropBadge(p, at(i));
        expect(last.setDone).toBe(true);
        expect(p.season.chips).toBe(DUP_E + SET_REWARD.chips);
        expect(p.season.vhs).toBe(SET_REWARD.vhs);
        expect(dropBadge(p, at(3)).setDone).toBe(false);
        expect(badgesHtml(p)).toContain(BADGES.length + ' / ' + BADGES.length);
    });
});
