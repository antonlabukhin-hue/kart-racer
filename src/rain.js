/**
 * Дождь: косые струи вокруг машины (LineSegments — одна отрисовка на весь дождь).
 * Капли падают быстро, чем быстрее едешь — тем сильнее их сносит назад; упавшая переносится наверх, в облако вокруг игрока.
 * update(dt, x, z, speed01) зовётся каждый кадр; visible — включает погода (пейзаж «Дождь», дождливая трасса кампании).
 */
import * as THREE from 'three';

export const RAIN_FALL = 22;   // ед./с вниз
export const RAIN_LEN = 0.55;  // длина струи

/** Сдвиг капли за кадр: [dx, dy, dz] (чистая функция, с тестами) */
export function rainStep(dt, speed01) {
    const back = 6 + 30 * Math.max(0, Math.min(1, speed01 || 0)); // встречный поток: капли летят навстречу машине
    return [0.8 * dt, -RAIN_FALL * dt, back * dt];
}

export function createRain(scene, opts) {
    const o = opts || {};
    const count = o.count || 600, W = o.width || 26, D = o.depth || 60, H = o.height || 12;
    const pos = new Float32Array(count * 6);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.LineBasicMaterial({ color: 0xbfd6ee, transparent: true, opacity: 0.55, depthWrite: false });
    const lines = new THREE.LineSegments(geo, mat);
    lines.frustumCulled = false;
    lines.userData.dynamic = true; // не «статика» трассы: иначе куски-чанки (src/chunk-cull.js) забирают дождь к старту и прячут
    lines.visible = false;
    scene.add(lines);
    const head = new Float32Array(count * 3);
    const place = function(i, x, z, anyY) {
        head[i * 3] = x + (Math.random() - 0.5) * W;
        head[i * 3 + 1] = anyY ? Math.random() * H : H * (0.7 + Math.random() * 0.3);
        head[i * 3 + 2] = z - D * 0.75 + Math.random() * D; // больше капель впереди — их видно на фоне дороги
    };
    let ready = false;
    return {
        lines: lines,
        get visible() { return lines.visible; },
        set visible(v) { lines.visible = !!v; },
        update: function(dt, x, z, speed01) {
            if (!lines.visible) return;
            if (!ready) { for (let i = 0; i < count; i++) place(i, x, z, true); ready = true; }
            const st = rainStep(Math.min(dt, 0.05), speed01);
            const len = st[1] !== 0 ? RAIN_LEN / Math.abs(st[1]) : 0; // струя — вдоль скорости
            for (let i = 0; i < count; i++) {
                const i3 = i * 3;
                head[i3] += st[0]; head[i3 + 1] += st[1]; head[i3 + 2] += st[2];
                if (head[i3 + 1] < 0 || head[i3 + 2] > z + D * 0.3 || head[i3 + 2] < z - D) place(i, x, z, false);
                const j = i * 6;
                pos[j] = head[i3]; pos[j + 1] = head[i3 + 1]; pos[j + 2] = head[i3 + 2];
                pos[j + 3] = head[i3] - st[0] * len; pos[j + 4] = head[i3 + 1] + RAIN_LEN; pos[j + 5] = head[i3 + 2] - st[2] * len;
            }
            geo.attributes.position.needsUpdate = true;
        }
    };
}
