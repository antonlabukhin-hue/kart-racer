import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

// «Трещотка» для src/main.js: файл и число глобальных window.__* могут только уменьшаться.
// Вынес кусок в модуль — опусти пороги до новых значений (тест подскажет какие).
const MAX_MAIN_LINES = 11702;
const MAX_MAIN_WINDOW_GLOBALS = 442;

const read = f => fs.readFileSync(path.resolve(f), 'utf8');
const globals = src => (src.match(/window\.__[A-Za-z0-9_]+/g) || []).length;

describe('архитектура', () => {
    it('main.js не растёт — новое пишем в модули', () => {
        const src = read('src/main.js');
        const lines = src.split(/\r?\n/).length;
        expect(lines, 'строк в main.js (порог можно снизить до ' + lines + ')').toBeLessThanOrEqual(MAX_MAIN_LINES);
        expect(globals(src), 'window.__* в main.js').toBeLessThanOrEqual(MAX_MAIN_WINDOW_GLOBALS);
    });

    it('экраны в src/ui не используют глобальные window.__* — зависимости передаются явно', () => {
        const dir = path.resolve('src/ui');
        fs.readdirSync(dir).filter(f => f.endsWith('.js')).forEach(f => {
            expect(globals(read('src/ui/' + f)), f).toBe(0);
        });
    });
});
