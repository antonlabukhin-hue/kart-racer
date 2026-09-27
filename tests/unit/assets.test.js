import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

// Каждый файл из public/ должен быть в реестре docs/ASSETS.md — с источником и лицензией
function listFiles(dir, base = dir) {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap(d => {
        const p = path.join(dir, d.name);
        return d.isDirectory() ? listFiles(p, base) : [path.relative(base, p).split(path.sep).join('/')];
    });
}

describe('реестр ассетов', () => {
    it('все файлы из public/ записаны в docs/ASSETS.md', () => {
        const doc = fs.readFileSync(path.resolve('docs/ASSETS.md'), 'utf8');
        const missing = listFiles(path.resolve('public')).filter(f => !doc.includes('| ' + f + ' |'));
        expect(missing).toEqual([]);
    });
});
