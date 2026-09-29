// Картинки игры — рендеры из самого движка, один стиль с живым фоном меню.
// Запуск: npm run art                      — все кадры
//         ART_ONLY=menu_race,camp npm run art — только выбранные (camp — все главы, trophy — все трофеи, cars — машины)
// Кадр = диорама из моделей игры (src/art-scene.js): машины, боссы, звери, разлом, поезд, щиты 90-х.
// Камера всегда смотрит к +z: машина «навстречу» — rotY 0, «от камеры» — rotY π; боссу лицом к камере — rotY π.
import { test, expect } from '@playwright/test';
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../public/images');
const only = process.env.ART_ONLY ? process.env.ART_ONLY.split(',') : null;
const want = (name, group) => !only || only.includes(name) || (!!group && only.includes(group));
const PI = Math.PI;

// ---------------------------------------------------------------- постановки
const SHOTS = {
    // ключевой арт: курьер перелетает разлом, за ним гонится босс
    menu_main: { w: 1376, h: 768, spec: {
        map: 'arsenev', time: 'sunset', seed: 11,
        gap: { z: -3.2, len: 5.5 }, ramp: { x: 0, z: 6.5 },
        car: { id: 'cheburashka', x: 0, y: 1.5, z: -0.2, tiltX: 0.14, nitro: true },
        boss: { idx: 0, x: -0.9, z: 10, rotY: PI },
        boards: [{ x: 5.8, z: 22, ad: 1 }],
        camera: { pos: [3.4, 0.55, -7.2], look: [-0.2, 1.6, 3], fov: 50 } } },
    splash: { w: 1376, h: 768, spec: {
        map: 'arsenev', time: 'sunset', seed: 12,
        gap: { z: -3.2, len: 5.5 }, ramp: { x: 0, z: 6.5 },
        car: { id: 'cheburashka', x: 0, y: 1.3, z: 0.3, tiltX: 0.12, nitro: true },
        boss: { idx: 2, x: -0.8, z: 11, rotY: PI },
        camera: { pos: [-2.8, 0.4, -6], look: [0.4, 1.7, 4], fov: 54 } } },
    // кампания: курьер против босса
    menu_campaign: { w: 1312, h: 816, spec: {
        map: 'arsenev', time: 'sunset', seed: 13,
        car: { id: 'cheburashka', x: -0.4, z: 0, rotY: PI },
        boss: { idx: 0, x: 0.3, z: 9, rotY: PI },
        camera: { pos: [1.5, 0.75, -4.4], look: [0.2, 1.7, 9], fov: 50 } } },
    // свободный заезд: нитро в тайге
    menu_race: { w: 1312, h: 816, spec: {
        map: 'arsenev', time: 'day', seed: 14,
        car: { id: 'cheburashka', x: 0.2, z: 0, nitro: true },
        pickups: [{ type: 'nitro', x: -1.5, y: 0, z: 7 }],
        boards: [{ x: -5.6, z: 16, ad: 3 }],
        camera: { pos: [-1.9, 0.55, -3.6], look: [0.3, 0.55, 1.5], fov: 50 } } },
    // «Звериный час»: стая на хвосте ночью
    menu_multiplayer: { w: 1408, h: 768, spec: {
        map: 'arsenev', time: 'night', seed: 15,
        car: { id: 'cheburashka', x: 0, z: 0, nitro: true },
        animals: [
            { kind: 'DOG', x: -2.4, z: 2.2, rotY: PI, leg: 0 }, { kind: 'DOG', x: 2.5, z: 3.4, rotY: PI, leg: 1.5 },
            { kind: 'BOAR', x: -1.2, z: 5.6, rotY: PI, leg: 2.4 }, { kind: 'BEAR', x: 1.4, z: 7.5, rotY: PI, leg: 0.8, scale: 1.3 },
            { kind: 'FOX', x: -3.0, z: 8.5, rotY: PI, leg: 2 }],
        camera: { pos: [0.7, 2.2, -6.4], look: [0, 0.6, 4], fov: 54 } } },
    // гараж: машина ночью с фарами
    menu_garage: { w: 1312, h: 816, spec: {
        map: 'promzona', time: 'night', seed: 16,
        car: { id: 'kirpich', x: 0, z: 0, rotY: -0.35 },
        camera: { pos: [1.9, 0.75, -3.5], look: [-0.2, 0.5, 0.4], fov: 46 } } },
    // награды: звезда, жвачка и нитро над дорогой
    menu_rewards: { w: 1312, h: 816, spec: {
        map: 'arsenev', time: 'sunset', seed: 17,
        car: { id: 'turbo', x: 0.4, z: 7, rotY: 0.1 },
        pickups: [{ type: 'star', x: -0.9, y: 1.45, z: 1.5, scale: 1.3, rotY: 0.3 }, { type: 'gum', x: 0.9, y: 1.0, z: 2.6, scale: 1.2, rotY: -0.4 }, { type: 'nitro', x: 0, y: 0, z: 3.4 }],
        camera: { pos: [0.3, 1.3, -2.8], look: [0, 1.0, 3], fov: 50 } } },
    // события: поезд на переезде ночью
    menu_events: { w: 1312, h: 816, spec: {
        map: 'arsenev', time: 'night', seed: 18,
        train: { z: 14, x: 3 },
        car: { id: 'cheburashka', x: 0.8, z: 4, rotY: PI },
        camera: { pos: [2.6, 1.7, -3.5], look: [-0.5, 1.4, 14], fov: 52 } } },
    map_arsenev: { w: 800, h: 800, spec: {
        map: 'arsenev', time: 'day', seed: 21, car: { id: 'cheburashka', x: 0, z: 0, rotY: PI },
        boards: [{ x: 5.8, z: 18, ad: 0, rotY: PI }], camera: { pos: [0.9, 3.6, -8], look: [0, 0.4, 18], fov: 55 } } },
    map_promzona: { w: 800, h: 800, spec: {
        map: 'promzona', time: 'sunset', seed: 22, car: { id: 'cheburashka', x: 0, z: 0, rotY: PI },
        camera: { pos: [0.9, 3.6, -8], look: [0, 0.4, 18], fov: 55 } } },
    map_svalka: { w: 800, h: 800, spec: {
        map: 'svalka', time: 'day', seed: 23, car: { id: 'cheburashka', x: 0, z: 0, rotY: PI },
        camera: { pos: [0.9, 3.6, -8], look: [0, 0.4, 18], fov: 55 } } },
    map_select: { w: 1376, h: 768, spec: {
        map: 'promzona', time: 'sunset', seed: 24, car: { id: 'cheburashka', x: 0, z: 6, rotY: PI },
        camera: { pos: [7, 11, -8], look: [0, 0, 36], fov: 55 } } },
    car_select: { w: 1376, h: 768, spec: {
        map: 'arsenev', time: 'sunset', seed: 25,
        cars: [{ id: 'kirpich', x: -2.1, z: 0.8, scale: 0.78 }, { id: 'cheburashka', x: 0, z: 0, scale: 0.78 }, { id: 'turbo', x: 2.1, z: 0.8, scale: 0.78 }],
        camera: { pos: [0.9, 1.4, -6], look: [0, 0.5, 0.6], fov: 50 } } },
    win: { w: 1376, h: 768, spec: {
        map: 'arsenev', time: 'sunset', seed: 26, finish: { z: 1.2 },
        car: { id: 'cheburashka', x: 0, z: 0, nitro: true },
        camera: { pos: [2.2, 0.8, -5.5], look: [0, 1.4, 2], fov: 54 } } },
    lose: { w: 1376, h: 768, spec: {
        map: 'arsenev', time: 'night', seed: 27,
        car: { id: 'cheburashka', x: 0.3, z: 0, rotY: 0.6, tilt: 0.3 },
        smoke: [{ x: 0.1, y: 0.8, z: -0.4, r: 0.45 }, { x: 0.3, y: 1.3, z: 0, r: 0.6, o: 0.4 }, { x: 0.6, y: 1.9, z: 0.4, r: 0.75, o: 0.3 }],
        boss: { idx: 1, x: -0.6, z: 5, rotY: PI },
        camera: { pos: [-2.8, 0.5, -4.5], look: [-0.2, 1.6, 4], fov: 56 } } },
    villain_finish: { w: 1408, h: 768, headOf: 3, spec: {
        map: 'promzona', time: 'night', seed: 28, boss: { idx: 3, x: 0, z: 0, rotY: PI } } },
    lore2: { w: 1376, h: 768, spec: {
        map: 'svalka', time: 'night', seed: 29,
        boss: { idx: 6, x: 0.2, z: 7, rotY: PI },
        car: { id: 'cheburashka', x: -1, z: 0.5, rotY: PI + 0.2 },
        camera: { pos: [0.6, 0.35, -2.5], look: [0.1, 2.4, 7], fov: 60 } } }
};

async function boot(page) {
    await page.addInitScript(() => {
        localStorage.setItem('road_racing_briefing_v2', '1');
        localStorage.setItem('road_racing_settings_v1', JSON.stringify({ quality: 'low', music: 0, engine: 0, sfx: 0 }));
    });
    await page.goto('./');
    await expect.poll(() => page.evaluate(() => !!(window.__artKit && window.createAnimalMesh)), { timeout: 30_000 }).toBe(true);
}

async function render(page, file, w, h, spec) {
    const url = await page.evaluate(([spec, w, h, type]) => window.__artKit.renderDiorama(spec, w, h, type),
        [spec, w, h, file.endsWith('.png') ? 'image/png' : 'image/jpeg']);
    fs.writeFileSync(path.join(OUT, file), Buffer.from(url.split(',')[1], 'base64'));
}

test('кадры меню, карт и экранов', async ({ page }) => {
    await boot(page);
    for (const [name, shot] of Object.entries(SHOTS)) {
        if (!want(name, name.startsWith('map_') ? 'maps' : null)) continue;
        const spec = JSON.parse(JSON.stringify(shot.spec));
        if (shot.headOf != null) {
            // портрет злодея: камера на уровне головы (высота модели — по габаритам)
            const hgt = await page.evaluate((idx) => window.__artKit.bossHeight(idx), shot.headOf);
            const hy = hgt * 0.86;
            spec.camera = { pos: [0.6, hy, -hgt * 0.95], look: [0, hy - 0.1, 0], fov: 40 };
        }
        await render(page, name + '.jpg', shot.w, shot.h, spec);
    }
});

// ---------------------------------------------------------------- главы кампании
test('превью глав', async ({ page }) => {
    test.skip(!only ? false : !only.some(o => o === 'camp' || o.startsWith('camp_')));
    await boot(page);
    const tracks = await page.evaluate(() => window.__artKit.tracks.map(t => ({ id: t.id, style: t.style, weather: t.weather, theme: t.theme || '' })));
    for (let i = 0; i < tracks.length; i++) {
        const num = String(i + 1).padStart(2, '0');
        if (!want('camp_' + num, 'camp')) continue;
        const t = tracks[i];
        const time = t.weather === 'night' ? 'night' : t.weather === 'rain' ? 'rain' : (i % 2 ? 'sunset' : 'day');
        const spec = {
            map: t.style, time: time, snow: t.theme === 'snow', seed: 100 + i,
            car: { id: 'cheburashka', x: -0.3, z: 0, rotY: PI },
            boss: { idx: i, x: 0.4, z: 13, rotY: PI },
            boards: i % 3 === 0 ? [{ x: 5.8, z: 20, ad: i % 6, rotY: PI }] : [],
            camera: { pos: [1.3, 2.0, -6.5], look: [0, 1.2, 12], fov: 52 }
        };
        await render(page, 'camp_' + num + '.jpg', 640, 400, spec);
    }
});

// ---------------------------------------------------------------- «студия»: машины и трофеи (прозрачный фон)
async function studio(page, file, w, h, builderSrc, cam) {
    const url = await page.evaluate(([src, w, h, cam]) => {
        const T = window.THREE;
        const r = new T.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
        r.setSize(w, h, false);
        r.setPixelRatio(1);
        r.outputColorSpace = T.SRGBColorSpace;
        r.toneMapping = T.ACESFilmicToneMapping;
        r.setClearColor(0x000000, 0);
        const sc = new T.Scene();
        sc.add(new T.HemisphereLight(0xffe8d0, 0x3a3040, 1.3));
        const key = new T.DirectionalLight(0xfff0dc, 2.6); key.position.set(4, 6, -5); sc.add(key);
        const rim = new T.DirectionalLight(0xff9a50, 1.6); rim.position.set(-5, 3, 4); sc.add(rim);
        const obj = (new Function('T', 'kit', 'return (' + src + ')(T, kit);'))(T, window.__artKit);
        sc.add(obj);
        const c = new T.PerspectiveCamera(cam.fov, w / h, 0.05, 100);
        c.position.set(cam.pos[0], cam.pos[1], cam.pos[2]);
        c.lookAt(cam.look[0], cam.look[1], cam.look[2]);
        r.render(sc, c);
        const out = r.domElement.toDataURL('image/png');
        r.dispose(); r.forceContextLoss();
        return out;
    }, [builderSrc.toString(), w, h, cam]);
    fs.writeFileSync(path.join(OUT, file), Buffer.from(url.split(',')[1], 'base64'));
}

// ---------------------------------------------------------------- открытки боссов (карточка перед боем, стор)
test('портреты боссов', async ({ page }) => {
    test.skip(!only ? false : !only.some(o => o === 'bosses' || o.startsWith('boss_')));
    await boot(page);
    const tracks = await page.evaluate(() => window.__artKit.tracks.map(t => ({ style: t.style, weather: t.weather, theme: t.theme || '' })));
    for (let i = 0; i < 17; i++) {
        const num = String(i + 1).padStart(2, '0');
        if (!want('boss_' + num, 'bosses')) continue;
        const t = tracks[i] || tracks[0];
        const hgt = await page.evaluate((idx) => window.__artKit.bossHeight(idx), i);
        const hy = hgt * 0.72;
        await render(page, 'boss_' + num + '.jpg', 320, 320, {
            map: t.style, time: t.weather === 'night' ? 'night' : (i % 2 ? 'sunset' : 'night'), snow: t.theme === 'snow', seed: 300 + i,
            clouds: false, decoCount: 20, portraitLight: true,
            boss: { idx: i, x: 0, z: 0, rotY: Math.PI },
            camera: { pos: [hgt * 0.35, hy, -hgt * 0.95], look: [0, hy - 0.05, 0], fov: 42 }
        });
    }
});

test('студия: машины', async ({ page }) => {
    test.skip(!want('cars'));
    await boot(page);
    for (const id of ['cheburashka', 'kirpich', 'turbo']) {
        await page.evaluate((cid) => { window.__artCar = cid; }, id);
        await studio(page, 'car_' + id + '.png', 500, 500, (T, kit) => {
            const g = kit.buildCar(window.__artCar).group;
            const cv = document.createElement('canvas'); cv.width = cv.height = 128;
            const cx = cv.getContext('2d'); const gr = cx.createRadialGradient(64, 64, 8, 64, 64, 64);
            gr.addColorStop(0, 'rgba(0,0,0,0.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); cx.fillStyle = gr; cx.fillRect(0, 0, 128, 128);
            const shadow = new T.Mesh(new T.PlaneGeometry(2.2, 3.6), new T.MeshBasicMaterial({ map: new T.CanvasTexture(cv), transparent: true, depthWrite: false }));
            shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.01;
            g.add(shadow);
            return g;
        }, { pos: [3.6, 1.6, -3.6], look: [0, 0.55, 0], fov: 36 });
    }
});

test('студия: трофеи', async ({ page }) => {
    test.skip(!want('trophy'));
    await boot(page);
    const TROPHIES = [
        ['first_win', '🏁', 0xf2c14e], ['first_perfect', '✨', 0x9fe3ff], ['night_rider', '🌙', 0x8fa0ff], ['rain_man', '🌧', 0x7fd0e8],
        ['hard_win', '🔥', 0xff7a3a], ['gum_2', '🍬', 0xff8ac8], ['no_nitro', '🚫', 0xd8d8d8], ['oil_lover', '🛢', 0x9a9a78],
        ['bear_friend', '🐻', 0xc08a50], ['season5', '⭐', 0xffd84a], ['races10', '🔟', 0x8ee07a], ['wins5', '🏆', 0xf2c14e]
    ];
    for (const [id, emoji, color] of TROPHIES) {
        await page.evaluate(([e, c]) => { window.__artTrophy = { e, c }; }, [emoji, color]);
        await studio(page, 'trophy_' + id + '.png', 256, 256, (T) => {
            const { e, c } = window.__artTrophy;
            const g = new T.Group();
            const gold = new T.MeshStandardMaterial({ color: c, metalness: 0.45, roughness: 0.32 });
            const wood = new T.MeshStandardMaterial({ color: 0x3a2418, roughness: 0.7 });
            const base = new T.Mesh(new T.BoxGeometry(1.3, 0.42, 1.0), wood); base.position.y = 0.21; g.add(base);
            const step = new T.Mesh(new T.BoxGeometry(0.9, 0.16, 0.7), wood); step.position.y = 0.5; g.add(step);
            const stem = new T.Mesh(new T.CylinderGeometry(0.09, 0.16, 0.5, 16), gold); stem.position.y = 0.83; g.add(stem);
            const pts = [];
            for (let i = 0; i <= 12; i++) { const t = i / 12; pts.push(new T.Vector2(0.12 + Math.sin(t * Math.PI * 0.55) * 0.52, t * 0.85)); }
            const cup = new T.Mesh(new T.LatheGeometry(pts, 28), gold); cup.position.y = 1.05; g.add(cup);
            [-1, 1].forEach(s => { const h = new T.Mesh(new T.TorusGeometry(0.2, 0.045, 10, 20, Math.PI), gold); h.rotation.z = -s * Math.PI / 2; h.position.set(s * 0.62, 1.55, 0); g.add(h); });
            const cv = document.createElement('canvas'); cv.width = 256; cv.height = 128;
            const cx = cv.getContext('2d');
            cx.fillStyle = '#e8d49a'; cx.fillRect(0, 0, 256, 128);
            cx.font = '96px "Segoe UI Emoji", "Apple Color Emoji", sans-serif'; cx.textAlign = 'center'; cx.textBaseline = 'middle';
            cx.fillText(e, 128, 70);
            const tex = new T.CanvasTexture(cv); tex.colorSpace = T.SRGBColorSpace;
            const plaque = new T.Mesh(new T.PlaneGeometry(0.8, 0.4), new T.MeshStandardMaterial({ map: tex, roughness: 0.5, metalness: 0.1 }));
            plaque.position.set(0, 0.22, -0.505); plaque.rotation.y = Math.PI; g.add(plaque);
            return g;
        }, { pos: [1.1, 1.6, -3.4], look: [0, 0.95, 0], fov: 38 });
    }
});
