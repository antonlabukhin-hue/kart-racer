/**
 * Расстановка плана трассы в сцене: из списка предметов плана (src/infinite.js planStretch, src/patterns.js) — меши и записи
 * в списках заезда. Общая для бесконечной трассы (src/modes/infinite-run.js) и глав кампании (узоры в главах).
 * env: { scene, START_Z, lists: { obstacles, collectibles }, make: { eChip, vhs, power, obstacle, collectible },
 *        busy — зоны постановочных участков [[zLo, zHi]], arch — z арок с падающим грузом, slideOf(d) — тип скользкого пятна,
 *        noNitro, letter() — следующая буква «Слова дня» или null, onPatEnd(z, pat) — конец узора }
 * Узор, задетый постановочным участком, не ставится целиком (src/patterns.js dropBusy).
 */
import { dropBusy } from './patterns.js';
import { createLaneCone, createCrateMesh, createSpikesMesh } from './hazards.js';
import { createLetterToken } from './word-day.js';

const LX = [-2, 0, 2];

export function placePlan(items, env) {
    const L = env.lists, make = env.make, S = env.START_Z;
    dropBusy(items, function(d) { const z = S - d; return (env.busy || []).some(function(b) { return z >= b[0] - 4 && z <= b[1] + 4; }); }).forEach(function(it) {
        const z = S - it.d;
        let c = null;
        if (it.kind === 'patEnd') { if (env.onPatEnd) env.onPatEnd(z, it.pat); return; }
        if (it.kind === 'echip') { L.collectibles.push(make.eChip(it.x != null ? it.x : LX[it.lane], it.y, z)); return; }
        if (it.kind === 'vhs') { L.collectibles.push(make.vhs(LX[it.lane], 0.75, z)); return; }
        if (it.kind === 'power') { L.collectibles.push(make.power(LX[it.lane], z, it.type)); return; }
        if (it.kind === 'letter') {
            const next = env.letter ? env.letter() : null;
            if (!next) return;
            const m = createLetterToken(next); m.position.set(LX[it.lane], 0.9, z); env.scene.add(m);
            L.collectibles.push({ mesh: m, x: LX[it.lane], z: z, type: 'letter', active: true, bob: 0, radius: 0.8, baseY: 0.9 });
            return;
        }
        if (it.kind === 'crate' || it.kind === 'spikes') { // ящик «?» и шипы — src/hazards.js
            const m = it.kind === 'crate' ? createCrateMesh() : createSpikesMesh(); m.position.set(LX[it.lane], 0, z); env.scene.add(m);
            (it.kind === 'crate' ? L.collectibles : L.obstacles).push({ mesh: m, x: LX[it.lane], z: z, type: it.kind, active: true, bob: 0, radius: 0.75, pat: it.pat });
            return;
        }
        if (it.kind === 'obstacle') { c = make.obstacle(z, it.type === 'slide' ? env.slideOf(it.d) : it.type); L.obstacles.push(c); }
        else {
            // случайное нитро — не ближе 45 ед. к арке с падающим грузом; «Без нитро» — нет совсем
            if (it.kind === 'nitro' && (env.noNitro || (env.arch || []).some(function(az) { return Math.abs(az - z) < 45; }))) return;
            c = make.collectible(z, it.kind); L.collectibles.push(c);
        }
        c.x = it.x != null ? it.x : LX[it.lane]; c.pat = it.pat; c.mesh.position.x = c.x;
        if (it.cone != null) { const cn = createLaneCone(); cn.position.x = it.cone; c.mesh.add(cn); } // узор: конус отмечает закрытую полосу
    });
}
