/**
 * Участки трассы: неподвижные объекты раскладываются по контейнерам длиной SPAN вдоль трассы.
 * Участок, который дальше видимости (туман / дальность камеры) или позади машины, выключается целиком:
 * three.js не обходит его ни при пересчёте матриц, ни при отрисовке. На поздних главах в сцене ~1500 объектов
 * по всей трассе, а видно ~четверть — остальное тратило процессор каждый кадр (главная причина подвисаний).
 * Контейнеры стоят в начале координат без поворота — мировые координаты объектов не меняются.
 */
import * as THREE from 'three';

export const SPAN = 60;

/** Какой объект можно убрать в участок: неподвижный, короткий вдоль трассы, не «живой» */
export function cullable(o, box) {
    if (o.isLight || o.isCamera || o.isPoints || o.isSprite) return false;
    const ud = o.userData || {};
    if (ud.dynamic || ud.carId || ud.noCull || ud.type) return false; // машины, звери (type), игрок
    let dyn = false;
    o.traverse(function(c) { if (c !== o && c.userData && (c.userData.dynamic || c.userData.noCull)) dyn = true; });
    if (dyn || box.isEmpty()) return false;
    return box.max.z - box.min.z <= SPAN * 1.5; // дорога, земля, длинные ограждения — во всю трассу, их не трогаем
}

/**
 * Разложить подходящих детей сцены по участкам. Возвращает { chunks, moved, update(zPos, ahead, behind) }.
 * update — каждый кадр (дёшево: десятки участков), включает только участки в окне [zPos - ahead, zPos + behind].
 */
export function buildChunks(scene) {
    const buckets = new Map();
    const box = new THREE.Box3();
    const roots = []; // [объект, x, y, z на момент раскладки] — для проверки «начал двигаться»
    let moved = 0;
    // scene.remove(объект из участка) — снять его из участка (игра удаляет подобранное, снесённое, отыгравшее)
    if (!scene.__chunkRemove) {
        const orig = scene.remove;
        scene.__chunkRemove = true;
        scene.remove = function() {
            for (let i = 0; i < arguments.length; i++) {
                const o = arguments[i];
                if (o && o.parent && o.parent !== scene && o.parent.userData && o.parent.userData.chunk) o.parent.remove(o);
                else orig.call(scene, o);
            }
            return scene;
        };
    }
    scene.updateMatrixWorld(true);
    scene.children.slice().forEach(function(o) {
        box.setFromObject(o);
        if (!cullable(o, box)) return;
        const k = Math.floor((box.min.z + box.max.z) / 2 / SPAN);
        let b = buckets.get(k);
        if (!b) {
            const g = new THREE.Group();
            g.name = 'chunk_' + k;
            g.matrixAutoUpdate = false;
            g.userData.chunk = { min: Infinity, max: -Infinity };
            scene.add(g);
            b = g;
            buckets.set(k, g);
        }
        b.userData.chunk.min = Math.min(b.userData.chunk.min, box.min.z);
        b.userData.chunk.max = Math.max(b.userData.chunk.max, box.max.z);
        b.add(o); // родитель в начале координат без поворота — мировая матрица объекта та же
        roots.push([o, o.position.x, o.position.y, o.position.z]);
        moved++;
    });
    const chunks = Array.from(buckets.values());
    return {
        chunks: chunks,
        moved: moved,
        visibleCount: function() { return chunks.filter(function(c) { return c.visible; }).length; },
        /** Объекты, которые начали двигаться (едут за машиной, улетают), — назад в сцену навсегда. Возвращает, сколько */
        sweep: function() {
            let n = 0;
            for (let i = roots.length - 1; i >= 0; i--) {
                const r = roots[i], o = r[0];
                if (!o.parent || !o.parent.userData.chunk) { roots.splice(i, 1); continue; }
                if (Math.abs(o.position.z - r[3]) > 2 || Math.abs(o.position.x - r[1]) > 6 || Math.abs(o.position.y - r[2]) > 6) {
                    scene.add(o); roots.splice(i, 1); n++;
                }
            }
            return n;
        },
        // трасса идёт к −z: «впереди» — меньшие z
        update: function(zPos, ahead, behind) {
            for (let i = 0; i < chunks.length; i++) {
                const c = chunks[i], r = c.userData.chunk;
                const on = r.max >= zPos - ahead && r.min <= zPos + behind;
                if (on !== c.visible) {
                    c.visible = on;
                    c.matrixWorldAutoUpdate = on; // выключенный участок не обходится и при пересчёте матриц
                    if (on) c.updateMatrixWorld(true);
                }
            }
        }
    };
}
