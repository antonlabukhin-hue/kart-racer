import { describe, it, expect } from 'vitest';
import { tuneKind, partName } from '../../src/cars-tuning.js';
import { MOVIE_CARS } from '../../src/cars-movie.js';
import { CAR_PARTS } from '../../src/content.js';

describe('тюнинг машин «из кино» и новых', () => {
    it('тип машины — по колёсам и по смыслу', () => {
        expect(tuneKind('moped', 2)).toBe('bike');
        expect(tuneKind('trike', 3)).toBe('trike');
        expect(tuneKind('carpet', 0)).toBe('carpet');
        expect(tuneKind('chariot', 2)).toBe('chariot');
        expect(tuneKind('timecar', 4)).toBe('car');
    });
    it('у мопеда, мотоцикла, колесницы и ковра детали названы по-своему, у машин — как обычно', () => {
        expect(partName('moped', 'spoiler')).toBe('Спинка-дуга');
        expect(partName('cyborg', 'roof_rack')).toBe('Кофр');
        expect(partName('carpet', 'roof_rack')).toBe('Сундук');
        expect(partName('chariot', 'exhaust')).toBe('Шлейф пузырей');
        expect(partName('timecar', 'spoiler')).toBe(null);
        expect(partName('cheburashka', 'spoiler')).toBe(null);
    });
    it('для каждой детали гаража у мото и фэнтези есть своё название (кроме общих)', () => {
        ['moped', 'carpet', 'chariot'].forEach(id => CAR_PARTS.forEach(p => {
            if (p.id === 'xenon' || (p.id === 'rims' && id === 'moped')) return;
            expect(partName(id, p.id), id + ':' + p.id).toBeTruthy();
        }));
        expect(MOVIE_CARS).toEqual(expect.arrayContaining(['moped', 'trike', 'chariot', 'carpet', 'cyborg']));
    });
});
