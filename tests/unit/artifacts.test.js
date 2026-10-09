import { describe, it, expect } from 'vitest';
import { ARTIFACTS, rollArtifact, grantArtifact, artifactsHtml, ARTIFACT_E, DUP_E, SET_REWARD } from '../../src/artifacts.js';
import { BADGES } from '../../src/badges.js';

describe('альбом «Артефакты 90-х»', () => {
    it('не повторяет значки из ящиков', () => {
        const names = BADGES.map(function(b) { return b.name; });
        ARTIFACTS.forEach(function(a) { expect(names).not.toContain(a.name); expect(a.memo.length).toBeGreaterThan(20); });
    });
    it('новый — «Е» и в альбом, повтор — немного «Е», весь альбом — награда один раз', () => {
        const p = {};
        expect(grantArtifact(p, ARTIFACTS[0]).chips).toBe(ARTIFACT_E);
        expect(grantArtifact(p, ARTIFACTS[0])).toMatchObject({ isNew: false, chips: DUP_E });
        let last;
        ARTIFACTS.slice(1).forEach(function(a) { last = grantArtifact(p, a); });
        expect(last.setDone).toBe(true);
        expect(p.season.vhs).toBe(SET_REWARD.vhs);
        expect(artifactsHtml(p)).toContain('альбом собран');
    });
    it('чаще выпадает недостающий', () => {
        const p = { artifacts: { got: {} } };
        ARTIFACTS.slice(0, 11).forEach(function(a) { p.artifacts.got[a.id] = 1; });
        let n = 0; for (let i = 0; i < 100; i++) if (rollArtifact(p).id === ARTIFACTS[11].id) n++;
        expect(n).toBeGreaterThan(50);
    });
});
