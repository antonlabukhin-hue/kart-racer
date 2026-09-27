import { describe, it, expect } from 'vitest';
import { gapStyle } from '../../src/setpieces.js';
// раскладка участков по трассе — tests/unit/track-layout.test.js

describe('постановочные участки', () => {
    it('у каждой карты своё «дно» разлома', () => {
        const styles = [gapStyle('arsenev', false), gapStyle('promzona', false), gapStyle('svalka', false), gapStyle('arsenev', true)];
        expect(new Set(styles.map(s => s.floor)).size).toBe(4);
    });
});
