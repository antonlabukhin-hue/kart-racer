import { describe, it, expect } from 'vitest';
import { MEET, MEET_NEAR, MEET_FAR, pickMeet } from '../../src/first-meet.js';

describe('первое знакомство с новым на дороге', () => {
    const w = (o) => Object.assign({ z: 0, x: 0 }, o);
    it('показывает ближайшее новое в окне впереди', () => {
        const seen = new Set();
        const world = w({
            collectibles: [{ type: 'crate', active: true, z: -30 }, { type: 'echip', active: true, z: -20 }],
            obstacles: [{ type: 'ice', active: true, z: -25 }]
        });
        expect(pickMeet(world, seen)).toBe('echip');
        seen.add('echip');
        expect(pickMeet(world, seen)).toBe('slide'); // лёд, масло, кислота, смола — одно «скользкое пятно»
        seen.add('slide');
        expect(pickMeet(world, seen)).toBe('crate');
    });
    it('не показывает слишком близкое, далёкое, позади, уже знакомое и неактивное', () => {
        const seen = new Set(['gum']);
        expect(pickMeet(w({ collectibles: [{ type: 'crate', active: true, z: -(MEET_NEAR - 1) }] }), seen)).toBe(null);
        expect(pickMeet(w({ collectibles: [{ type: 'crate', active: true, z: -(MEET_FAR + 1) }] }), seen)).toBe(null);
        expect(pickMeet(w({ collectibles: [{ type: 'crate', active: true, z: 20 }] }), seen)).toBe(null);
        expect(pickMeet(w({ collectibles: [{ type: 'gum', active: true, z: -20 }] }), seen)).toBe(null);
        expect(pickMeet(w({ collectibles: [{ type: 'crate', active: false, z: -20 }] }), seen)).toBe(null);
    });
    it('звери — только выбежавшие, попутки — только в своей стороне, щиты — несбитые', () => {
        const seen = new Set();
        expect(pickMeet(w({ animals: [{ triggered: false, z: -20 }] }), seen)).toBe(null);
        expect(pickMeet(w({ animals: [{ triggered: true, hit: false, z: -20 }] }), seen)).toBe('animal');
        expect(pickMeet(w({ cars: [{ x: 99, z: -20 }] }), seen)).toBe(null);
        expect(pickMeet(w({ cars: [{ x: 2, z: -20 }] }), seen)).toBe('traffic');
        expect(pickMeet(w({ boards: [{ smashed: true, z: -20 }] }), seen)).toBe(null);
        expect(pickMeet(w({ boards: [{ smashed: false, z: -20 }] }), seen)).toBe('billboard');
    });
    it('у каждого знакомства есть значок, заголовок и текст', () => {
        Object.keys(MEET).forEach(k => { expect(MEET[k].icon).toBeTruthy(); expect(MEET[k].title).toBeTruthy(); expect(MEET[k].text.length).toBeGreaterThan(15); });
    });
});
