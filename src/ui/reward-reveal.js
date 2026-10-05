/**
 * Конец заезда — «вкус победы»: сначала (если новый рекорд) праздник с салютом и яркой плашкой,
 * потом крупная золотая «Е» крутится в 3D и снизу набегает, сколько заработал; «Дальше» — 3D-кассета (если были).
 * o: { chips, vhs, record: { dist } | null, onRecordStart(), onDone(), onRetry() — «🔄 Ещё раз»: сразу новый заезд, без итогов }
 * onRecordStart — показать «кино» с машиной за салютом (главный модуль запускает 3D-сцену заставки).
 */
import * as THREE from 'three';
import { createEChip, eGlow } from '../echip.js';
import { createCassette } from '../cassette.js';

function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

/** Салют: вспышки частиц на 2D-холсте поверх всего. Возвращает stop() */
export function fireworks(host) {
    const cv = el('canvas', 'rr-fireworks');
    host.appendChild(cv);
    const ctx = cv.getContext('2d');
    const fit = function() { cv.width = host.clientWidth; cv.height = host.clientHeight; };
    fit();
    const parts = [];
    const colors = ['#ffd23c', '#ff5a3c', '#3cd2ff', '#9a5aff', '#5aff8a', '#ffffff'];
    let raf = 0, next = 0, last = performance.now();
    const burst = function() {
        const x = cv.width * (0.15 + Math.random() * 0.7), y = cv.height * (0.12 + Math.random() * 0.35);
        const c = colors[Math.floor(Math.random() * colors.length)];
        for (let i = 0; i < 60; i++) {
            const a = Math.random() * Math.PI * 2, v = 120 + Math.random() * 220;
            parts.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1.2 + Math.random() * 0.6, t: 0, c: c });
        }
    };
    const tick = function(now) {
        const dt = Math.min(0.05, (now - last) / 1000); last = now;
        next -= dt;
        if (next <= 0) { burst(); next = 0.35 + Math.random() * 0.4; }
        ctx.clearRect(0, 0, cv.width, cv.height);
        for (let i = parts.length - 1; i >= 0; i--) {
            const p = parts[i];
            p.t += dt; p.vy += 160 * dt; p.vx *= 0.985; p.vy *= 0.985;
            p.x += p.vx * dt; p.y += p.vy * dt;
            const k = 1 - p.t / p.life;
            if (k <= 0) { parts.splice(i, 1); continue; }
            ctx.globalAlpha = k; ctx.fillStyle = p.c;
            ctx.beginPath(); ctx.arc(p.x, p.y, 2.2 + k * 1.8, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
        raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    window.addEventListener('resize', fit);
    return function stop() { cancelAnimationFrame(raf); window.removeEventListener('resize', fit); cv.remove(); };
}

/** Крутящийся 3D-предмет на своём маленьком холсте. Возвращает stop() */
function spinner(host, make) {
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); } catch (e) { return function() {}; }
    const size = Math.min(320, Math.round(Math.min(window.innerWidth, window.innerHeight) * (window.innerHeight < 500 ? 0.36 : 0.5)));
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(size, size);
    renderer.domElement.className = 'rr-spin';
    host.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.add(new THREE.AmbientLight(0xffffff, 0.9));
    const d = new THREE.DirectionalLight(0xfff2d0, 2.2); d.position.set(2, 3, 4); scene.add(d);
    const d2 = new THREE.DirectionalLight(0x88aaff, 0.8); d2.position.set(-3, -1, 2); scene.add(d2);
    const cam = new THREE.PerspectiveCamera(35, 1, 0.1, 20); cam.position.set(0, 0, 3.2);
    const obj = make(); scene.add(obj);
    let raf = 0, t = 0, last = performance.now();
    const tick = function(now) {
        const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
        obj.rotation.y = Math.sin(t * 1.8) * 0.85; // покачивается лицом к игроку (с изнанки «Е» читалась бы как «Э»)
        obj.position.y = Math.sin(t * 2) * 0.06;
        const s = Math.min(1, t * 3); obj.scale.setScalar(obj.userData.base * (0.4 + 0.6 * s) * (1 + 0.04 * Math.sin(t * 6)));
        renderer.render(scene, cam);
        raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return function stop() { cancelAnimationFrame(raf); try { renderer.dispose(); renderer.forceContextLoss(); } catch (e) {} renderer.domElement.remove(); };
}

/** Число набегает от 0 до to за ~1 с */
function countUp(node, to, suffix) {
    const t0 = performance.now();
    const step = function(now) {
        const k = Math.min(1, (now - t0) / 1000);
        node.textContent = '+' + Math.round(to * (1 - Math.pow(1 - k, 3))) + suffix;
        if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
}

export const SKIP_KEY = 'road_racing_skip_reveal'; // только для автотестов: сразу к итогам
export function showRewardReveal(o) {
    try { if (localStorage.getItem(SKIP_KEY) === '1') { if (o.onDone) o.onDone(); return null; } } catch (e) {}
    const root = el('div', 'reward-reveal');
    document.body.appendChild(root);
    let stopSpin = null, stopFw = null;
    const clear = function() { if (stopSpin) stopSpin(); if (stopFw) stopFw(); stopSpin = stopFw = null; root.innerHTML = ''; };
    const finish = function() { clear(); root.remove(); if (o.onDone) o.onDone(); };
    // «Ещё раз» на каждом шаге: от аварии до нового заезда — одно нажатие
    const retry = function() {
        if (!o.onRetry) return;
        const r = el('button', 'rr-retry', '🔄 Ещё раз'); r.type = 'button';
        r.onclick = function() { clear(); root.remove(); o.onRetry(); };
        root.appendChild(r);
    };
    const steps = [];
    if (o.record) steps.push(function(next) {
        root.classList.add('rr-record');
        if (o.onRecordStart) { try { o.onRecordStart(); } catch (e) {} }
        stopFw = fireworks(root);
        root.appendChild(el('div', 'rr-record-plaque', '🎉 НОВЫЙ РЕКОРД!<small>' + Math.round(o.record.dist) + ' м</small>'));
        const b = el('button', 'rr-next', 'Дальше →'); b.type = 'button'; b.onclick = next; root.appendChild(b); retry();
        setTimeout(function() { if (b.isConnected) b.classList.add('show'); }, 900);
    });
    steps.push(function(next) {
        root.classList.remove('rr-record');
        stopSpin = spinner(root, function() { const g = new THREE.Group(); g.add(createEChip(true), eGlow()); g.userData.base = 1.25; return g; });
        const pl = el('div', 'rr-plaque rr-gold', '<i>Е</i><b>+0</b><small>железных «Е» за заезд</small>');
        root.appendChild(pl); countUp(pl.querySelector('b'), o.chips || 0, '');
        const b = el('button', 'rr-next show', o.vhs > 0 ? 'Дальше →' : 'К итогам →'); b.type = 'button'; b.onclick = next; root.appendChild(b); retry();
    });
    if (o.vhs > 0) steps.push(function(next) {
        stopSpin = spinner(root, function() { const g = createCassette(); g.userData.base = 1.7; return g; });
        const pl = el('div', 'rr-plaque rr-vhs', '<i>📼</i><b>+0</b><small>видеокассет — редкая валюта</small>');
        root.appendChild(pl); countUp(pl.querySelector('b'), o.vhs, '');
        const b = el('button', 'rr-next show', 'К итогам →'); b.type = 'button'; b.onclick = next; root.appendChild(b); retry();
    });
    let i = 0;
    const go = function() { clear(); if (i >= steps.length) { finish(); return; } steps[i++](go); };
    go();
    return root;
}
