import { describe, it, expect } from 'vitest';
import fs from 'fs';
import { LINES, pickLine, allLines, plaqueKind, GAP } from '../../src/announcer.js';

describe('ведущий-комментатор', () => {
    it('id реплик уникальны и годятся для имён файлов', () => {
        const ids = allLines().map(l => l.id);
        expect(new Set(ids).size).toBe(ids.length);
        ids.forEach(id => expect(id).toMatch(/^[a-z]+_\d+$/));
    });

    it('обычные реплики — не чаще раза в GAP секунд, важные перебивают', () => {
        const st = {}, one = () => 0;
        expect(pickLine(st, 'nitro', 10, one)).not.toBe(null);
        expect(pickLine(st, 'nitro', 10 + GAP - 1, one)).toBe(null);
        expect(pickLine(st, 'record', 10 + 1, one)).not.toBe(null);
        expect(pickLine(st, 'nitro', 11 + GAP + 0.1, one)).not.toBe(null);
    });

    it('частые события — не каждый раз', () => {
        expect(pickLine({}, 'nearMiss', 0, () => 0.99)).toBe(null);
        expect(pickLine({}, 'nearMiss', 0, () => 0.1)).not.toBe(null);
    });

    it('не повторяет одну и ту же реплику подряд', () => {
        const st = {}, seen = new Set();
        for (let i = 0; i < LINES.crash.length; i++) seen.add(pickLine(st, 'crash', i * 100, () => 0)[0]);
        expect(seen.size).toBe(LINES.crash.length);
    });

    it('плашки игры → повод для реплики', () => {
        expect(plaqueKind('🏆 НОВЫЙ РЕКОРД!')).toBe('record');
        expect(plaqueKind('🔥 В УДАРЕ!')).toBe('fever');
        expect(plaqueKind('🏁 ОБОГНАЛ: Димон')).toBe('overtake');
        expect(plaqueKind('что-то ещё')).toBe(null);
        expect(pickLine({}, null, 0)).toBe(null);
    });

    it('docs/VOICE.md содержит все реплики для записи', () => {
        const doc = fs.readFileSync('docs/VOICE.md', 'utf8');
        allLines().forEach(l => expect(doc, l.id).toContain('`' + l.id + '.mp3`'));
    });
});
