import { describe, it, expect } from 'vitest';
import { scriptName } from '../../src/ui/update-check.js';

describe('проверка новой версии', () => {
    it('имя главного скрипта сборки берётся из страницы', () => {
        expect(scriptName('<script type="module" crossorigin src="/kart-racer/assets/index-KmLpGQtH.js"></script>')).toBe('assets/index-KmLpGQtH.js');
        expect(scriptName('./assets/index-a_b-C.js')).toBe('assets/index-a_b-C.js');
        expect(scriptName('<html></html>')).toBe(null);
        expect(scriptName(null)).toBe(null);
    });
});
