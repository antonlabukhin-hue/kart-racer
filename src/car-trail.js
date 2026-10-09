/**
 * След за машиной игрока: клубы выхлопа (на нитро — длинный голубоватый шлейф) и пыль из-под задних колёс
 * цвета земли пейзажа (на обочине — гуще, в снегу — снежная пыль, в дождь — брызги).
 * Одно облако точек на весь след (один вызов отрисовки), обычное смешивание — серое не светится.
 *
 * trailRates(o) — чистая логика (с тестами): сколько клубов в секунду и какого вида.
 */
import * as THREE from 'three';

/** Насколько пылит пейзаж: свалка и город на окраине — сильнее, ночью почти не видно */
export function dustiness(theme) {
    if (!theme) return 0.6;
    if (theme.snow) return 1;
    if (theme.rain) return 0.9;
    if (theme.night) return 0.25;
    return { junk: 1.1, arsenev: 0.8, industrial: 0.8, village: 0.6, city: 0.45, forest: 0.5 }[theme.style] || 0.6;
}

/**
 * o: { speedK (0..1+ доля от максимальной), nitro, offroad, airborne, theme }
 * → { exhaust, dust } — клубов в секунду
 */
export function trailRates(o) {
    if (o.airborne) return { exhaust: o.nitro ? 30 : 4, dust: 0 };
    const k = Math.max(0, Math.min(1.4, o.speedK || 0));
    const exhaust = o.nitro ? 34 : 3 + k * 5;
    const dust = k < 0.15 ? 0 : (k * 18 + (o.offroad ? 26 : 0)) * dustiness(o.theme);
    return { exhaust: exhaust, dust: dust };
}

/** Цвет пыли пейзажа: земля, высветленная к дымке; снег — белый, дождь — серо-голубые брызги */
export function dustColor(theme) {
    if (!theme) return 0xc8b090;
    if (theme.snow) return 0xf4f8ff;
    if (theme.rain) return 0xb8c4cc;
    const g = theme.ground != null ? theme.ground : 0xa08866, f = theme.fog != null ? theme.fog : 0xe0c090;
    const mix = function(sh) { return Math.min(255, Math.round((((g >> sh) & 255) * 0.35) + (((f >> sh) & 255) * 0.65) + 14)); }; // светлее земли — пыль, а не грязь
    return (mix(16) << 16) | (mix(8) << 8) | mix(0);
}

export function createCarTrail(scene, opt) {
    opt = opt || {};
    const N = opt.lite ? 70 : 110;
    const pos = new Float32Array(N * 3), col = new Float32Array(N * 3), size = new Float32Array(N), alpha = new Float32Array(N);
    const vel = new Float32Array(N * 3), life = new Float32Array(N), age = new Float32Array(N), s0 = new Float32Array(N), a0 = new Float32Array(N);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(size, 1));
    geo.setAttribute('alpha', new THREE.BufferAttribute(alpha, 1));
    const mat = new THREE.ShaderMaterial({
        vertexShader: `attribute float size; attribute float alpha; attribute vec3 color; varying float vA; varying vec3 vC;
            void main() { vA = alpha; vC = color; vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = min(size * (300.0 / max(-mvPosition.z, 0.01)), 56.0); vA *= smoothstep(2.5, 5.0, -mvPosition.z); // у самой камеры — гаснут, не пятна на весь экран gl_Position = projectionMatrix * mvPosition; }`,
        fragmentShader: `varying float vA; varying vec3 vC;
            void main() { float d = length(gl_PointCoord - vec2(0.5)); if (d > 0.5) discard;
            gl_FragColor = vec4(vC, smoothstep(0.5, 0.15, d) * vA); }`,
        transparent: true, depthWrite: false
    });
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    pts.userData.dynamic = true;
    scene.add(pts);

    let next = 0, accE = 0, accD = 0;
    const c = new THREE.Color();
    function spawn(x, y, z, vx, vy, vz, sz, a, lf, hex) {
        const i = next; next = (next + 1) % N;
        pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
        vel[i * 3] = vx; vel[i * 3 + 1] = vy; vel[i * 3 + 2] = vz;
        c.setHex(hex); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
        s0[i] = sz; a0[i] = a; life[i] = lf; age[i] = 0;
    }

    return {
        points: pts,
        /** car: { x, y, z, vz (скорость по z, ед./с), speedK, nitro, offroad, airborne, theme, len, w } — каждый кадр */
        update: function(dt, car) {
            dt = Math.min(dt, 0.05);
            if (car) {
                const r = trailRates(car), rear = car.z + (car.len || 1.5) * 0.5, hw = (car.w || 0.8) * 0.42;
                // клубы увлекаются машиной и отстают плавно — иначе на скорости сразу пропадают за камерой
                const carry = (car.vz || 0) * 0.86;
                accE += r.exhaust * dt; accD += r.dust * dt;
                while (accE >= 1) {
                    accE -= 1;
                    const n = car.nitro;
                    spawn(car.x + hw * 0.5 + (Math.random() - 0.5) * 0.06, (car.y || 0) + 0.18, rear + 0.05,
                        (Math.random() - 0.5) * 0.3, 0.35 + Math.random() * 0.3, carry + 1.2 + Math.random() * 0.8 + (n ? 2.5 : 0),
                        n ? 0.4 : 0.3, n ? 0.7 : 0.55, n ? 0.9 : 0.7, n ? 0xe2ecff : 0xb4b4b8);
                }
                const dc = dustColor(car.theme);
                while (accD >= 1) {
                    accD -= 1;
                    const side = Math.random() < 0.5 ? -1 : 1;
                    spawn(car.x + side * hw + (Math.random() - 0.5) * 0.15, (car.y || 0) + 0.06, rear - 0.1,
                        side * (0.4 + Math.random() * 0.6), 0.25 + Math.random() * 0.45, carry + 1.5 + Math.random() * 1.5,
                        0.38 + Math.random() * 0.22 + (car.offroad ? 0.2 : 0), car.offroad ? 0.75 : 0.55, 0.4 + Math.random() * 0.25, dc);
                }
            }
            for (let i = 0; i < N; i++) {
                if (age[i] >= life[i]) { alpha[i] = 0; continue; }
                age[i] += dt;
                const u = Math.min(1, age[i] / life[i]);
                pos[i * 3] += vel[i * 3] * dt; pos[i * 3 + 1] += vel[i * 3 + 1] * dt; pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
                vel[i * 3] *= 0.96; vel[i * 3 + 1] *= 0.97; vel[i * 3 + 2] *= 0.985;
                size[i] = s0[i] * (1 + u * 1.6);
                alpha[i] = a0[i] * (1 - u) * Math.min(1, u * 6 + 0.2);
            }
            geo.attributes.position.needsUpdate = true;
            geo.attributes.size.needsUpdate = true;
            geo.attributes.alpha.needsUpdate = true;
            geo.attributes.color.needsUpdate = true;
        },
        dispose: function() { scene.remove(pts); geo.dispose(); mat.dispose(); }
    };
}
