/**
 * Насыщенные обочины бесконечной трассы (сборка — src/scenery-kit.js: один меш на участок, один материал-атлас).
 *   Город (микрорайон): хрущёвки, панельки, «свечки» с лозунгами, сталинки, школа, ДК, гастрономы, киоски,
 *     остановки с мозаикой, фонари, гаражи, припаркованные «Жигули», дворы с деревьями.
 *   Деревня: избы с наличниками и шиферными/крашеными крышами, штакетник, колодцы, стога, огороды, сельпо,
 *     остановка, водонапорная башня, столбы с проводами, бани, трактор, берёзы и яблони.
 *   Лес и тайга: густой лес, озёра с камышом и лодкой, иногда — река под мостом; в тайге озёра замёрзли.
 *   Город-окраина (Арсеньев, ночь, дождь): дальний ряд пятиэтажек, гаражи, киоски, остановки, столбы.
 *   Промзона: трубы в полоску, газгольдеры, башенные краны, бетонный забор ПО-2, цистерны.
 * Предметы стоят полосами вдоль дороги (у обочины — мелочь, дальше — дома), не налезают друг на друга;
 * высота — по холмам обочин (heightAt), фундамент уходит в землю — дома не висят над склоном.
 */
import * as THREE from 'three';
import { cellRect as R, box, cyl, gable, template, place, createBatch, batchMesh, kitMaterial, waterMaterial, setKitGlow, keptOut } from './scenery-kit.js';

const C = function(h) { return new THREE.Color(h); };
const FACADES = { k5: 'k5', k5b: 'k5b', brick5: 'brick5', stalin: 'stalin', p9: 'p9', p9b: 'p9b' };

// ---------------- шаблоны (фасад — к +x; ставится rot 0 слева от дороги, rot 2 — справа) ----------------
function house(name, floors, sections) {
    return template('h_' + name + '_' + sections, function(b) {
        const fh = 0.9, h = floors * fh, D = name === 'p9' || name === 'p9b' ? 4.2 : 3.6, Wd = 4.2;
        const fac = R(FACADES[name]), side = R('side');
        box(b, 0, -1.6, 0, D + 0.2, 1.6, Wd * sections + 0.2, { all: R('side'), noTop: true }, 0x9a958a); // цоколь в землю
        for (let s = 0; s < sections; s++) {
            const z = (s - (sections - 1) / 2) * Wd;
            box(b, 0, 0, z, D, h, Wd, { px: fac, nx: fac, pz: side, nz: side, py: R('roof') });
            box(b, D / 2 + 0.05, 0, z, 0.08, 0.72, 0.62, null, 0x4a3a2c); // дверь подъезда
            box(b, D / 2 + 0.3, 0.8, z, 0.6, 0.08, 1.1, { all: R('side') }, 0xb0aca0); // козырёк
        }
        if (name === 'stalin') box(b, 0, h, 0, D + 0.3, 0.25, Wd * sections + 0.3, { all: R('side') }, 0xf2ead0); // карниз
    });
}
function tower(slogan) {
    return template('tower_' + slogan, function(b) {
        const h = 16 * 0.9, Dw = 4.4;
        box(b, 0, -1.6, 0, Dw + 0.2, 1.6, Dw + 0.2, { all: R('side'), noTop: true }, 0x9a958a);
        box(b, 0, 0, 0, Dw, h, Dw, { all: R('tower'), py: R('roof') });
        box(b, Dw / 2 + 0.05, 0, 0, 0.08, 0.72, 0.7, null, 0x4a3a2c);
        // лозунг на крыше: щит на стойках
        [-2.4, 0, 2.4].forEach(function(z) { box(b, 0, h, z, 0.1, 0.5, 0.1, null, 0x555555); });
        box(b, 0, h + 0.5, 0, 0.12, 0.9, 6.4, { px: R('slogans', slogan, 4), nx: R('slogans', slogan, 4), all: R('white') }, 0xffffff);
    });
}
function shopPavilion(sign) {
    return template('shop_' + sign, function(b) {
        const rect = sign < 4 ? R('signsA', sign, 4) : R('signsB', sign - 4, 4);
        box(b, 0, -1, 0, 4.2, 1, 7.2, { all: R('side'), noTop: true }, 0x9a958a);
        box(b, 0, 0, 0, 4, 1.7, 7, { px: R('vitrine'), nx: R('side'), pz: R('side'), nz: R('side'), py: R('roof') }, 0xffffff);
        box(b, 2.06, 1.7, 0, 0.1, 0.55, 6.6, { px: rect, all: R('white') }, 0xffffff);
    });
}
function bigPublic(kind) { // школа, ДК
    return template('pub_' + kind, function(b) {
        const h = kind === 'dk' ? 3.6 : 2.8, w = kind === 'dk' ? 7 : 9;
        box(b, 0, -1.4, 0, 5.2, 1.4, w + 0.2, { all: R('side'), noTop: true }, 0x9a958a);
        box(b, 0, 0, 0, 5, h, w, { px: R(kind), nx: R('side'), pz: R('side'), nz: R('side'), py: R('roof') }, 0xffffff);
        if (kind === 'dk') box(b, 2.9, 0, 0, 0.9, 0.2, w * 0.8, { all: R('side') }, 0xd8d0bc); // ступени
    });
}
function kiosk(i) {
    return template('kiosk_' + i, function(b) {
        const col = [0x3a6ab8, 0xe8e0d0, 0xd8a030, 0x3a8a5a][i];
        box(b, 0, 0, 0, 1.2, 1.25, 1.3, { all: R('white'), py: R('roof') }, col);
        box(b, 0.62, 0.75, 0, 0.04, 0.45, 1.0, null, 0x2a3848); // окошко
        box(b, 0.64, 1.25, 0, 0.08, 0.3, 1.3, { px: R('kiosk', i, 4), all: R('white') }, 0xffffff);
    });
}
const busStopT = function(village) {
    return template('bus_' + (village ? 'v' : 'c'), function(b) {
        box(b, -0.7, 0, 0, 0.14, 1.5, 3.2, { px: R('mosaic'), all: R('side') }, 0xffffff);
        box(b, 0, 0, 1.55, 1.5, 1.5, 0.1, { all: R('side') }, 0xd8d4c8);
        box(b, 0, 0, -1.55, 1.5, 1.5, 0.1, { all: R('side') }, 0xd8d4c8);
        box(b, 0.05, 1.5, 0, 1.7, 0.14, 3.5, { all: R('side') }, 0xc8c4b8);
        box(b, -0.35, 0.35, 0, 0.4, 0.08, 2.6, null, 0x7a5a3a); // скамейка
        box(b, 0.9, 0, 1.9, 0.06, 1.9, 0.06, null, 0x444444); // табличка «А»
        box(b, 0.9, 1.6, 1.9, 0.05, 0.36, 0.36, null, village ? 0xf2d23a : 0xf2d23a);
    });
};
const lampT = function() { return template('lamp', function(b) {
    box(b, 0, 0, 0, 0.09, 3.3, 0.09, null, 0x5a5a5a);
    box(b, 0.45, 3.2, 0, 0.9, 0.06, 0.06, null, 0x5a5a5a);
    box(b, 0.85, 3.05, 0, 0.26, 0.14, 0.18, { all: R('lamp') }, 0xffffff);
}); };
const pineT = function() { return template('pine', function(b) {
    cyl(b, 0, 0, 0, 0.12, 0.08, 1.4, 6, null, 0x6a3a1c);
    [0, 1, 2, 3].forEach(function(i) { cyl(b, 0, 1.0 + i * 0.5, 0, 0.85 - i * 0.16, 0, 0.95 - i * 0.1, 7, null, i % 2 ? 0x2a5a30 : 0x24522c); });
}); };
const birchT = function() { return template('birch', function(b) {
    cyl(b, 0, 0, 0, 0.09, 0.06, 2.2, 6, R('bark'), 0xffffff);
    cyl(b, 0, 1.5, 0, 0.35, 0.75, 0.6, 7, null, 0x5a8a34); cyl(b, 0, 2.1, 0, 0.75, 0, 1.3, 7, null, 0x4f7f2e);
}); };
const roundTreeT = function(col) { return template('round_' + col, function(b) { // тополь, клён, яблоня
    cyl(b, 0, 0, 0, 0.11, 0.08, 1.4, 6, null, 0x5a3a20);
    cyl(b, 0, 1.0, 0, 0.4, 0.95, 0.7, 7, null, col); cyl(b, 0, 1.7, 0, 0.95, 0.5, 0.7, 7, null, col); cyl(b, 0, 2.4, 0, 0.5, 0, 0.5, 7, null, col);
}); };
const carT = function(col) { return template('car_' + col, function(b) { // «Жигули» у подъезда (вдоль дороги)
    box(b, 0, 0.18, 0, 0.9, 0.42, 2.0, null, col);
    box(b, 0, 0.6, -0.05, 0.82, 0.34, 1.05, null, 0x2a3848);
    box(b, 0, 0.94, -0.05, 0.84, 0.04, 1.0, null, col);
    [[0.42, 0.65], [-0.42, 0.65], [0.42, -0.65], [-0.42, -0.65]].forEach(function(w) { box(b, w[0], 0, w[1], 0.14, 0.34, 0.36, null, 0x151515); });
}); };
const garagesT = function() { return template('garages', function(b) {
    box(b, 0, -0.8, 0, 3.1, 0.8, 6.6, { all: R('side'), noTop: true }, 0x9a958a);
    box(b, 0, 0, 0, 3, 1.5, 6.4, { px: R('garage'), nx: R('side'), pz: R('side'), nz: R('side'), py: R('roof') }, 0xffffff);
}); };
const po2T = function() { return template('po2', function(b) {
    box(b, 0, -0.3, 0, 0.14, 2.0, 4, { all: R('po2'), py: R('side') }, 0xffffff);
    box(b, 0, 1.7, 0, 0.05, 0.05, 4, null, 0x777777); // колючка
}); };
const izbaT = function(roofCol, roofTex, wallTint) { return template('izba_' + roofCol + roofTex + wallTint, function(b) {
    box(b, 0, -1, 0, 3.8, 1.25, 3.4, { all: R('brick'), noTop: true }, 0xbbbbbb); // фундамент
    box(b, 0, 0.25, 0, 3.6, 2.0, 3.2, { px: R('izba'), nx: R('logs'), pz: R('logs'), nz: R('logs'), py: R('logs') }, wallTint);
    gable(b, 0, 2.25, 0, 4.1, 3.8, 1.5, R(roofTex), roofCol, R('planks'), 0xd8c8a8);
    box(b, -0.6, 2.6, 0.7, 0.4, 1.6, 0.4, { all: R('brick') }, 0xffffff); // труба
    box(b, 1.9, 0.25, -1.1, 0.5, 0.25, 0.7, null, 0x7a5a3a); // крыльцо
}); };
const shedT = function() { return template('shed', function(b) {
    box(b, 0, -0.5, 0, 2.2, 2.0, 2.0, { px: R('shed'), all: R('planks') }, 0xffffff);
    gable(b, 0, 1.5, 0, 2.5, 2.3, 0.8, R('slate'), 0xffffff, R('planks'), 0xffffff);
}); };
const wellT = function() { return template('well', function(b) {
    box(b, 0, 0, 0, 1.0, 0.8, 1.0, { all: R('logs') }, 0xffffff);
    box(b, 0, 0.8, 0.45, 0.08, 1.1, 0.08, null, 0x5a3a20); box(b, 0, 0.8, -0.45, 0.08, 1.1, 0.08, null, 0x5a3a20);
    gable(b, 0, 1.9, 0, 1.2, 1.3, 0.5, R('planks'), 0xffffff);
}); };
const hayT = function() { return template('hay', function(b) {
    cyl(b, 0, 0, 0, 0.85, 0.95, 0.9, 8, R('hay'), 0xffffff); cyl(b, 0, 0.9, 0, 0.95, 0, 1.2, 8, R('hay'), 0xffffff);
    box(b, 0, 0, 0, 0.06, 2.4, 0.06, null, 0x5a3a20);
}); };
const selpoT = function() { return template('selpo', function(b) {
    box(b, 0, -1, 0, 3.8, 1, 6.2, { all: R('brick'), noTop: true }, 0xbbbbbb);
    box(b, 0, 0, 0, 3.6, 2.0, 6, { px: R('vitrine'), nx: R('brick'), pz: R('brick'), nz: R('brick') }, 0xffffff);
    gable(b, 0, 2.0, 0, 4.0, 6.4, 1.1, R('slate'), 0xffffff, R('brick'), 0xffffff);
    box(b, 1.86, 2.0, 0, 0.1, 0.5, 4.4, { px: R('signsB', 3, 4), all: R('white') }, 0xffffff); // «ПРОДУКТЫ»
}); };
const waterTowerT = function() { return template('wtower', function(b) {
    cyl(b, 0, -0.5, 0, 0.9, 0.8, 6, 8, R('brick'), 0xffffff);
    cyl(b, 0, 5.5, 0, 1.5, 1.5, 1.8, 10, R('iron'), 0x8aa0a8);
    cyl(b, 0, 7.3, 0, 1.6, 0, 0.9, 10, R('iron'), 0x6a8a90);
}); };
const poleT = function() { return template('pole', function(b) {
    box(b, 0, 0, 0, 0.16, 4.2, 0.16, null, 0x5a4028);
    box(b, 0, 3.8, 0, 1.2, 0.1, 0.1, null, 0x5a4028);
    [-0.5, 0, 0.5].forEach(function(x) { box(b, x, 3.9, 0, 0.06, 0.12, 0.06, null, 0xdddddd); });
}); };
const bedsT = function() { return template('beds', function(b) { box(b, 0, -0.05, 0, 5, 0.18, 6, { py: R('beds'), all: R('beds') }, 0xffffff); }); };
const tractorT = function() { return template('tractor', function(b) {
    box(b, 0, 0.45, 0.3, 0.8, 0.5, 1.4, null, 0x2a5aa8); box(b, 0, 0.45, -0.6, 0.85, 1.0, 0.8, null, 0x2a5aa8);
    box(b, 0, 1.0, -0.6, 0.8, 0.5, 0.75, null, 0x2a3848);
    box(b, 0.5, 0, -0.6, 0.2, 1.0, 1.0, null, 0x151515); box(b, -0.5, 0, -0.6, 0.2, 1.0, 1.0, null, 0x151515);
    box(b, 0.45, 0, 0.6, 0.15, 0.55, 0.55, null, 0x151515); box(b, -0.45, 0, 0.6, 0.15, 0.55, 0.55, null, 0x151515);
}); };
const chimneyT = function() { return template('chimney', function(b) { cyl(b, 0, -0.5, 0, 1.0, 0.6, 17, 10, R('stripes'), 0xffffff); }); };
const gasT = function() { return template('gas', function(b) { cyl(b, 0, -0.5, 0, 3.2, 3.2, 4.6, 14, R('iron'), 0x8a9a8a, true); box(b, 3.25, 0, 0, 0.3, 4.1, 0.3, null, 0x777777); }); };
const craneT = function() { return template('crane', function(b) {
    box(b, 0, -0.5, 0, 1.2, 0.6, 1.2, null, 0x777777);
    box(b, 0, 0, 0, 0.55, 13, 0.55, null, 0xe8b820);
    box(b, 0, 13, -1.5, 0.45, 0.45, 12, null, 0xe8b820);
    box(b, 0, 12.4, 4.0, 0.9, 0.7, 1.2, null, 0x777777);
    box(b, 0, 13, 0, 0.8, 0.9, 0.8, null, 0x2a5a8a);
    box(b, 0, 8, -6.5, 0.04, 5, 0.04, null, 0x222222);
}); };
const tankT = function() { return template('tank', function(b) {
    box(b, 0, 0, 0, 1.0, 0.3, 4.4, null, 0x2a2a2a);
    cyl(b, 0, 0.3, 0, 0.6, 0.6, 1.2, 10, R('iron'), 0x2a2a2a, true); // цистерна (стоймя — как газгольдер-«бочка»)
    box(b, 0, 0.3, 0, 1.15, 1.15, 3.6, null, 0x2e2e2e);
}); };
const reedT = function() { return template('reed', function(b) { for (let i = 0; i < 7; i++) box(b, Math.sin(i * 2.1) * 0.4, -0.1, Math.cos(i * 1.7) * 0.4, 0.04, 0.9 + (i % 3) * 0.2, 0.04, null, 0x6a8a3a); }); };
const boatT = function() { return template('boat', function(b) { box(b, 0, 0, 0, 0.7, 0.3, 1.9, null, 0x3a6a8a); box(b, 0, 0.3, 0, 0.6, 0.05, 1.7, null, 0x7a5a3a); }); };
const stumpT = function() { return template('stump', function(b) { cyl(b, 0, 0, 0, 0.3, 0.26, 0.4, 7, null, 0x6a4a2a, true); }); };
const mushT = function() { return template('mush', function(b) { cyl(b, 0, 0, 0, 0.05, 0.05, 0.18, 5, null, 0xf0eadc); cyl(b, 0, 0.18, 0, 0.18, 0, 0.12, 7, null, 0xd82a1a); }); };
const benchT = function() { return template('bench', function(b) { box(b, 0, 0.3, 0, 0.4, 0.06, 1.6, null, 0x7a5a3a); box(b, -0.18, 0.36, 0, 0.06, 0.4, 1.6, null, 0x7a5a3a); box(b, 0, 0, 0.7, 0.3, 0.3, 0.06, null, 0x444444); box(b, 0, 0, -0.7, 0.3, 0.3, 0.06, null, 0x444444); }); };

// ---- окраины, промзона, свалка, тайга, джунгли: середина обочин не пустует ----
const palmT = function() { return template('palm', function(b) {
    for (let i = 0; i < 5; i++) cyl(b, Math.sin(i * 0.5) * 0.12 * i, i * 0.6, 0, 0.13 - i * 0.012, 0.12 - i * 0.012, 0.62, 6, null, 0x7a5a32);
    for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; box(b, Math.cos(a) * 0.75 + 0.48, 2.83, Math.sin(a) * 0.75, Math.abs(Math.cos(a)) * 1.2 + 0.25, 0.06, Math.abs(Math.sin(a)) * 1.2 + 0.25, null, 0x2f7a2a); }
}); };
const bushT = function(col) { return template('bush_' + col, function(b) { cyl(b, 0, -0.1, 0, 0.6, 0.7, 0.5, 7, null, col); cyl(b, 0, 0.4, 0, 0.7, 0, 0.5, 7, null, col); }); };
const snowPineT = function() { return template('snowpine', function(b) {
    cyl(b, 0, 0, 0, 0.12, 0.08, 1.4, 6, null, 0x6a3a1c);
    [0, 1, 2, 3].forEach(function(i) { cyl(b, 0, 1.0 + i * 0.5, 0, 0.85 - i * 0.16, 0, 0.95 - i * 0.1, 7, null, 0x2a5030); cyl(b, 0, 1.38 + i * 0.5, 0, 0.42 - i * 0.08, 0, 0.55 - i * 0.06, 7, null, 0xf2f6fa); });
}); };
/* ---- тайга: брёвна, лесовоз, рыбаки; зоопарк: вольеры, жирафы, фламинго, валуны ---- */
const logPileT = function() { return template('logpile', function(b) {
    for (let l = 0; l < 3; l++) for (let k = 0; k < 4 - l; k++) { const zz = -0.6 + k * 0.42 + l * 0.21, yy = 0.22 + l * 0.38; box(b, 0, yy, zz, 3.2, 0.36, 0.36, null, [0x8a6a42, 0x7a5a36][(k + l) % 2]); box(b, 1.61, yy, zz, 0.02, 0.26, 0.26, null, 0xc8a878); box(b, -1.61, yy, zz, 0.02, 0.26, 0.26, null, 0xc8a878); } // брёвна и светлые торцы
    box(b, -1.5, 0.3, 0, 0.12, 0.6, 1.8, null, 0x5a4026); box(b, 1.5, 0.3, 0, 0.12, 0.6, 1.8, null, 0x5a4026);
}); };
const lesovozT = function() { return template('lesovoz', function(b) {
    box(b, 0, 0.75, -1.6, 1.0, 0.9, 1.0, null, 0x3a6a8a); box(b, 0, 0.95, -1.95, 0.9, 0.4, 0.06, null, 0x1c2a36); // кабина и стекло
    box(b, 0, 0.35, 0.3, 0.9, 0.2, 3.6, null, 0x2a2a2a); // рама
    for (let k = 0; k < 6; k++) box(b, -0.3 + (k % 3) * 0.3, 0.62 + Math.floor(k / 3) * 0.28, 0.6, 0.27, 0.27, 3.0, null, [0x8a6a42, 0x7a5a36][k % 2]);
    [-0.9, 0.8].forEach(function(z) { box(b, -0.5, 0.75, z, 0.06, 0.9, 0.06, null, 0x2a2a2a); box(b, 0.5, 0.75, z, 0.06, 0.9, 0.06, null, 0x2a2a2a); }); // стойки
    [-1.6, 0.0, 1.4].forEach(function(z) { box(b, -0.5, 0.3, z, 0.22, 0.6, 0.6, null, 0x161616); box(b, 0.5, 0.3, z, 0.22, 0.6, 0.6, null, 0x161616); }); // колёса
}); };
const fisherT = function() { return template('fisher', function(b) {
    box(b, 0, 0.18, 0, 0.35, 0.3, 0.3, null, 0x3a6a8a);                       // ящик-сиденье
    cyl(b, 0, 0.35, 0, 0.2, 0.24, 0.55, 7, null, [0x5a4a3a, 0x3a4a3a][0]);     // тулуп
    cyl(b, 0, 0.98, 0, 0.11, 0.11, 0.2, 8, null, 0xe8b898, true);             // голова
    cyl(b, 0, 1.12, 0, 0.13, 0.12, 0.1, 8, null, 0x7a2a2a, true);             // шапка
    box(b, 0.25, 0.62, -0.32, 0.02, 0.02, 0.6, null, 0x2a2a2a);              // удочка
    cyl(b, 0.3, 0.02, -0.62, 0.14, 0.14, 0.02, 10, null, 0x1a2a3a, true);     // лунка
}); };
const zooFenceT = function() { return template('zoofence', function(b) {
    for (let k = 0; k <= 10; k++) box(b, 0, 0.75, -3 + k * 0.6, 0.06, 1.5, 0.06, null, 0x3a3a40); // прутья
    box(b, 0, 1.52, 0, 0.1, 0.08, 6.1, null, 0x3a3a40); box(b, 0, 0.1, 0, 0.12, 0.2, 6.1, null, 0x5a5a5a);
}); };
const zooSignT = function(col) { return template('zoosign_' + col, function(b) {
    box(b, 0, 0.7, -0.7, 0.08, 1.4, 0.08, null, 0x5a4026); box(b, 0, 0.7, 0.7, 0.08, 1.4, 0.08, null, 0x5a4026);
    box(b, 0, 1.45, 0, 0.06, 0.55, 1.7, null, col); box(b, 0.035, 1.45, 0, 0.01, 0.12, 1.2, null, 0xf4f0e4);
}); };
const giraffeT = function() { return template('giraffe', function(b) {
    box(b, 0, 1.55, 0, 0.5, 0.55, 1.2, null, 0xd8a840);                        // туловище
    [[-0.18, -0.45], [0.18, -0.45], [-0.18, 0.45], [0.18, 0.45]].forEach(function(p) { box(b, p[0], 0.65, p[1], 0.1, 1.3, 0.1, null, 0xc89838); });
    box(b, 0, 2.55, -0.5, 0.18, 1.6, 0.2, null, 0xd8a840);                      // шея
    box(b, 0, 3.35, -0.62, 0.22, 0.25, 0.45, null, 0xd8a840);                   // голова
    box(b, 0.26, 1.6, -0.2, 0.02, 0.2, 0.25, null, 0x8a5a20); box(b, -0.26, 1.5, 0.25, 0.02, 0.25, 0.2, null, 0x8a5a20); // пятна
}); };
const flamingoT = function() { return template('flamingo', function(b) {
    box(b, 0, 0.45, 0, 0.03, 0.9, 0.03, null, 0xe86a8a);                       // нога
    box(b, 0, 1.0, 0, 0.22, 0.25, 0.42, null, 0xf08aa8);                        // тело
    box(b, 0, 1.35, -0.2, 0.05, 0.5, 0.05, null, 0xf08aa8);                     // шея
    box(b, 0, 1.6, -0.26, 0.09, 0.09, 0.16, null, 0xf08aa8); box(b, 0, 1.58, -0.37, 0.04, 0.04, 0.08, null, 0x2a2a2a);
}); };
const boulderT = function() { return template('boulder', function(b) { cyl(b, 0, -0.1, 0, 0.9, 1.2, 1.1, 7, null, 0x7a7468, true); cyl(b, 0.5, -0.1, 0.4, 0.5, 0.7, 0.7, 6, null, 0x8a8478, true); }); };
const barrelT = function() { return template('barrel', function(b) { cyl(b, 0, 0, 0, 0.32, 0.32, 0.85, 10, null, 0x6a3a1e, true); cyl(b, 0, 0.3, 0, 0.335, 0.335, 0.06, 10, null, 0x4a2a14); cyl(b, 0, 0.82, 0, 0.26, 0.05, 0.22, 7, null, 0xff8a1a); }); };
const driftT = function() { return template('drift', function(b) { cyl(b, 0, -0.3, 0, 1.6, 0.5, 0.75, 9, null, 0xf4f7fb, true); }); };
const junkHillT = function(col) { return template('junkhill_' + col, function(b) {
    cyl(b, 0, -0.3, 0, 4.2, 0.6, 3.2, 9, null, col, true);
    for (let i = 0; i < 9; i++) { const a = i * 2.4, rr = 1.2 + (i % 3) * 0.9; box(b, Math.cos(a) * rr, 3.2 - rr * 0.75 - 0.3, Math.sin(a) * rr, 0.9, 0.5, 1.6, null, [0x8a3a2a, 0x3a5a7a, 0x6a6a5a, 0xa8882a][i % 4]); }
}); };
const wreckStackT = function() { return template('wreckstack', function(b) {
    [0x8a4a2a, 0x4a5a6a, 0x7a6a3a, 0x5a3a3a].forEach(function(c, i) { box(b, (i % 2) * 0.15 - 0.07, i * 0.5, (i % 3) * 0.1, 1.0, 0.5, 2.0, null, c); });
}); };
const containerT = function(col) { return template('cont_' + col, function(b) { box(b, 0, 0, 0, 1.25, 1.3, 3.0, { all: R('iron') }, col); }); };
const warehouseT = function() { return template('warehouse', function(b) {
    box(b, 0, -0.8, 0, 6.2, 0.8, 12.2, { all: R('side'), noTop: true }, 0x9a958a);
    box(b, 0, 0, 0, 6, 3.2, 12, { px: R('garage'), nx: R('side'), pz: R('side'), nz: R('side'), py: R('roof') }, 0xd8d4c8);
    gable(b, 0, 3.2, 0, 6.4, 12.4, 1.2, R('iron'), 0x7a8a7a, R('side'), 0xc8c4b8);
}); };
const pipeRackT = function() { return template('piperack', function(b) {
    [-5, 0, 5].forEach(function(z) { box(b, 0, 0, z, 0.25, 3.0, 0.25, null, 0x6a6a6a); box(b, 0, 2.9, z, 1.4, 0.15, 0.2, null, 0x6a6a6a); });
    box(b, -0.35, 3.05, 0, 0.35, 0.35, 11, { all: R('iron') }, 0x9aa0a0); box(b, 0.35, 3.05, 0, 0.3, 0.3, 11, { all: R('iron') }, 0xb87a3a);
}); };
const transformerT = function() { return template('trafo', function(b) { box(b, 0, 0, 0, 1.6, 1.8, 2.2, { all: R('side'), py: R('roof') }, 0xc8c4b8); box(b, 0.82, 0.9, 0, 0.04, 0.5, 0.5, null, 0xf2d23a); }); };

/** Столбы с проводами вдоль одной стороны участка */
function powerLine(o, side, x) {
    const zs = [];
    for (let z = o.z0 - 6; z > o.z0 - o.len; z -= 18) zs.push(z);
    zs.forEach(function(z) { place(o.b, poleT(), side * x, o.groundAt(side * x, z, 0.3, 0.3), z, 0); }); // перекладина — поперёк дороги, провода — вдоль
    for (let i = 0; i + 1 < zs.length; i++) {
        const zc = (zs[i] + zs[i + 1]) / 2, y = o.groundAt(side * x, zc, 0.3, 18) + 3.88;
        [-0.5, 0, 0.5].forEach(function(dz) { box(o.b, side * x + dz, y, zc, 0.025, 0.025, 18, null, 0x222222); });
    }
}

// ---------------- раскладка ----------------
/**
 * Заполнить полосу вдоль дороги: side (−1/+1), x от края дороги [x0, x1], на участке z0 → z0 − len.
 * pick() → { t, span (длина вдоль z), depth (поперёк), y?, tint?, s? } | null (пропуск span). gap — промежуток.
 */
function fillBand(o, side, x0, x1, pick, gap) {
    let z = o.z0 - (o.r() * 4);
    const zEnd = o.z0 - o.len;
    while (z > zEnd) {
        const it = pick();
        if (!it) { z -= 6 + o.r() * 6; continue; }
        const span = it.span || 2, depth = it.depth || 2;
        const zc = z - span / 2;
        if (zc - span / 2 < zEnd - 2) break;
        const x = side * (x0 + depth / 2 + o.r() * Math.max(0, x1 - x0 - depth));
        const y = it.y != null ? it.y : o.groundAt(x, zc, depth, span);
        place(o.b, it.t, x, y, zc, side < 0 ? (it.rot || 0) : (it.rot || 0) + 2, it.s, it.tint);
        if (it.smoke && o.smoke && !keptOut(x, zc)) o.smoke.push({ x: x, y: y + it.smoke * (it.s || 1), z: zc, size: 1.6, dark: !!it.dark }); // дым из трубы (src/smoke.js)
        z -= span + (gap != null ? gap : 1) + o.r() * (it.gapR || 2);
    }
}
function scatter(o, n, xMin, xMax, mk) {
    for (let i = 0; i < n; i++) {
        const side = o.r() < 0.5 ? -1 : 1, x = side * (xMin + o.r() * (xMax - xMin)), z = o.z0 - o.r() * o.len;
        const it = mk();
        if (it) place(o.b, it.t, x, o.groundAt(x, z, 1, 1), z, Math.floor(o.r() * 4), it.s || (0.8 + o.r() * 0.5), it.tint);
    }
}
const pickW = function(r, list) { let s = 0; list.forEach(function(e) { s += e[0]; }); let q = r() * s; for (let i = 0; i < list.length; i++) { q -= list[i][0]; if (q <= 0) return list[i][1](); } return list[list.length - 1][1](); };
const CAR_COLS = [0xc8382a, 0xe8e0c8, 0x3a6aa8, 0x2a7a4a, 0xd8a020, 0x6a3a8a, 0x8a8a8a];
const IZBA_ROOFS = [[0x3a7a4a, 'iron'], [0x9a3a2a, 'iron'], [0xffffff, 'slate'], [0x3a5a8a, 'iron'], [0xffffff, 'slate']];
const IZBA_WALLS = [0xffffff, 0xffffff, 0xb8d0a0, 0xa8c0d8, 0xe8d0a0];

function cityStretch(o, W) {
    const r = o.r, lite = o.lite;
    [-1, 1].forEach(function(side) {
        // у обочины: фонари, киоски, остановка, скамейки, деревья, припаркованные машины
        fillBand(o, side, W / 2 + 1.8, W / 2 + 4.2, function() {
            return pickW(r, [[3, function() { return { t: lampT(), span: 0.4, depth: 0.4 }; }],
                [1.4, function() { return { t: kiosk(Math.floor(r() * 4)), span: 1.4, depth: 1.3 }; }],
                [0.8, function() { return { t: busStopT(false), span: 3.6, depth: 1.8 }; }],
                [1.4, function() { return { t: benchT(), span: 1.8, depth: 0.5 }; }],
                [2.4, function() { return { t: roundTreeT([0x4a7a2e, 0x5a8a34, 0x3e6e2a][Math.floor(r() * 3)]), span: 1.8, depth: 1.8, s: 0.8 + r() * 0.4 }; }],
                [1.6, function() { return { t: carT(CAR_COLS[Math.floor(r() * CAR_COLS.length)]), span: 2.2, depth: 1.0 }; }]]);
        }, 1.2);
        // магазины и гаражи
        fillBand(o, side, W / 2 + 6, W / 2 + 11, function() {
            return pickW(r, [[3, function() { return { t: shopPavilion(Math.floor(r() * 8)), span: 7.4, depth: 4.2 }; }],
                [1.2, function() { return { t: garagesT(), span: 6.6, depth: 3.1 }; }],
                [1, function() { return { t: bigPublic(r() < 0.5 ? 'school' : 'dk'), span: 9.4, depth: 5.2 }; }],
                [1.3, function() { return null; }]]);
        }, 2);
        // дома микрорайона
        fillBand(o, side, W / 2 + 14, W / 2 + 22, function() {
            return pickW(r, [[2.4, function() { const n = 2 + Math.floor(r() * 3); return { t: house(r() < 0.5 ? 'k5' : 'k5b', 5, n), span: 4.2 * n, depth: 3.6 }; }],
                [1.6, function() { const n = 2 + Math.floor(r() * 2); return { t: house(r() < 0.5 ? 'p9' : 'p9b', 9, n), span: 4.2 * n, depth: 4.2 }; }],
                [0.8, function() { return { t: house('brick5', 5, 2), span: 8.4, depth: 3.6 }; }],
                [0.6, function() { return { t: house('stalin', 5, 3), span: 12.6, depth: 3.6 }; }]]);
        }, 3);
        if (!lite) fillBand(o, side, W / 2 + 28, W / 2 + 40, function() {
            return pickW(r, [[2, function() { return { t: tower(Math.floor(r() * 4)), span: 4.6, depth: 4.6 }; }],
                [2, function() { const n = 3 + Math.floor(r() * 2); return { t: house(r() < 0.5 ? 'p9' : 'p9b', 9, n), span: 4.2 * n, depth: 4.2 }; }]]);
        }, 5);
    });
    // дворы: деревья между домами
    scatter(o, lite ? 6 : 12, W / 2 + 11, W / 2 + 28, function() { return { t: r() < 0.6 ? roundTreeT(0x4a7a2e) : birchT() }; });
}

function villageStretch(o, W) {
    const r = o.r, lite = o.lite;
    [-1, 1].forEach(function(side) {
        // у дороги: столбы, остановка, колодец, лавочки, деревья
        fillBand(o, side, W / 2 + 1.8, W / 2 + 4, function() {
            return pickW(r, [
                [0.5, function() { return { t: busStopT(true), span: 3.6, depth: 1.8 }; }],
                [1, function() { return { t: wellT(), span: 1.4, depth: 1.2 }; }],
                [1.2, function() { return { t: benchT(), span: 1.8, depth: 0.5 }; }],
                [2.2, function() { return { t: r() < 0.5 ? birchT() : roundTreeT(0x5a8a30), span: 1.8, depth: 1.8, s: 0.85 + r() * 0.4 }; }]]);
        }, 2.5);
        // избы за штакетником
        let z = o.z0 - r() * 3;
        const zEnd = o.z0 - o.len;
        while (z > zEnd + 6) {
            const q = r();
            const xFence = side * (W / 2 + 5.2);
            if (q < 0.62) { // дом с палисадником
                const span = 6.5, zc = z - span / 2;
                const roof = IZBA_ROOFS[Math.floor(r() * IZBA_ROOFS.length)];
                const x = side * (W / 2 + 8.4);
                place(o.b, izbaT(roof[0], roof[1], IZBA_WALLS[Math.floor(r() * IZBA_WALLS.length)]), x, o.groundAt(x, zc, 4, 4), zc, side < 0 ? 0 : 2);
                fence(o, xFence, zc + span / 2, span, [0x3a7a4a, 0x3a6aa8, 0xb8a888, 0xe8e0d0][Math.floor(r() * 4)]);
                if (r() < 0.6) { const xs = side * (W / 2 + 13 + r() * 2); place(o.b, shedT(), xs, o.groundAt(xs, zc, 2, 2), zc + (r() - 0.5) * 2, side < 0 ? 0 : 2); }
                if (r() < 0.7) { const xb = side * (W / 2 + 17 + r() * 3); place(o.b, bedsT(), xb, o.groundAt(xb, zc, 5, 6), zc, 0); }
                z -= span + 1 + r() * 2;
            } else if (q < 0.74) { // сельпо
                const span = 6.6, zc = z - span / 2, x = side * (W / 2 + 7.6);
                place(o.b, selpoT(), x, o.groundAt(x, zc, 4, 6), zc, side < 0 ? 0 : 2);
                z -= span + 2;
            } else if (q < 0.86) { // стога
                for (let k = 0; k < 3; k++) { const x = side * (W / 2 + 8 + r() * 10), zz = z - k * 2.6; place(o.b, hayT(), x, o.groundAt(x, zz, 2, 2), zz, 0, 0.8 + r() * 0.4); }
                z -= 9;
            } else if (q < 0.93) { // водонапорная башня или трактор
                const x = side * (W / 2 + 9 + r() * 6), zc = z - 2;
                place(o.b, r() < 0.5 ? waterTowerT() : tractorT(), x, o.groundAt(x, zc, 2, 2), zc, side < 0 ? 0 : 2);
                z -= 6;
            } else z -= 5;
        }
    });
    powerLine(o, o.i % 2 ? 1 : -1, W / 2 + 1.4);
    // вдали — берёзовые рощи и сады
    scatter(o, lite ? 8 : 18, W / 2 + 20, W / 2 + 46, function() { return { t: r() < 0.55 ? birchT() : roundTreeT(0x4f8a2e), s: 0.9 + r() * 0.6 }; });
}
function fence(o, x, zTop, len, col) {
    const n = Math.floor(len / 0.24);
    for (let i = 0; i < n; i++) { const z = zTop - 0.12 - i * 0.24; box(o.b, x, o.groundAt(x, z, 0.2, 0.2) - 0.1, z, 0.05, 1.0, 0.12, null, col); }
    box(o.b, x, o.groundAt(x, zTop - len / 2, 0.2, len) + 0.3, zTop - len / 2, 0.04, 0.07, len, null, col);
    box(o.b, x, o.groundAt(x, zTop - len / 2, 0.2, len) + 0.7, zTop - len / 2, 0.04, 0.07, len, null, col);
}

/** Озеро: вода (свой материал), берег, камыш, лодка; snow — замёрзшее */
function lake(o, side, snow) {
    const r = o.r;
    const x = side * (o.W / 2 + 13 + r() * 12), z = o.z0 - 15 - r() * 30, rad = 5 + r() * 5;
    const y = Math.min(o.groundAt(x, z, rad, rad), 0.4);
    cyl(o.b, x, y - 0.3, z, rad + 1.4, rad + 0.6, 0.36, 18, null, snow ? 0xf2f4f8 : 0xc8b888, true); // берег
    cyl(o.wb, x, y + 0.04, z, rad, rad, 0.02, 20, null, 0xffffff, true);
    if (snow) { cyl(o.b, x, y + 0.08, z, rad * 0.98, rad * 0.98, 0.01, 20, null, 0xd8eaf6, true); // лёд
        for (let k = 0; k < 2 + Math.floor(r() * 3); k++) { const a = r() * Math.PI * 2, d = r() * rad * 0.6; place(o.b, fisherT(), x + Math.cos(a) * d, y + 0.09, z + Math.sin(a) * d, Math.floor(r() * 4)); } // рыбаки у лунок
    }
    else {
        for (let i = 0; i < 6; i++) { const a = r() * Math.PI * 2; place(o.b, reedT(), x + Math.cos(a) * rad * 0.92, y, z + Math.sin(a) * rad * 0.92, 0, 0.8 + r() * 0.5); }
        if (r() < 0.5) place(o.b, boatT(), x + side * -rad * 0.4, y + 0.05, z, 1);
    }
}
/** Река поперёк дороги и мост (перила) */
function river(o, snow) {
    const z = o.z0 - o.len / 2, Wv = 9, W = o.W;
    [-1, 1].forEach(function(side) {
        const xc = side * (W / 2 + 1.0 + 30);
        box(o.b, xc, -0.3, z, 60, 0.32, Wv + 2.6, { all: { u0: 0, v0: 0, u1: 0, v1: 0 } }, snow ? 0xf2f4f8 : 0x9a8a62);
        box(o.wb, xc, 0.03, z, 60, 0.01, Wv, null, 0xffffff);
        if (snow) box(o.b, xc, 0.05, z, 60, 0.01, Wv * 0.98, null, 0xd8eaf6);
        // перила моста у края дороги
        const xr = side * (W / 2 + 0.35);
        box(o.b, xr, 0, z, 0.25, 0.55, Wv + 4, null, 0xc8c4b8);
        for (let k = -2; k <= 2; k++) box(o.b, xr, 0.55, z + k * (Wv + 4) / 4.4, 0.12, 0.35, 0.12, null, 0x8a8a8a);
        box(o.b, xr, 0.9, z, 0.1, 0.08, Wv + 4, null, 0x3a6aa8);
    });
}

function junkStretch(o, W) {
    const r = o.r;
    [-1, 1].forEach(function(side) {
        fillBand(o, side, W / 2 + 5, W / 2 + 14, function() {
            return pickW(r, [[1.5, function() { return { t: wreckStackT(), span: 2.4, depth: 1.4 }; }],
                [1.4, function() { return { t: containerT([0x2a5a8a, 0x8a3a2a, 0x6a6a5a, 0xa8882a][Math.floor(r() * 4)]), span: 3.2, depth: 1.3 }; }],
                [0.8, function() { return { t: shedT(), span: 2.4, depth: 2.4 }; }], [1, function() { return null; }]]);
        }, 1.5);
        fillBand(o, side, W / 2 + 16, W / 2 + 34, function() {
            return pickW(r, [[2, function() { return { t: junkHillT([0x6a5a3a, 0x5a4a32, 0x7a6a4a][Math.floor(r() * 3)]), span: 8.6, depth: 8.6, s: 0.8 + r() * 0.5 }; }], [0.6, function() { return null; }]]);
        }, 2);
        if (r() < 0.45) { const x = side * (W / 2 + 3.4 + r() * 1.2), z = o.z0 - 5 - r() * (o.len - 10); if (!keptOut(x, z)) { place(o.b, barrelT(), x, o.groundAt(x, z, 0.7, 0.7), z, 0); if (o.smoke) o.smoke.push({ x: x, y: o.groundAt(x, z, 0.7, 0.7) + 1.0, z: z, size: 0.7, dark: true }); } } // горящая бочка: огонь и чёрный дым
        if (r() < 0.5) { const x = side * (W / 2 + 15), from = o.z0 - r() * 20; for (let i = 0; i < 4 + Math.floor(r() * 4); i++) { const z = from - 2 - i * 4; place(o.b, po2T(), x, o.groundAt(x, z, 0.2, 4), z, 0); } }
    });
}

function forestStretch(o, W, snow) {
    const r = o.r, n = o.noTrees ? 0 : o.lite ? 52 : 90; // кампания: лес уже стоит инстансами (src/biomes.js) — второй лес не нужен; на телефоне тоже густо
    for (let i = 0; i < n; i++) {
        const side = r() < 0.5 ? -1 : 1, x = side * (W / 2 + 3.2 + Math.pow(r(), 1.7) * 38), z = o.z0 - r() * o.len; // гуще у дороги — виден сквозь туман
        const q = r();
        const t = o.jungle ? (q < 0.45 ? palmT() : roundTreeT([0x1e5a24, 0x2a6a2a, 0x245a1e][Math.floor(r() * 3)])) : snow ? (q < 0.8 ? snowPineT() : birchT()) : (q < 0.62 ? pineT() : birchT());
        place(o.b, t, x, o.groundAt(x, z, 1, 1), z, Math.floor(r() * 4), (o.jungle ? 1.1 : 0.8) + r() * 0.8);
    }
    scatter(o, o.lite ? 6 : 14, W / 2 + 2.4, W / 2 + 9, function() { return snow ? { t: driftT(), s: 0.6 + r() * 0.8 } : { t: bushT(o.jungle ? 0x1e6a2a : [0x3a6a2a, 0x4a7a30][Math.floor(r() * 2)]), s: 0.6 + r() * 0.7 }; });
    scatter(o, o.lite ? 4 : 8, W / 2 + 2.5, W / 2 + 12, function() { return r() < 0.5 ? { t: stumpT() } : { t: mushT(), s: 1 + r() }; });
    if (o.i % 4 === 1) lake(o, r() < 0.5 ? -1 : 1, snow);
    if (snow) taigaExtras(o, W); else if (o.jungle) zooExtras(o, W);
}

/** Тайга: штабели брёвен у обочины, изредка — лесовоз на стоянке */
function taigaExtras(o, W) {
    const r = o.r;
    if (o.i % 3 === 0) { const side = r() < 0.5 ? -1 : 1, x = side * (W / 2 + 4 + r() * 2), z = o.z0 - 10 - r() * 40; place(o.b, logPileT(), x, o.groundAt(x, z, 3, 2), z, 0); }
    if (o.i % 5 === 2) { const side = r() < 0.5 ? -1 : 1, x = side * (W / 2 + 4.2), z = o.z0 - 15 - r() * 30; place(o.b, lesovozT(), x, o.groundAt(x, z, 1.2, 4), z, 0); }
}
/** Зоопарк: вольеры с решёткой и табличкой вдоль дороги, за ними жирафы или фламинго, валуны */
function zooExtras(o, W) {
    const r = o.r;
    [-1, 1].forEach(function(side) {
        if (r() < 0.35) return;
        const xF = side * (W / 2 + 5.5), zs = o.z0 - 6 - r() * 10, n = 3 + Math.floor(r() * 3);
        for (let k = 0; k < n; k++) { const z = zs - 3 - k * 6.1; place(o.b, zooFenceT(), xF, o.groundAt(xF, z, 0.2, 6), z, 0); }
        const kind = r(), zc = zs - n * 3;
        place(o.b, zooSignT([0x2a7a3a, 0x3a5aa8, 0xc8642a][Math.floor(r() * 3)]), side * (W / 2 + 4.6), o.groundAt(side * (W / 2 + 4.6), zs, 0.2, 2), zs, 0);
        for (let k = 0; k < (kind < 0.5 ? 2 : 5); k++) {
            const x = side * (W / 2 + 8.5 + r() * 5), z = zs - 4 - r() * (n * 6.1 - 8);
            place(o.b, kind < 0.5 ? giraffeT() : flamingoT(), x, o.groundAt(x, z, 1, 1), z, Math.floor(r() * 4), 0.9 + r() * 0.3);
        }
        const xb = side * (W / 2 + 10 + r() * 4), zb = zc + (r() - 0.5) * 8; place(o.b, boulderT(), xb, o.groundAt(xb, zb, 2, 2), zb, Math.floor(r() * 4), 0.8 + r() * 0.6);
    });
}

/** Окраина города (день, ночь, дождь): дальний ряд пятиэтажек, гаражи, киоски, остановки, столбы с проводами */
function townStretch(o, W) {
    const r = o.r;
    [-1, 1].forEach(function(side) {
        if (r() < 0.9) fillBand(o, side, W / 2 + 14, W / 2 + 22, function() { // пятиэтажки — сразу за частным сектором, а не у горизонта
            return pickW(r, [[2, function() { const n = 2 + Math.floor(r() * 3); return { t: house(['k5', 'k5b', 'brick5'][Math.floor(r() * 3)], 5, n), span: 4.2 * n, depth: 3.6 }; }],
                [1, function() { return { t: house('p9', 9, 2), span: 8.4, depth: 4.2 }; }], [1.2, function() { return null; }]]);
        }, 4);
    });
    [-1, 1].forEach(function(side) { // середина: гаражи, частный сектор, сараи, трансформаторы, деревья
        fillBand(o, side, W / 2 + 4.5, W / 2 + 11, function() { // частный сектор, гаражи, сараи — вплотную к обочине
            return pickW(r, [[1.4, function() { return { t: garagesT(), span: 6.6, depth: 3.1 }; }],
                [1.4, function() { const roof = IZBA_ROOFS[Math.floor(r() * IZBA_ROOFS.length)]; return { t: izbaT(roof[0], roof[1], IZBA_WALLS[Math.floor(r() * IZBA_WALLS.length)]), span: 4.2, depth: 4.2 }; }],
                [1, function() { return { t: shedT(), span: 2.4, depth: 2.4 }; }],
                [0.6, function() { return { t: transformerT(), span: 2.4, depth: 1.8 }; }],
                [2, function() { return { t: r() < 0.5 ? roundTreeT(0x4f7f2e) : birchT(), span: 2, depth: 2, s: 0.9 + r() * 0.4 }; }],
                [1, function() { return null; }]]);
        }, 2);
    });
    if (o.i % 2 === 0) powerLine(o, o.i % 4 === 0 ? -1 : 1, W / 2 + 2.6);
    if (r() < 0.35) { const side = r() < 0.5 ? -1 : 1, x = side * (W / 2 + 2.8), zc = o.z0 - r() * o.len; place(o.b, r() < 0.5 ? busStopT(false) : kiosk(Math.floor(r() * 4)), x, o.groundAt(x, zc, 2, 3), zc, side < 0 ? 0 : 2); }
}

function industrialStretch(o, W) {
    const r = o.r;
    [-1, 1].forEach(function(side) {
        fillBand(o, side, W / 2 + 22, W / 2 + 40, function() {
            return pickW(r, [[1.2, function() { return { t: chimneyT(), span: 2.4, depth: 2.4, smoke: 16.4 }; }], [1.2, function() { return { t: gasT(), span: 6.6, depth: 6.6 }; }],
                [0.9, function() { return { t: craneT(), span: 3, depth: 3 }; }], [1.5, function() { return null; }]]);
        }, 6);
        fillBand(o, side, W / 2 + 6, W / 2 + 16, function() { // середина: склады, эстакады труб, контейнеры, трансформаторы
            return pickW(r, [[1.3, function() { return { t: warehouseT(), span: 12.4, depth: 6.2 }; }], [1.2, function() { return { t: pipeRackT(), span: 11, depth: 1.6 }; }],
                [1.2, function() { return { t: containerT([0x2a5a8a, 0x8a3a2a, 0x3a7a4a, 0xa8882a][Math.floor(r() * 4)]), span: 3.2, depth: 1.3 }; }],
                [0.7, function() { return { t: transformerT(), span: 2.4, depth: 1.8 }; }], [0.8, function() { return null; }]]);
        }, 2);
        if (r() < 0.6) { // бетонный забор вдоль дороги
            const x = side * (W / 2 + 19), from = o.z0 - r() * 20, k = 3 + Math.floor(r() * 5);
            for (let i = 0; i < k; i++) { const z = from - 2 - i * 4; place(o.b, po2T(), x, o.groundAt(x, z, 0.2, 4), z, 0); }
        }
    });
    if (o.i % 3 === 0) { // цистерны на путях
        const side = r() < 0.5 ? -1 : 1, x = side * (W / 2 + 16);
        box(o.b, x - 0.5, o.groundAt(x, o.z0 - 30, 1, 60) - 0.05, o.z0 - 30, 0.1, 0.12, 60, null, 0x555555);
        box(o.b, x + 0.5, o.groundAt(x, o.z0 - 30, 1, 60) - 0.05, o.z0 - 30, 0.1, 0.12, 60, null, 0x555555);
        for (let i = 0; i < 4; i++) { const z = o.z0 - 8 - i * 5; place(o.b, tankT(), x, o.groundAt(x, z, 1, 4) + 0.1, z, 0); }
    }
}

/**
 * Насытить участок: o — { style, snow, night, i, z0, len, W, lite, rnd, heightAt(x, z) }.
 * Возвращает [меш набора, меш воды] (null — пусто) и что сделано (для тестов и отладки).
 */
export function buildScenery(o) {
    const st = { smoke: [], b: createBatch(), wb: createBatch(), r: o.rnd || Math.random, z0: o.z0, len: o.len, W: o.W, i: o.i, lite: !!o.lite, jungle: !!o.jungle, noTrees: !!o.noTrees };
    st.groundAt = function(x, z, w, d) {
        if (!o.heightAt) return 0;
        const hw = (w || 1) / 2, hd = (d || 1) / 2;
        return Math.min(o.heightAt(x - hw, z - hd), o.heightAt(x + hw, z - hd), o.heightAt(x - hw, z + hd), o.heightAt(x + hw, z + hd), o.heightAt(x, z)) - 0.05;
    };
    const s = o.style;
    if (s === 'city') cityStretch(st, o.W);
    else if (s === 'village') { villageStretch(st, o.W); if (o.i % 6 === 3) river(st, false); }
    else if (s === 'forest') { forestStretch(st, o.W, !!o.snow); if (o.i % 7 === 5) river(st, !!o.snow); }
    else if (s === 'arsenev') townStretch(st, o.W);
    else if (s === 'industrial') industrialStretch(st, o.W);
    else if (s === 'junk') junkStretch(st, o.W);
    const mesh = batchMesh(st.b, kitMaterial(o.lite)), water = batchMesh(st.wb, waterMaterial());
    return { mesh: mesh, water: water, verts: st.b.p.length / 3, smoke: st.smoke };
}

/**
 * Насытить всю трассу кампании или волны (там она строится сразу целиком): участки по 60 ед. от старта до финиша,
 * стиль — по зоне трассы (src/biomes.js: town → окраина, иногда деревня; forest → лес/тайга; industrial; junk).
 * Каждый участок — отдельный меш прямо в сцене: отсечение по видимости и по кускам трассы (src/chunk-cull.js) работает.
 * o — { scene, startZ, finishZ, W, biomeAt(progress 0..1), snow, lite, glow (0..1 — ночь) }
 */
export function buildTrackScenery(o) {
    const LEN = 60, total = Math.max(1, o.startZ - o.finishZ);
    let n = 0;
    setKitGlow(o.glow || 0);
    for (let i = 0, z0 = o.startZ + 20; z0 > o.finishZ - 40; i++, z0 -= LEN) {
        const pr = Math.max(0, Math.min(1, (o.startZ - (z0 - LEN / 2)) / total));
        const b = o.biomeAt(pr);
        const style = b === 'town' ? (i % 5 === 2 ? 'village' : 'arsenev') : b === 'forest' ? 'forest' : b === 'industrial' ? 'industrial' : b === 'junk' ? 'junk' : 'arsenev';
        const sc = buildScenery({ style: style, snow: !!o.snow, i: i, z0: z0, len: LEN, W: o.W, lite: true, noTrees: true, rnd: Math.random }); // вся трасса сразу — облегчённо: без дальних высоток и второго леса
        if (sc.mesh) { o.scene.add(sc.mesh); n++; }
        if (sc.water) o.scene.add(sc.water);
    }
    return n;
}
