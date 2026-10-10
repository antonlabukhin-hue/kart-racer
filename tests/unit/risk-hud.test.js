import { describe, it, expect } from 'vitest';
import { powerState } from '../../src/ui/risk-hud.js';
import { createRisk, riskEvent, FEVER_TIME } from '../../src/risk-combo.js';
import { createRideState, startRide, RIDE_TIME } from '../../src/rides.js';

describe('одна шкала заезда', () => {
    it('пусто — спрятана; цепочка — ×N и деления до «В ударе»', () => {
        const r = createRisk(true);
        expect(powerState(r, createRideState())).toBe(null);
        riskEvent(r, 'nearMiss'); riskEvent(r, 'nearMiss');
        expect(powerState(r, null)).toMatchObject({ mode: 'chain', label: '×3', mult: 3, segs: 5 });
    });
    it('«В ударе» и транспорт — та же шкала, тает по секундам; транспорт важнее', () => {
        const r = createRisk(true); for (let i = 0; i < 5; i++) riskEvent(r, 'nearMiss');
        expect(r.fever).toBe(FEVER_TIME);
        expect(powerState(r, null)).toMatchObject({ mode: 'fever', fill: 1 });
        const ride = createRideState(); startRide(ride, 'tractor'); ride.t = RIDE_TIME / 2;
        expect(powerState(r, ride)).toMatchObject({ mode: 'ride', fill: 0.5 });
    });
});
