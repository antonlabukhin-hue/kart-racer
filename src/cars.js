/**
 * Модели машин игрока: одна и та же модель в гараже, магазине и заезде (детали 1:1).
 * Вынесено из main.js. Спереди машины — -Z. buildShowroomCar(carId) → { group, parts, bodyMat, upgrades }:
 *  parts    — косметика из гаража (спойлер, пороги…), видимость задаёт main.js по купленному;
 *  upgrades — видимая прокачка (src/upgrades.js), включается applyUpgradeVisuals(upgrades, levels).
 */
import * as THREE from 'three';
import { CAR_PRESETS } from './data.js';
import { normalizeLevels } from './upgrades.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

/** Показать на машине купленные улучшения (уровень N включает всё до N). levels — { engine: 0..3, ... } */
export function applyUpgradeVisuals(upgrades, levels) {
    if (!upgrades || !upgrades.byLevel) return;
    const L = normalizeLevels(levels);
    Object.keys(upgrades.byLevel).forEach(function(key) {
        const id = key.replace(/\d+$/, ''), lvl = parseInt(key.slice(id.length), 10);
        upgrades.byLevel[key].visible = (L[id] || 0) >= lvl;
    });
    const wide = L.tires >= 1 ? 1.3 : 1;
    (upgrades.wheels || []).forEach(function(w) { w.tire.scale.y = wide; w.disc.scale.y = wide; });
}

export function buildShowroomCar(carId) {
    const THREE_REF = window.THREE || THREE;
    const preset = (typeof CAR_PRESETS !== 'undefined' && CAR_PRESETS[carId]) ? CAR_PRESETS[carId] : { color: 0xff2200, name: 'Авто' };
    const group = new THREE.Group();
    const col = preset.color || 0xff2200;

    const bodyMat = new THREE_REF.MeshStandardMaterial({ color: col, metalness: 0.5, roughness: 0.32 });
    const bodyMat2 = bodyMat.clone();
    const blackMat = new THREE_REF.MeshStandardMaterial({ color: 0x151515, metalness: 0.55, roughness: 0.45 });
    const chromeMat = new THREE_REF.MeshStandardMaterial({ color: 0xc4c6d0, metalness: 0.4, roughness: 0.3 });
    const glassMat = new THREE_REF.MeshStandardMaterial({
        color: 0x1a3048, metalness: 0.6, roughness: 0.08, transparent: true, opacity: 0.78
    });
    const rubberMat = new THREE_REF.MeshStandardMaterial({ color: 0x0d0d0d, roughness: 0.92, metalness: 0.1 });
    const hlMat = new THREE_REF.MeshStandardMaterial({
        color: 0xfff8e0, emissive: 0xffcc66, emissiveIntensity: 0.95, metalness: 0.2, roughness: 0.25
    });
    const tailMat = new THREE_REF.MeshStandardMaterial({
        color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 1.6, roughness: 0.4, metalness: 0.1
    });

    // --- Тип кузова по id ---
    const isJeep = carId === 'kirpich';
    const isSport = carId === 'turbo';
    const isHatch = carId === 'zubilo'; // «Зубило»: клиновидная «девятка» 90-х с тюнингом

    // --- габариты ---
    const bodyH = isJeep ? 0.52 : (isSport ? 0.32 : (isHatch ? 0.36 : 0.4));
    const bodyY = isJeep ? 0.48 : 0.42;
    const bodyL = isJeep ? 2.0 : (isSport ? 2.45 : (isHatch ? 2.2 : 2.25));
    const bodyW = isJeep ? 1.28 : 1.22;

    // 1) Кузов
    // кузов скруглён: «игрушечный» силуэт читается лучше острых коробок
    const main = new THREE_REF.Mesh(new RoundedBoxGeometry(bodyW, bodyH, bodyL, 3, Math.min(0.11, bodyH * 0.3)), bodyMat);
    main.position.y = bodyY; main.userData.bodyPaint = true; group.add(main);

    // Расширители арок
    const archZ = isJeep ? 0.58 : 0.72;
    [-1, 1].forEach(side => {
        const f = new THREE_REF.Mesh(new RoundedBoxGeometry(0.12, bodyH * 0.65, isJeep ? 0.42 : 0.55, 2, 0.04), bodyMat2.clone());
        f.position.set(side * (bodyW / 2 + 0.01), bodyY - 0.02, archZ);
        f.userData.bodyPaint = true; group.add(f);
        const r = f.clone(); r.position.z = -archZ; r.userData.bodyPaint = true; group.add(r);
    });

    // 2) Капот (короткий у Нивы, спереди = -Z)
    const hoodLen = isJeep ? 0.48 : (isSport ? 1.03 : (isHatch ? 0.62 : 0.7)); // Волга капот ещё +10%
    const hood = new THREE_REF.Mesh(
        new RoundedBoxGeometry(bodyW * 0.9, 0.09, hoodLen, 2, 0.035),
        bodyMat2.clone()
    );
    hood.position.set(0, bodyY + bodyH * 0.5 - 0.02, -bodyL * 0.5 + hoodLen * 0.55);
    if (isSport) hood.rotation.x = 0.06;
    if (isHatch) { hood.rotation.x = 0.1; hood.position.y -= 0.02; } // клин: капот падает к носу
    hood.userData.bodyPaint = true; group.add(hood);

    // Багажник только у седана/спорта
    if (!isJeep && !isHatch) {
        const trunk = new THREE_REF.Mesh(
            new RoundedBoxGeometry(bodyW * 0.9, 0.12, 0.45, 2, 0.04),
            bodyMat2.clone()
        );
        trunk.position.set(0, bodyY + bodyH * 0.4, bodyL * 0.32);
        trunk.userData.bodyPaint = true; group.add(trunk);
    }

    // 3) Кабина: высокая, зад вровень с кузовом
    const cabinH = isJeep ? 0.56 : (isHatch ? 0.33 : 0.4);
    const cabinLen = isJeep ? 1.21 : (isHatch ? 0.78 : 0.95); // Нива +15% к капоту; «Зубило» — короткая крыша между скосами
    const cabinZ = isJeep ? (bodyL * 0.5 - cabinLen * 0.5 - 0.01) : (isSport ? 0.1 : (isHatch ? 0.2 : 0.05));
    // «девятка»: лобовое — плавный скос вперёд над капотом, пятая дверь — резкий скос назад
    const hatchF = isHatch ? 0.52 : 0, hatchR = isHatch ? 0.3 : 0;
    const cabinY = bodyY + bodyH * 0.5 + cabinH * 0.5;

    // Кабина: стекло как у остальных машин (прозрачное), каркас — тонкие стойки
    const cabinShell = new THREE_REF.Mesh(
        new RoundedBoxGeometry(bodyW * 0.88, cabinH, cabinLen, 2, 0.06),
        glassMat.clone()
    );
    cabinShell.position.set(0, cabinY, cabinZ);
    cabinShell.material.transparent = true;
    cabinShell.material.opacity = isJeep ? 0.38 : 0.55;
    cabinShell.material.color.setHex(isJeep ? 0x88b0cc : 0x1a3048);
    cabinShell.material.depthWrite = false;
    cabinShell.material.metalness = 0.35;
    cabinShell.material.roughness = 0.12;
    group.add(cabinShell);
    const cabin = cabinShell; // alias для antenna / roof_rack
    // Стойки кабины (Нива и седаны) — чёрная рамка, не перекрывает стёкла
    {
        const postMat = new THREE_REF.MeshStandardMaterial({ color: 0x111111, roughness: 0.85, metalness: 0.2 });
        const postW = 0.045;
        const postH = cabinH * 0.92;
        const zf = cabinZ - cabinLen * 0.48;
        const zr = cabinZ + cabinLen * 0.48;
        [[-1, zf], [1, zf], [-1, zr], [1, zr]].forEach(function(p) {
            const post = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(postW, postH, postW), postMat);
            post.position.set(p[0] * bodyW * 0.42, cabinY, p[1]);
            group.add(post);
        });
    }

    // Крыша (у Волги тоже — иначе «кабриолет»)
    {
        const roof = new THREE_REF.Mesh(
            new THREE_REF.BoxGeometry(bodyW * (isSport ? 0.84 : 0.86), 0.07, cabinLen * (isSport ? 0.95 : 0.98)),
            bodyMat2.clone()
        );
        roof.position.set(0, cabinY + cabinH * 0.5 + 0.02, cabinZ);
        roof.userData.bodyPaint = true; group.add(roof);
    }

    // 4) Стёкла — только в проёмах (тонкие, в плоскости стенок)
    {
        const gMat = glassMat.clone();
        gMat.transparent = true;
        gMat.opacity = isJeep ? 0.36 : 0.48;
        gMat.color.setHex(0xa8c8e0);
        gMat.depthWrite = false;
        gMat.metalness = 0.4;
        gMat.roughness = 0.1;

        // Лобовое (передняя стенка кабины, -Z)
        const wind = new THREE_REF.Mesh(
            new THREE_REF.BoxGeometry(bodyW * 0.72, cabinH * 0.7, 0.035),
            gMat
        );
        wind.position.set(0, cabinY, cabinZ - cabinLen * 0.5 - 0.025);
        group.add(wind);

        // Заднее (+Z)
        const rearG = new THREE_REF.Mesh(
            new THREE_REF.BoxGeometry(bodyW * 0.65, cabinH * 0.68, 0.035),
            gMat.clone()
        );
        rearG.position.set(0, cabinY, cabinZ + cabinLen * 0.5 + 0.025);
        group.add(rearG);
        if (isHatch) {
            // наклонная пятая дверь: стеклянный клин от крыши к корме (вместо вертикального заднего стекла)
            rearG.visible = false;
            const run = hatchR, rise = cabinH + 0.02, w = bodyW * 0.86;
            const tri = new THREE_REF.Shape();
            tri.moveTo(0, 0); tri.lineTo(-run, 0); tri.lineTo(0, rise); tri.closePath();
            const wg = new THREE_REF.ExtrudeGeometry(tri, { depth: w, bevelEnabled: false });
            wg.rotateY(Math.PI / 2); wg.translate(-w / 2, 0, 0);
            // клин — цвета кузова (толстая задняя стойка, как у «девятки»), стекло — только на наклоне
            const hatch = new THREE_REF.Mesh(wg, bodyMat2.clone());
            hatch.position.set(0, bodyY + bodyH * 0.5 - 0.005, cabinZ + cabinLen * 0.5);
            hatch.userData.bodyPaint = true; group.add(hatch);
            const ang = Math.atan2(rise, run), len = Math.hypot(rise, run);
            const hg = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(w * 0.84, 0.02, len * 0.8), gMat.clone());
            // на наклонной грани, чуть снаружи (нормаль грани — вверх-назад)
            hg.position.set(0, bodyY + bodyH * 0.5 + rise * 0.5 + Math.cos(ang) * 0.012, cabinZ + cabinLen * 0.5 + run * 0.5 + Math.sin(ang) * 0.012);
            hg.rotation.x = ang; group.add(hg);
            // лобовое: плавный стеклянный клин вперёд над капотом (вместо вертикального), стойки по скосу
            wind.visible = false;
            const triF = new THREE_REF.Shape();
            triF.moveTo(0, 0); triF.lineTo(hatchF, 0); triF.lineTo(0, rise); triF.closePath();
            const wf = new THREE_REF.ExtrudeGeometry(triF, { depth: w, bevelEnabled: false });
            wf.rotateY(Math.PI / 2); wf.translate(-w / 2, 0, 0);
            const wsMat = gMat.clone(); wsMat.opacity = 0.6; wsMat.color.setHex(0x44607a);
            const ws = new THREE_REF.Mesh(wf, wsMat);
            ws.position.set(0, bodyY + bodyH * 0.5 - 0.005, cabinZ - cabinLen * 0.5);
            group.add(ws);
            const angF = Math.atan2(rise, hatchF), lenF = Math.hypot(rise, hatchF);
            [-1, 1].forEach(function(sx) {
                const post = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.05, 0.05, lenF), blackMat);
                post.position.set(sx * w * 0.5, bodyY + bodyH * 0.5 + rise * 0.5, cabinZ - cabinLen * 0.5 - hatchF * 0.5);
                post.rotation.x = -angF; group.add(post);
            });
        }

        // Боковые: только средняя зона кабины, не выходят за переднюю стенку
        if (isJeep) {
            const sideMat = glassMat.clone();
            sideMat.transparent = true;
            sideMat.opacity = 0.36;
            sideMat.color.setHex(0xa8c8e0);
            sideMat.depthWrite = false;
            sideMat.metalness = 0.4;
            sideMat.roughness = 0.1;
            // боковые окна: высота как лобовое (0.7), длина соразмерно кабине
            const winLen = cabinLen * 0.48;
            const winZ = cabinZ + cabinLen * 0.02;
            [-1, 1].forEach(side => {
                const sg = new THREE_REF.Mesh(
                    new THREE_REF.BoxGeometry(0.018, cabinH * 0.7, winLen),
                    sideMat
                );
                sg.position.set(side * bodyW * 0.441, cabinY, winZ);
                group.add(sg);
            });
        }
    }

    // Тонкие стойки (A/C) — не толстые чёрные панели
    {
        const hz = cabinLen * 0.42;
        [[-1, cabinZ - hz], [1, cabinZ - hz], [-1, cabinZ + hz], [1, cabinZ + hz]].forEach(([sx, z]) => {
            const p = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.04, cabinH * 0.85, 0.04), blackMat);
            p.position.set(sx * bodyW * 0.42, cabinY, z);
            group.add(p);
        });
    }

    // Бамперы
    const bumpF = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(bodyW * 1.02, 0.14, 0.18), blackMat);
    bumpF.position.set(0, 0.26, -bodyL * 0.5);
    group.add(bumpF);
    const bumpR = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(bodyW * 1.02, 0.14, 0.16), blackMat);
    bumpR.position.set(0, 0.26, bodyL * 0.5);
    group.add(bumpR);

    // 5) Решётка
    {
        const grillZ = -bodyL * 0.5 - 0.01;
        const grillY = isJeep ? bodyY + 0.02 : 0.42;
        const grillG = new THREE_REF.Group();
        if (isJeep) {
            const frame = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(bodyW * 0.38, 0.24, 0.04), blackMat);
            frame.position.set(0, grillY, grillZ); grillG.add(frame);
            for (let i = 0; i < 4; i++) {
                const bar = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(bodyW * 0.34, 0.02, 0.025), chromeMat.clone());
                bar.position.set(0, grillY - 0.08 + i * 0.05, grillZ - 0.02);
                grillG.add(bar);
            }
        } else if (isHatch) {
            // «Зубило»: узкая щель решётки между фарами
            const slit = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(bodyW * 0.3, 0.05, 0.04), blackMat);
            slit.position.set(0, 0.44, grillZ); grillG.add(slit);
        } else if (isSport) {
            // у «Волги» своя хромовая решётка «чайка» (блок ВОЛГА ниже); вторая в той же плоскости мерцала
        } else {
            const frame = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(bodyW * 0.48, 0.16, 0.04), blackMat);
            frame.position.set(0, grillY, grillZ); grillG.add(frame);
            for (let i = 0; i < 6; i++) {
                const bar = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.025, 0.13, 0.025), chromeMat.clone());
                bar.position.set(-bodyW * 0.18 + i * (bodyW * 0.36 / 5), grillY, grillZ - 0.02);
                grillG.add(bar);
            }
        }
        group.add(grillG);
    }

    // 6) Зеркала — одна пара, в блоке «Детали кузова» ниже (раньше было две пары одна над другой)

    // 7) Фары — корпус и линза СОСНО (один x,y; линза чуть вперёд по -Z)
    {
        const hlY = isJeep ? bodyY + 0.04 : (isSport ? 0.42 : 0.44);
        const hlZ = -bodyL * 0.5 - (isJeep ? 0.02 : 0.04);
        const hlX = isJeep ? bodyW * 0.33 : (isHatch ? bodyW * 0.33 : bodyW * 0.40);
        [-1, 1].forEach(side => {
            if (isJeep) {
                // хромированный корпус (короткий цилиндр вдоль Z)
                const cup = new THREE_REF.Mesh(
                    new THREE_REF.CylinderGeometry(0.085, 0.09, 0.07, 14),
                    chromeMat.clone()
                );
                cup.rotation.x = Math.PI / 2;
                cup.position.set(side * hlX, hlY, hlZ);
                group.add(cup);
                // линза в центре стакана
                const lens = new THREE_REF.Mesh(
                    new THREE_REF.CircleGeometry(0.07, 14),
                    hlMat.clone()
                );
                lens.rotation.y = Math.PI;
                lens.position.set(side * hlX, hlY, hlZ - 0.036);
                lens.userData.isLight = true;
                group.add(lens);
            } else if (isHatch) {
                // узкие прямоугольные фары «девятки»
                const shell = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.34, 0.09, 0.08), blackMat);
                shell.position.set(side * hlX, hlY, hlZ);
                group.add(shell);
                const lens = new THREE_REF.Mesh(new THREE_REF.PlaneGeometry(0.3, 0.062), hlMat.clone());
                lens.rotation.y = Math.PI;
                lens.position.set(side * hlX, hlY, hlZ - 0.042);
                lens.userData.isLight = true;
                group.add(lens);
            } else {
                const shell = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.22, 0.13, 0.09), chromeMat.clone());
                shell.position.set(side * hlX, hlY, hlZ);
                group.add(shell);
                const lens = new THREE_REF.Mesh(new THREE_REF.CircleGeometry(0.07, 14), hlMat.clone());
                lens.rotation.y = Math.PI;
                lens.position.set(side * hlX, hlY, hlZ - 0.05);
                lens.userData.isLight = true;
                group.add(lens);
            }
        });
    }

    // Стоп-сигналы (не спорт — у Волги свои горизонтальные ниже)
    if (!isSport && !isHatch) {
        const tlMat = tailMat.clone();
        tlMat.emissiveIntensity = 1.5;
        const stopY = isJeep ? (bodyY + 0.08) : 0.50;
        const stopZ = isJeep ? bodyL * 0.52 + 0.08 : bodyL * 0.5 - 0.01; // у Нивы — на задней двери, а не внутри неё
        const stopX = isJeep ? bodyW * 0.37 : bodyW * 0.32; // и мимо запаски
        [-1, 1].forEach(side => {
            const tl = new THREE_REF.Mesh(
                new THREE_REF.BoxGeometry(isJeep ? 0.22 : 0.24, isJeep ? 0.12 : 0.14, 0.06),
                tlMat.clone()
            );
            tl.position.set(side * stopX, stopY, stopZ);
            tl.userData.isLight = true;
            group.add(tl);
        });
    }
    // Подсветка днища (очень лёгкая, не «вторая машина»)
    const underglow = new THREE_REF.Mesh(
        new THREE_REF.BoxGeometry(bodyW * 0.85, 0.015, bodyL * 0.8),
        new THREE_REF.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.06, transparent: true, opacity: 0.22 })
    );
    underglow.position.y = 0.06; underglow.userData.bodyPaint = true; group.add(underglow);

    // Колёса
    const wheelR = isJeep ? 0.28 : 0.24;
    const wheelY = wheelR;
    const wheelZ = bodyL * 0.32;
    const wheelX = bodyW * 0.52;
    const wheelPositions = [
        [-wheelX, wheelY, wheelZ], [wheelX, wheelY, wheelZ],
        [-wheelX, wheelY, -wheelZ], [wheelX, wheelY, -wheelZ]
    ];
    const wheelMeshes = [];
    // колесо — «ступица»: шина, диск, колпак и болты вращаются вместе (hub.rotation.x)
    wheelPositions.forEach(p => {
        const hub = new THREE_REF.Group();
        hub.userData.isWheel = true;
        hub.position.set(p[0], p[1], p[2]);
        group.add(hub);
        const tire = new THREE_REF.Mesh(new THREE_REF.CylinderGeometry(wheelR, wheelR, 0.2, 18), rubberMat);
        tire.rotation.z = Math.PI / 2; hub.add(tire);
        const disc = new THREE_REF.Mesh(new THREE_REF.CylinderGeometry(wheelR * 0.55, wheelR * 0.55, 0.22, 14), chromeMat);
        disc.rotation.z = Math.PI / 2; hub.add(disc);
        wheelMeshes.push({ tire: tire, disc: disc, hub: hub, x: p[0], y: p[1], z: p[2] });
    });

    // Заводской маленький спойлер на спорт
    if (isSport) {
        const deck = bodyY + bodyH * 0.4 + 0.06; // верх крышки багажника
        const stockWing = new THREE_REF.Mesh(new RoundedBoxGeometry(1.1, 0.05, 0.26, 2, 0.02), blackMat);
        stockWing.position.set(0, deck + 0.12, bodyL * 0.36); group.add(stockWing);
        [-0.36, 0.36].forEach(function(x) {
            const post = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.05, 0.12, 0.07), blackMat);
            post.position.set(x, deck + 0.06, bodyL * 0.36); group.add(post);
        });
    }

    // === «ЗУБИЛО» (zubilo): клин, хэтчбек, спойлер на крыше, обвес и неон под днищем — тюнинг 90-х ===
    if (isHatch) {
        const kit = new THREE_REF.MeshStandardMaterial({ color: 0x121212, metalness: 0.3, roughness: 0.55 });
        const neon = new THREE_REF.MeshBasicMaterial({ color: 0x33e6ff });
        const roofTop = bodyY + bodyH * 0.5 + cabinH + 0.05;
        // заводской козырёк над пятой дверью (большой спойлер — в тюнинге)
        const visor = new THREE_REF.Mesh(new RoundedBoxGeometry(bodyW * 0.8, 0.035, 0.16, 2, 0.015), kit);
        visor.position.set(0, roofTop - 0.01, cabinZ + cabinLen * 0.5 + 0.05); visor.rotation.x = 0.3; group.add(visor);
        // губа переднего бампера
        const lip = new THREE_REF.Mesh(new RoundedBoxGeometry(bodyW * 0.96, 0.05, 0.14, 2, 0.02), kit);
        lip.position.set(0, 0.15, -bodyL * 0.5 - 0.05); group.add(lip);
        // сплошная полоса задних фонарей через всю корму
        const tl = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(bodyW * 0.9, 0.08, 0.04), tailMat.clone());
        tl.position.set(0, 0.54, bodyL * 0.5 + 0.005); tl.userData.isLight = true; group.add(tl);
        // неон под днищем (светится сам — видно и днём) и тонкая полоса по борту
        const glow = new THREE_REF.Mesh(new THREE_REF.PlaneGeometry(bodyW * 0.9, bodyL * 0.78), new THREE_REF.MeshBasicMaterial({ color: 0x33e6ff, transparent: true, opacity: 0.55, depthWrite: false }));
        glow.rotation.x = -Math.PI / 2; glow.position.y = 0.04; glow.userData.isLight = true; group.add(glow);
        [-1, 1].forEach(function(sx) {
            const st = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.008, 0.03, bodyL * 0.62), neon);
            st.position.set(sx * (bodyW * 0.5 + 0.006), bodyY + 0.06, 0.05); group.add(st);
        });
    }

    // === НИВА (kirpich): высокий кузов, запаска, круглая оптика, короткий капот ===
    if (isJeep) {
        // Вертикальная задняя дверь
        const rearDoor = new THREE_REF.Mesh(
            new THREE_REF.BoxGeometry(bodyW * 0.88, bodyH * 0.95, 0.12),
            bodyMat2.clone()
        );
        rearDoor.position.set(0, bodyY + 0.05, bodyL * 0.52);
        rearDoor.userData.bodyPaint = true; group.add(rearDoor);
        // Запаска на задней двери (диск смотрит назад, ось = Z)
        const spare = new THREE_REF.Mesh(
            new THREE_REF.CylinderGeometry(0.34, 0.34, 0.16, 18),
            rubberMat
        );
        spare.rotation.x = Math.PI / 2;
        spare.position.set(0, bodyY + 0.2, bodyL * 0.58 + 0.08);
        group.add(spare);
        const spareDisc = new THREE_REF.Mesh(
            new THREE_REF.CylinderGeometry(0.2, 0.2, 0.12, 14),
            chromeMat.clone()
        );
        spareDisc.rotation.x = Math.PI / 2;
        spareDisc.position.set(0, bodyY + 0.2, bodyL * 0.58 + 0.12);
        group.add(spareDisc);
        // крепление запаски
        const spareMount = new THREE_REF.Mesh(
            new THREE_REF.BoxGeometry(0.12, 0.12, 0.1),
            chromeMat.clone()
        );
        spareMount.position.set(0, bodyY + 0.2, bodyL * 0.55 + 0.05);
        group.add(spareMount);
        // Пороги-ступени
        [-1, 1].forEach(function(side) {
            const step = new THREE_REF.Mesh(
                new THREE_REF.BoxGeometry(0.18, 0.08, bodyL * 0.55),
                blackMat
            );
            step.position.set(side * (bodyW * 0.55), 0.18, 0);
            group.add(step);
        });
        // без дефолтной антенны (не дублировать с тюнингом)
    }

    // === ВОЛГА (turbo): длинный капот, хромированная решётка, « chron » бампер, двуцветная полоса ===
    if (isSport) {
        // Длинный выразительный капот уже есть; добавим хромовую решётку «чайка»
        // узкая центральная решётка — фары по бокам не перекрываются
        const grillChrome = new THREE_REF.Mesh(
            new THREE_REF.BoxGeometry(bodyW * 0.36, 0.16, 0.05),
            chromeMat.clone()
        );
        grillChrome.position.set(0, 0.42, -bodyL * 0.5 - 0.01);
        group.add(grillChrome);
        // Горизонтальные полосы — только центр, не перекрывают фары
        for (let i = 0; i < 4; i++) {
            const bar = new THREE_REF.Mesh(
                new THREE_REF.BoxGeometry(bodyW * 0.32, 0.022, 0.03),
                blackMat
            );
            bar.position.set(0, 0.36 + i * 0.04, -bodyL * 0.5 - 0.03); // перед хромом (раньше грани совпадали — рябь)
            group.add(bar);
        }
        // Базовый хромовый бампер (без тюнинг-губы и клыков)
        const bumpChrome = new THREE_REF.Mesh(
            new THREE_REF.BoxGeometry(bodyW * 0.98, 0.1, 0.12),
            chromeMat.clone()
        );
        bumpChrome.position.set(0, 0.25, -bodyL * 0.5 - 0.045); // накладкой перед чёрным бампером (раньше пряталась внутри)
        group.add(bumpChrome);
        // Задний базовый бампер
        const rearBump = new THREE_REF.Mesh(
            new THREE_REF.BoxGeometry(bodyW * 0.98, 0.09, 0.1),
            chromeMat.clone()
        );
        rearBump.position.set(0, 0.25, bodyL * 0.5 + 0.045);
        group.add(rearBump);
        // Боковая хромовая полоса «Волга»
        [-1, 1].forEach(function(side) {
            const stripe = new THREE_REF.Mesh(
                new THREE_REF.BoxGeometry(0.04, 0.06, bodyL * 0.7),
                chromeMat.clone()
            );
            stripe.position.set(side * bodyW * 0.51, bodyY + 0.05, 0);
            group.add(stripe);
        });
        // Горизонтальные задние фонари «Волга» (на кузове, без вертикальных дублей)
        [-1, 1].forEach(function(side) {
            const tlM = tailMat.clone();
            tlM.emissiveIntensity = 1.8;
            const stop = new THREE_REF.Mesh(
                new THREE_REF.BoxGeometry(0.28, 0.11, 0.06),
                tlM
            );
            stop.position.set(side * bodyW * 0.34, 0.50, bodyL * 0.5 - 0.01);
            stop.userData.isLight = true;
            group.add(stop);
            const amber = new THREE_REF.Mesh(
                new THREE_REF.BoxGeometry(0.1, 0.1, 0.05), // чуть меньше стопа: общий стык не мерцает
                new THREE_REF.MeshStandardMaterial({
                    color: 0xffaa00, emissive: 0xff8800, emissiveIntensity: 0.9, roughness: 0.4
                })
            );
            amber.position.set(side * bodyW * 0.48, 0.50, bodyL * 0.5 - 0.01);
            amber.userData.isLight = true;
            group.add(amber);
        });
        // Орнамент на капоте
        const ornament = new THREE_REF.Mesh(
            new THREE_REF.BoxGeometry(0.08, 0.06, 0.25),
            chromeMat.clone()
        );
        ornament.position.set(0, bodyY + bodyH * 0.5 + 0.06, -bodyL * 0.35);
        group.add(ornament);
    }

    // --- Кастом-детали (примерка) ---
    const parts = {};
    const partBlack = new THREE_REF.MeshStandardMaterial({ color: 0x0e0e10, metalness: 0.4, roughness: 0.55 });
    const partChrome = new THREE_REF.MeshStandardMaterial({ color: 0xcfd1d8, metalness: 0.45, roughness: 0.22 });
    const spoilerG = new THREE_REF.Group();
    // Нива: спойлер НА КРЫШЕ сзади; седан: на багажнике
    const spoilerOnRoof = isJeep || isHatch; // у хэтчбека багажника нет — тюнинг-спойлер на крыше
    const spoilerDeckY = spoilerOnRoof
        ? (cabin.position.y + cabinH * 0.5 + 0.02)
        : (bodyY + bodyH * 0.5 + 0.02);
    const spoilerZ = spoilerOnRoof
        ? (cabin.position.z + cabinLen * 0.35)
        : (bodyL * 0.36);
    const wing = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(isJeep ? 1.0 : 1.15, 0.05, 0.28), partBlack.clone());
    wing.position.set(0, spoilerDeckY + 0.16, spoilerZ); spoilerG.add(wing);
    [-0.28, 0.28].forEach(x => {
        const st = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.05, 0.16, 0.05), partBlack.clone());
        st.position.set(x, spoilerDeckY + 0.08, spoilerZ - 0.02); spoilerG.add(st);
    });
    const base = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.75, 0.03, 0.12), partBlack.clone());
    base.position.set(0, spoilerDeckY + 0.02, spoilerZ - 0.04); spoilerG.add(base);
    spoilerG.visible = false; group.add(spoilerG); parts.spoiler = spoilerG;
    // Нива: спойлер не в базе и не в слотах — только седан/Волга
    if (isJeep) { spoilerG.visible = false; delete parts.spoiler; }

    const skirts = new THREE_REF.Group();
    [-1, 1].forEach(side => {
        const s = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.08, 0.14, bodyL * 0.75), partBlack.clone());
        s.position.set(side * (bodyW * 0.55), 0.22, 0); skirts.add(s);
    });
    skirts.visible = false; group.add(skirts); parts.skirts = skirts;

    const exhaust = new THREE_REF.Group();
    [-0.28, 0.28].forEach(x => {
        const e = new THREE_REF.Mesh(new THREE_REF.CylinderGeometry(0.06, 0.07, 0.32, 12), partChrome.clone());
        e.rotation.x = Math.PI / 2; e.position.set(x, 0.2, bodyL * 0.55); exhaust.add(e);
    });
    exhaust.visible = false; group.add(exhaust); parts.exhaust = exhaust;

    // Верх кабины — якорь для багажника и антенны
    const roofTopY = cabin.position.y + cabinH * 0.5 + 0.04;

    const roofRack = new THREE_REF.Group();
    const rack = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(bodyW * 0.75, 0.05, 1.0), chromeMat);
    rack.position.set(0, roofTopY + 0.04, cabin.position.z); roofRack.add(rack);
    // ножки багажника до крыши
    [[-0.3, -0.35], [0.3, -0.35], [-0.3, 0.35], [0.3, 0.35]].forEach(([x, z]) => {
        const leg = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.04, 0.1, 0.04), chromeMat);
        leg.position.set(x, roofTopY - 0.02, cabin.position.z + z * 0.5); roofRack.add(leg);
    });
    // поклажа пониже и с ремнями (гладкая коробка на полкрыши выглядела грубо)
    const crate = new THREE_REF.Mesh(
        new RoundedBoxGeometry(bodyW * 0.6, 0.2, 0.6, 2, 0.03),
        new THREE_REF.MeshStandardMaterial({ color: 0x8a5a28, roughness: 0.8 })
    );
    crate.position.set(0, roofTopY + 0.165, cabin.position.z); roofRack.add(crate);
    const strapMat = new THREE_REF.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.9 });
    [-0.16, 0.16].forEach(function(dz) {
        const strap = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(bodyW * 0.6 + 0.014, 0.214, 0.045), strapMat);
        strap.position.set(0, roofTopY + 0.165, cabin.position.z + dz); roofRack.add(strap);
    });
    roofRack.visible = false; group.add(roofRack); parts.roof_rack = roofRack;
    // Нива — джип, багажник на крышу не ставим (меш не показываем никогда)
    if (isJeep) { roofRack.visible = false; delete parts.roof_rack; }

    const lip = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(bodyW * 0.95, 0.07, 0.26), partBlack.clone());
    lip.position.set(0, 0.18, -bodyL * 0.55); lip.visible = false; group.add(lip); parts.lip = lip;

    const rims = new THREE_REF.Group();
    wheelPositions.forEach(p => {
        const rim = new THREE_REF.Mesh(
            new THREE_REF.CylinderGeometry(wheelR * 0.62, wheelR * 0.62, 0.24, 16),
            new THREE_REF.MeshStandardMaterial({ color: 0xf0f0ff, metalness: 0.5, roughness: 0.15 })
        );
        rim.rotation.z = Math.PI / 2; rim.position.set(p[0], p[1], p[2]); rims.add(rim);
    });
    rims.visible = false; group.add(rims); parts.rims = rims;

    // Антенна стоит НА крыше
    const antLen = isJeep ? 0.4 : 0.7;
    const antenna = new THREE_REF.Mesh(new THREE_REF.CylinderGeometry(0.012, 0.012, antLen, 6), partBlack.clone());
    // Нива: одна короткая у заднего края крыши; седан: сбоку
    antenna.position.set(
        isJeep ? -bodyW * 0.22 : -bodyW * 0.28,
        roofTopY + antLen * 0.5,
        isJeep ? (cabin.position.z + cabinLen * 0.35) : (cabin.position.z - 0.15)
    );
    antenna.visible = false; group.add(antenna); parts.antenna = antenna;

    const fog = new THREE_REF.Group();
    [-0.45, 0.45].forEach(x => {
        const f = new THREE_REF.Mesh(
            new THREE_REF.CircleGeometry(0.08, 14),
            new THREE_REF.MeshStandardMaterial({ color: 0xfff2c0, emissive: 0xffaa44, emissiveIntensity: 1.1 })
        );
        f.rotation.y = Math.PI;
        f.position.set(x, 0.26, -bodyL * 0.53); fog.add(f);
    });
    fog.visible = false; group.add(fog); parts.fog = fog;

    const xenon = new THREE_REF.Group(); xenon.visible = false; group.add(xenon); parts.xenon = xenon;

    // --- Детали кузова: номера, зеркала, дворники, стыки дверей, молдинг, колпаки, брызговики ---
    {
        const cabinY2 = bodyY + bodyH * 0.5 + cabinH * 0.5;
        const topY = bodyY + bodyH * 0.5;
        const frontZ = -bodyL * 0.5, rearZ = bodyL * 0.5;
        const dark = new THREE_REF.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.9 });
        const chrome2 = new THREE_REF.MeshStandardMaterial({ color: 0xdcdfe6, metalness: 0.4, roughness: 0.25 });
        const B = function(mat, x, y, z, sx, sy, sz, paint) {
            const m = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(sx, sy, sz), mat);
            m.position.set(x, y, z); if (paint) m.userData.bodyPaint = true; group.add(m); return m;
        };
        // номерной знак (канвас): белый, чёрные буквы, флажок и «25» — Приморье
        const plateTex = (function() {
            const cv = document.createElement('canvas'); cv.width = 256; cv.height = 56;
            const cx = cv.getContext('2d');
            cx.fillStyle = '#f4f4f0'; cx.fillRect(0, 0, 256, 56);
            cx.strokeStyle = '#111'; cx.lineWidth = 4; cx.strokeRect(2, 2, 252, 52);
            cx.fillStyle = '#111'; cx.font = 'bold 36px Arial, sans-serif'; cx.textBaseline = 'middle';
            const txt = { cheburashka: 'К 101 АР', kirpich: 'Н 404 ИВ', turbo: 'В 024 ГА', zubilo: 'Е 109 ЗБ' }[carId] || 'А 000 АА';
            cx.fillText(txt, 12, 30);
            cx.fillRect(196, 4, 2, 48);
            cx.font = 'bold 22px Arial, sans-serif'; cx.fillText('25', 210, 22);
            cx.fillStyle = '#fff'; cx.fillRect(210, 36, 14, 5); cx.fillStyle = '#1a3aa8'; cx.fillRect(210, 41, 14, 5); cx.fillStyle = '#d01818'; cx.fillRect(210, 46, 14, 5);
            const t = new THREE_REF.CanvasTexture(cv); t.anisotropy = 4; return t;
        })();
        const plateMat = new THREE_REF.MeshBasicMaterial({ map: plateTex });
        const pf = new THREE_REF.Mesh(new THREE_REF.PlaneGeometry(0.46, 0.1), plateMat);
        pf.rotation.y = Math.PI; pf.position.set(0, 0.27, frontZ - (isSport ? 0.115 : 0.1)); group.add(pf); // на бампере, выше «губы» и трубы кенгурятника
        const pr = new THREE_REF.Mesh(new THREE_REF.PlaneGeometry(0.46, 0.1), plateMat);
        pr.position.set(0, isJeep ? 0.22 : 0.35, rearZ + (isJeep ? 0.09 : 0.13)); group.add(pr); // у Нивы — под запаской
        // зеркала на стойках у лобового: кронштейн от стенки кабины до корпуса зеркала (без зазоров)
        [-1, 1].forEach(function(sx) {
            const zM = isHatch ? cabinZ - cabinLen * 0.5 - hatchF * 0.8 : cabinZ - cabinLen * 0.42; // у «Зубила» — у основания лобового
            const xIn = bodyW * 0.44, xOut = bodyW * 0.5 + 0.06;
            B(dark, sx * (xIn + xOut) / 2, topY + 0.08, zM, xOut - xIn + 0.02, 0.03, 0.03);
            B(bodyMat, sx * (bodyW * 0.5 + 0.09), topY + 0.1, zM, 0.07, 0.08, 0.1, true);
            B(chrome2, sx * (bodyW * 0.5 + 0.09), topY + 0.1, zM + 0.051, 0.055, 0.065, 0.005);
        });
        // дворники на лобовом
        [-0.18, 0.12].forEach(function(x) {
            const w = isHatch ? B(dark, x, topY + 0.04, cabinZ - cabinLen * 0.5 - hatchF + 0.06, 0.34, 0.015, 0.015)
                : B(dark, x, cabinY2 - cabinH * 0.3, cabinZ - cabinLen * 0.5 - 0.05, 0.34, 0.015, 0.015);
            w.rotation.z = 0.25;
        });
        // стыки дверей и ручки, хромированный молдинг по поясу
        [-1, 1].forEach(function(sx) {
            const x = sx * (bodyW * 0.5 + 0.004);
            const doorZs = isJeep ? [cabinZ - cabinLen * 0.1] : isHatch ? [cabinZ - cabinLen * 0.5 - hatchF * 0.8, cabinZ + cabinLen * 0.1] : [cabinZ - cabinLen * 0.45, cabinZ + cabinLen * 0.05];
            doorZs.forEach(function(z) {
                B(dark, x, bodyY, z, 0.008, bodyH * 0.9, 0.012);
                B(chrome2, sx * (bodyW * 0.5 + 0.014), bodyY + bodyH * 0.25, z + 0.12, 0.012, 0.025, 0.09);
            });
            B(dark, x, bodyY, cabinZ + cabinLen * 0.5 + 0.02, 0.008, bodyH * 0.9, 0.012);
            B(chrome2, sx * (bodyW * 0.5 + 0.01), bodyY + bodyH * 0.38, 0, 0.012, 0.018, bodyL * 0.9);
        });
        // колпаки: 5 болтов и центральный колпачок
        wheelMeshes.forEach(function(w) {
            const s = Math.sign(w.x) || 1;
            const cap = new THREE_REF.Mesh(new THREE_REF.CylinderGeometry(wheelR * 0.25, wheelR * 0.25, 0.03, 12), chrome2);
            cap.rotation.z = Math.PI / 2; cap.position.set(s * 0.115, 0, 0); w.hub.add(cap);
            for (let i = 0; i < 5; i++) {
                const a = i / 5 * Math.PI * 2;
                const bolt = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.02, 0.025, 0.025), dark);
                bolt.position.set(s * 0.112, Math.sin(a) * wheelR * 0.38, Math.cos(a) * wheelR * 0.38);
                w.hub.add(bolt);
            }
            // светлая полоса на боковине шины — видно, что колесо крутится
            const mark = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.012, wheelR * 0.3, 0.05), chrome2);
            mark.position.set(s * 0.101, wheelR * 0.78, 0); w.hub.add(mark);
            // брызговик за задним колесом
            // под кузовом: верх упирается в днище, наружу за борт не торчит
            if (w.z > 0) B(dark, Math.sign(w.x) * (bodyW * 0.5 - 0.1), bodyY - bodyH * 0.5 - 0.07, w.z + wheelR + 0.04, 0.18, 0.15, 0.02);
        });
        if (!isJeep && !isSport && !isHatch) {
            // Ушастик — «копейка»: сдвоенные круглые фары и хромированные бамперы с клыками
            const hlY2 = 0.44, hlZ2 = frontZ - 0.05;
            [-1, 1].forEach(function(sx) {
                const cup = new THREE_REF.Mesh(new THREE_REF.CylinderGeometry(0.055, 0.06, 0.05, 14), chrome2);
                cup.rotation.x = Math.PI / 2; cup.position.set(sx * bodyW * 0.26, hlY2, hlZ2); group.add(cup);
                const lens = new THREE_REF.Mesh(new THREE_REF.CircleGeometry(0.045, 14), hlMat.clone());
                lens.rotation.y = Math.PI; lens.position.set(sx * bodyW * 0.26, hlY2, hlZ2 - 0.027);
                lens.userData.isLight = true; group.add(lens);
            });
            B(chrome2, 0, 0.26, frontZ - 0.1, bodyW * 1.04, 0.06, 0.05);
            B(chrome2, 0, 0.26, rearZ + 0.09, bodyW * 1.04, 0.06, 0.05);
            [-0.3, 0.3].forEach(function(x) {
                B(dark, x, 0.24, frontZ - 0.13, 0.05, 0.12, 0.04);
                B(dark, x, 0.24, rearZ + 0.12, 0.05, 0.12, 0.04);
            });
        }
        // надписи на дверях
        const decal = { cheburashka: 'УШАСТИК', kirpich: '4×4', turbo: null }[carId];
        if (decal) {
            const cv = document.createElement('canvas'); cv.width = 256; cv.height = 64;
            const cx = cv.getContext('2d');
            cx.font = 'bold 44px Impact, Arial Black, sans-serif'; cx.textAlign = 'center'; cx.textBaseline = 'middle';
            cx.lineWidth = 6; cx.strokeStyle = '#1a1a1a'; cx.strokeText(decal, 128, 34);
            cx.fillStyle = carId === 'kirpich' ? '#e8e0c0' : '#ffe24a'; cx.fillText(decal, 128, 34);
            const tex = new THREE_REF.CanvasTexture(cv);
            const dm = new THREE_REF.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
            [-1, 1].forEach(function(sx) {
                const pl = new THREE_REF.Mesh(new THREE_REF.PlaneGeometry(isJeep ? 0.36 : 0.7, isJeep ? 0.1 : 0.17), dm);
                pl.rotation.y = sx * Math.PI / 2;
                pl.position.set(sx * (bodyW * 0.5 + 0.012), bodyY - 0.04, isJeep ? bodyL * 0.2 : cabinZ - 0.05);
                group.add(pl);
            });
        }
        if (isSport) {
            // Волга: шашечный молдинг под окнами
            [-1, 1].forEach(function(sx) {
                for (let i = 0; i < 14; i++) {
                    B(i % 2 ? new THREE_REF.MeshBasicMaterial({ color: 0x111111 }) : new THREE_REF.MeshBasicMaterial({ color: 0xf2f2f2 }),
                        sx * (bodyW * 0.5 + 0.012), bodyY + bodyH * 0.12, -bodyL * 0.35 + i * bodyL * 0.05, 0.01, 0.045, bodyL * 0.05);
                }
            });
        }
    }

    // --- Прокачка: видимые улучшения по уровням (src/upgrades.js). Отдельно от косметики parts,
    // чтобы код, прячущий некупленную косметику, их не трогал. Включает applyUpgradeVisuals().
    const upgrades = { wheels: wheelMeshes, wheelR: wheelR, byLevel: {} };
    {
        const U = function(id, lvl) { const g = new THREE_REF.Group(); g.visible = false; group.add(g); upgrades.byLevel[id + lvl] = g; return g; };
        const M = function(c, o) { return new THREE_REF.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.5, metalness: 0.4 }, o || {})); };
        const B = function(g, mat, x, y, z, sx, sy, sz) { const m = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(sx, sy, sz), mat); m.position.set(x, y, z); g.add(m); return m; };
        const C = function(g, mat, r1, r2, h, x, y, z, rx, rz) { const m = new THREE_REF.Mesh(new THREE_REF.CylinderGeometry(r1, r2, h, 12), mat); m.position.set(x, y, z); if (rx) m.rotation.x = rx; if (rz) m.rotation.z = rz; g.add(m); return m; };
        const topY = bodyY + bodyH * 0.5;
        const hoodZ = isHatch ? -bodyL * 0.5 + 0.2 : -bodyL * 0.5 + hoodLen * 0.55; // у «Зубила» лобовое заходит на капот — детали ближе к носу
        const frontZ = -bodyL * 0.5, rearZ = bodyL * 0.5;
        const black = M(0x141414, { metalness: 0.3 }), chrome = M(0xc8ccd4, { metalness: 0.9, roughness: 0.2 });
        const red = M(0xd01818), yellow = M(0xf0c020), steel = M(0x6a6e74, { metalness: 0.7 }), blue = M(0x1a5ad8, { metalness: 0.6, roughness: 0.3 });
        const blueGlow = new THREE_REF.MeshBasicMaterial({ color: 0x55aaff });
        // Двигатель: 1 — воздухозаборник, 2 — хромированный фильтр над ним, 3 — гоночные полосы
        const e1 = U('engine', 1);
        B(e1, black, 0, topY + 0.07, hoodZ, bodyW * 0.32, 0.1, hoodLen * 0.5);
        B(e1, M(0x050505), 0, topY + 0.08, hoodZ - hoodLen * 0.25 - 0.01, bodyW * 0.26, 0.06, 0.02);
        const e2 = U('engine', 2);
        C(e2, chrome, 0.13, 0.15, 0.12, 0, topY + 0.18, hoodZ);
        C(e2, black, 0.1, 0.1, 0.02, 0, topY + 0.25, hoodZ);
        const e3 = U('engine', 3);
        [-0.14, 0.14].forEach(function(x) { B(e3, M(0xf2f2f2), x, topY + 0.012, 0, 0.1, 0.012, bodyL * 0.98); });
        // Коробка: 1 — задний диффузор, 2 — буксировочный крюк, 3 — золотая шестерня на решётке
        const g1 = U('gearbox', 1);
        for (let i = 0; i < 4; i++) B(g1, black, -0.3 + i * 0.2, 0.16, rearZ + 0.08, 0.04, 0.12, 0.18);
        const g2 = U('gearbox', 2);
        B(g2, red, bodyW * 0.3, 0.2, frontZ - 0.12, 0.08, 0.08, 0.12);
        const g3 = U('gearbox', 3);
        const gear = new THREE_REF.Mesh(new THREE_REF.TorusGeometry(0.07, 0.025, 6, 10), M(0xe8c040, { metalness: 0.9, roughness: 0.25 }));
        gear.position.set(0, (isJeep ? bodyY + 0.02 : 0.42), frontZ - 0.06); g3.add(gear);
        // Шины: 1 — шире, 2 — грубый протектор, 3 — красные гоночные диски
        U('tires', 1); // ширину задаёт applyUpgradeVisuals
        const t2 = U('tires', 2);
        wheelMeshes.forEach(function(w) {
            for (let i = 0; i < 10; i++) {
                const a = i / 10 * Math.PI * 2;
                const lug = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.3, 0.05, 0.06), black);
                lug.position.set(w.x, w.y + Math.sin(a) * wheelR, w.z + Math.cos(a) * wheelR);
                lug.rotation.x = -a;
                t2.add(lug);
            }
        });
        const t3 = U('tires', 3);
        wheelMeshes.forEach(function(w) {
            const rim = new THREE_REF.Mesh(new THREE_REF.TorusGeometry(wheelR * 0.62, 0.025, 6, 16), red);
            rim.rotation.y = Math.PI / 2;
            rim.position.set(w.x + Math.sign(w.x) * 0.16, w.y, w.z);
            t3.add(rim);
        });
        // Броня: 1 — кенгурятник, 2 — боковые листы с заклёпками, 3 — решётки на стёклах и дуги на крыше
        const a1 = U('armor', 1);
        [-0.35, 0.35].forEach(function(x) { C(a1, steel, 0.04, 0.04, 0.6, x * bodyW, 0.37, frontZ - 0.2); });
        C(a1, steel, 0.04, 0.04, bodyW * 0.8, 0, 0.66, frontZ - 0.2, 0, Math.PI / 2);
        C(a1, steel, 0.04, 0.04, bodyW * 0.8, 0, 0.1, frontZ - 0.22, 0, Math.PI / 2); // под номером, не поперёк него
        const a2 = U('armor', 2);
        [-1, 1].forEach(function(sx) {
            B(a2, steel, sx * (bodyW * 0.5 + 0.03), bodyY - 0.02, 0, 0.03, bodyH * 0.6, bodyL * 0.5);
            for (let i = 0; i < 5; i++) B(a2, chrome, sx * (bodyW * 0.5 + 0.05), bodyY + 0.07, -bodyL * 0.2 + i * bodyL * 0.1, 0.02, 0.03, 0.03);
        });
        const a3 = U('armor', 3);
        for (let i = 0; i < 4; i++) B(a3, steel, -bodyW * 0.27 + i * bodyW * 0.18, cabinY, cabinZ - cabinLen * 0.5 - 0.06, 0.025, cabinH * 0.7, 0.025);
        [-1, 1].forEach(function(sx) { C(a3, steel, 0.03, 0.03, cabinLen, sx * bodyW * 0.38, cabinY + cabinH * 0.5 + 0.1, cabinZ, Math.PI / 2); });
        // Нитро: 1 — два баллона сзади, 2 — синий шланг и надпись N2O по бокам, 3 — светящиеся выхлопы
        const n1 = U('nitro', 1);
        [-0.18, 0.18].forEach(function(x) {
            // два баллона рядом с зазором (раньше входили друг в друга) и хромовые хомуты вокруг
            // у хэтчбека сзади наклонное стекло — баллоны на крыше
            const ny = isHatch ? cabinY + cabinH * 0.5 + 0.14 : topY + (isJeep ? 0.12 : 0.1), nz = isHatch ? cabinZ - 0.1 : rearZ - 0.3;
            C(n1, blue, 0.08, 0.08, 0.3, x, ny, nz, 0, Math.PI / 2);
            [-0.08, 0.08].forEach(function(dx) { B(n1, chrome, x + dx, ny, nz, 0.03, 0.175, 0.175); });
        });
        const n2 = U('nitro', 2);
        [-1, 1].forEach(function(sx) {
            const ny = isSport ? bodyY - 0.06 : bodyY + 0.05; // у «Волги» выше идёт шашечный молдинг
            B(n2, blue, sx * (bodyW * 0.5 + 0.016), ny, bodyL * 0.1, 0.01, 0.09, bodyL * 0.29); // ни одна грань не совпадает с бронёй и молдингом
            B(n2, M(0xffffff), sx * (bodyW * 0.5 + 0.022), ny, bodyL * 0.1, 0.004, 0.04, bodyL * 0.12);
        });
        const n3 = U('nitro', 3);
        [-0.3, 0.3].forEach(function(x) {
            C(n3, chrome, 0.05, 0.05, 0.18, x, 0.22, rearZ + 0.1, Math.PI / 2);
            const glow = new THREE_REF.Mesh(new THREE_REF.CircleGeometry(0.04, 12), blueGlow);
            glow.position.set(x, 0.22, rearZ + 0.2);
            n3.add(glow);
        });
    }

    group.userData.carId = carId;
    group.userData.dims = { bodyL: bodyL, bodyY: bodyY, bodyW: bodyW };
    return { group, parts, bodyMat, upgrades };
}

/**
 * Пламя нитро из выхлопа (сзади машины, +Z): голубой конус с жёлтым ядром.
 * Возвращает { group, update(t, on) } — on: нитро включено; t — время для мерцания.
 */
export function addNitroFlames(car) {
    const d = (car.userData && car.userData.dims) || { bodyL: 2.25, bodyY: 0.42, bodyW: 1.22 };
    const g = new THREE.Group();
    const outerMat = new THREE.MeshBasicMaterial({ color: 0x3aa8ff, transparent: true, opacity: 0.75, depthWrite: false, blending: THREE.AdditiveBlending });
    const coreMat = new THREE.MeshBasicMaterial({ color: 0xffb040, transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending });
    const cones = [];
    [-0.32, 0.32].forEach(function(x) {
        const outer = new THREE.Mesh(new THREE.ConeGeometry(0.16, 1.0, 10), outerMat);
        outer.rotation.x = Math.PI / 2;
        outer.position.set(x, d.bodyY - 0.12, d.bodyL / 2 + 0.55);
        const core = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.55, 8), coreMat);
        core.rotation.x = Math.PI / 2;
        core.position.set(x, d.bodyY - 0.12, d.bodyL / 2 + 0.33);
        g.add(outer); g.add(core);
        cones.push(outer, core);
    });
    g.visible = false;
    car.add(g);
    return {
        group: g,
        update: function(t, on) {
            g.visible = !!on;
            if (!on) return;
            for (let i = 0; i < cones.length; i++) {
                const k = 0.8 + Math.abs(Math.sin(t * 38 + i * 1.7)) * 0.45;
                cones[i].scale.set(1, k, 1);
            }
        }
    };
}
