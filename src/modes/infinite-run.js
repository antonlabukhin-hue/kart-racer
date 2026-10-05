/**
 * Режим «Бесконечная трасса» в заезде: всё, что main.js раньше держал внутри initGame —
 * план кругов (src/infinite.js) и узоры (src/patterns.js), уборка позади, «горячий старт», погоня ГАИ, цели на дороге,
 * события пейзажей, «В УДАРЕ», «Разгон», смена пейзажа и рост сложности по километрам.
 *
 * Общий движок заезда (физика, попутки, звери, подборы, HUD) остаётся в main.js; связь — объект ctx:
 *   ctx.scene, ctx.START_Z, ctx.TRACK_WIDTH, ctx.span (длина круга расстановки),
 *   списки заезда: ctx.lists = { obstacles, collectibles, ramps, cars, gapCones, smashBoards, gaps, debrisZones, roadSegments, setEvents },
 *   ctx.busy (зоны постановочных участков), ctx.arch (арки с падающим грузом),
 *   фабрики: ctx.make = { eChip(x, y, z), vhs(x, y, z), power(x, z, type), obstacle(z, type), collectible(z, kind), car(z, lane) },
 *   состояние заезда — геттеры: z, x, speed, strikes, state, stats, risk, powers, headstartTo, maxSpeed, nitro, animals, snowfall, chunks,
 *   ctx.addNitro(sec), ctx.setRamp({ speedK, laneK, trafficK }), ctx.setTheme(theme), ctx.startLap(k, easy) → генератор расстановки круга,
 *   показ: ctx.plaque(t, s, cls), ctx.story(t), ctx.popup(t), ctx.say(id); игрок: ctx.player, ctx.carPreset; ctx.online — грузить мировую таблицу.
 *   ctx.seed — сид раскладки (одинаковый сид — одинаковая трасса: «Заезд дня», вызов другу), ctx.rule — условие «Заезда дня» (src/daily-run.js),
 *   ctx.fair — честный заезд (день, вызов): без «горячего старта»; ctx.rival — { name, dist } друга из вызова — цель на дороге.
 */
import * as THREE from 'three';
import { themeAt, rampAt, planStretch, weekTheme, warmStart, seededRnd, withRandom } from '../infinite.js';
import { placePlan } from '../plan-place.js';
import { wordState } from '../word-day.js';
import { dayKey } from '../streak.js';
import { chaseTargets } from '../rival-chase.js';
import { loadBoard, topRuns } from '../leaderboard.js';
import { fetchTop } from '../online-board.js';
import { createPolice } from '../police-chase.js';
import { createRoadGoals } from '../road-goals.js';
import { createThemeEvents } from '../theme-events.js';
import { createRingChain, renderSpeedLines, speedLinesK } from '../juice.js';
import { feverHold, renderFeverFx } from '../fever.js';
import { riskEvent, FEVER_TIME } from '../risk-combo.js';
import { tickPowers, activePowers } from '../powerups.js';
import { renderPowerHud } from '../ui/second-chance.js';
import { HEADSTART_M } from '../ui/boosts.js';
import { createInfWorld, disposeTree } from '../inf-world.js';
import * as Decor from '../decor.js';
import { pickMeme, createSideMeme, decorateMemeCar, MEME_EVERY, MEMES } from '../memes.js';
import { buildShowroomCar } from '../cars.js';

const LX = [-2, 0, 2];
const LAP_MAPS = ['arsenev', 'promzona', 'svalka'];
const MEME_CAR_SCALE = 0.62; // как машина игрока (RACE_CAR_SCALE в main.js)

export function createInfiniteRun(ctx) {
    const scene = ctx.scene, START_Z = ctx.START_Z, L = ctx.lists, make = ctx.make;
    const player = ctx.player;
    const word = player ? wordState(player, dayKey(new Date())) : {}; // «Слово дня» (src/word-day.js)
    const me = player ? player.name : '', best = player && player.infinite ? player.infinite.best || 0 : 0;
    const rule = ctx.rule || {};
    const warm = rule.warm != null ? rule.warm : ctx.fair ? 0 : warmStart(best); // «горячий старт»: сложность — от рекорда (в честном заезде — нет)
    const weekTh = weekTheme().theme; // пейзаж недели: «Е» за две
    const patEnds = [], patHit = new Set(); // узоры: где кончаются и какие задеты
    const roots = [], box = new THREE.Box3(); // объекты кругов в сцене — для уборки позади
    const police = createPolice(scene, function() { ctx.say('police'); }, function() { const s = ctx.stats; s.escapes = (s.escapes || 0) + 1; });
    // цели «До соперника N м»: таблица устройства и соперники сразу, мировая — когда придёт с сервера
    const withRival = function(t) { return ctx.rival ? t.concat([{ name: ctx.rival.name, dist: ctx.rival.dist }]).sort(function(a, b) { return a.dist - b.dist; }) : t; }; // друг из вызова — тоже цель
    const chase = player ? { targets: withRival(chaseTargets(topRuns(loadBoard(), 'all', Date.now(), me), me, best)), passed: new Set() } : null;
    if (chase && ctx.online) fetchTop('all').then(function(list) { if (list) chase.targets = withRival(chaseTargets(topRuns(list.concat(loadBoard()), 'all', Date.now(), me), me, best)); });
    const roadGoals = chase ? createRoadGoals(scene, START_Z, ctx.TRACK_WIDTH, function() { return chase.targets; }) : null;
    const ringChain = createRingChain();
    const themeEv = createThemeEvents({
        scene: scene, LX: LX, obstacles: L.obstacles, cars: L.cars,
        get fog() { return scene.fog; }, get bg() { return scene.background; }, get lights() { return ctx.lights; },
        strikes: function() { return ctx.strikes; }, zAhead: function(dd) { return ctx.z - dd; },
        plaque: function(a, b, c) { ctx.plaque(a, b, c); },
        addObstacle: function(type, x, z, label) { const c = make.obstacle(z, type); c.x = x; c.mesh.position.x = x; c.label = label; L.obstacles.push(c); return c; },
        addCar: function(z, lane) { const c = make.car(z, lane); L.cars.push(c); return c; },
        removeCar: function(c) { const i = L.cars.indexOf(c); if (i >= 0) L.cars.splice(i, 1); scene.remove(c.mesh); },
        addAnimal: function(type, z, left) { const sp = ctx.animals; sp._planFromLeft = left; sp.animals.push(sp.createAnimal(z, type)); },
        addE: function(x, z, n) { for (let i = 0; i < n; i++) L.collectibles.push(make.eChip(x, 0.6, z - i * 2.2)); },
        scrap: function() { return Decor.createScrapPile(0, 0, 0.45); },
        reward: function(e) { const s = ctx.stats; s.eChips = (s.eChips || 0) + e; s.themeEvents = (s.themeEvents || 0) + 1; riskEvent(ctx.risk, 'pattern'); }
    });
    let world = null, theme = null, headShown = false, warmShown = false, feverOn = false;
    let lapK = 0, frame = 0, stage = 0, fresh = [], gen = null, genRnd = null;
    // мем-моменты 90-х (src/memes.js): попутка с коровой или шкафом, бабка с тележкой, рыбак, гаишник — раз в 475–775 м
    let nextMeme = 375 + Math.random() * 250, lastMeme = null;
    const memeWalkers = [];
    function spawnMeme(d, forcedId) {
        const m = (forcedId && MEMES.find(function(x) { return x.id === forcedId; })) || pickMeme(lastMeme, Math.random, !!ctx.fair); lastMeme = m.id;
        const z = START_Z - d;
        if (m.kind === 'car') {
            const lane = Math.floor(Math.random() * 3), c = make.car(z, lane);
            scene.remove(c.mesh);
            const g = buildShowroomCar(m.car).group;
            decorateMemeCar(g, m.id);
            g.scale.setScalar(MEME_CAR_SCALE);
            g.position.copy(c.mesh.position);
            scene.add(g);
            Object.assign(c, { mesh: g, kind: 'meme_' + m.id, hitW: 0.8, hitL: 1.8, speed: 0.02 + Math.random() * 0.01 });
            L.cars.push(c);
            return g;
        }
        const side = Math.random() < 0.5 ? -1 : 1;
        const g = createSideMeme(m.id);
        g.position.set(side * (ctx.TRACK_WIDTH / 2 + 1.1), 0, z);
        g.scale.setScalar(1.35); // крупнее — чтобы заметить на скорости
        // бабка идёт по обочине навстречу; рыбак и гаишник — лицом к дороге
        g.rotation.y = m.id === 'babka' ? 0 : (side < 0 ? Math.PI / 2 : -Math.PI / 2);
        scene.add(g); track([g]);
        if (m.id === 'babka') memeWalkers.push(g);
        return g;
    }

    /** План круга k → предметы в сцене и списках заезда (мимо постановочных участков; узор — целиком или никак) */
    function planLap(k) {
        const d0 = k * ctx.span;
        // vhsMul — от пресета, не ABILITY: план круга 0 строится раньше её объявления
        const rnd = ctx.seed ? seededRnd((ctx.seed ^ Math.imul(k + 1, 0x9E3779B1)) >>> 0) : Math.random; // по сиду — одна и та же трасса
        const plan = planStretch(d0 + (k ? 0 : 70), d0 + ctx.span, rnd, { slide: 'slide', nextGap: Infinity,
            vhsMul: (ctx.carPreset.ability && ctx.carPreset.ability.id === 'lucky') ? 2 : 1, letters: !!word.next, warm: warm, patId: k * 1000 }).items;
        placePlan(plan, { scene: scene, START_Z: START_Z, lists: L, make: make, busy: ctx.busy, arch: ctx.arch, noNitro: rule.noNitro,
            slideOf: function(d) { return rule.slide || themeAt(d).theme.slide; },
            letter: function() { return wordState(player, dayKey(new Date())).next; },
            onPatEnd: function(z, pat) { patEnds.push({ z: z, pat: pat }); } });
    }
    function track(list) {
        list.forEach(function(o) { box.setFromObject(o); if (!box.isEmpty()) roots.push([o, box.min.z]); });
    }
    /** Позади машины: объекты кругов — из сцены и из списков заезда */
    function prune(zb) {
        for (let i = roots.length - 1; i >= 0; i--) {
            if (roots[i][1] <= zb) continue;
            const o = roots[i][0];
            scene.remove(o); disposeTree(o);
            roots.splice(i, 1);
        }
        const cut = function(a, key) { for (let i = a.length - 1; i >= 0; i--) if (a[i][key] > zb) a.splice(i, 1); };
        cut(L.obstacles, 'z'); cut(L.collectibles, 'z'); cut(L.ramps, 'z'); cut(L.gapCones, 'z'); cut(L.smashBoards, 'z');
        cut(L.gaps, 'zFar'); cut(L.debrisZones, 'z'); cut(L.roadSegments, 'z1'); cut(L.setEvents, 'infZ');
        if (ctx.chunks) ctx.chunks.prune(zb);
    }
    // шаг стройки круга: что он добавил в сцену — в список нового (удаления в этом же кадре индексы не сбивают)
    function step(fn) {
        const had = new Set(scene.children);
        const r = fn();
        scene.children.forEach(function(o) { if (!had.has(o)) fresh.push(o); });
        return r;
    }

    const run = {
        police: police, chase: chase, patHit: patHit, weekTh: weekTh, ringChain: ringChain, warm: warm, roadGoals: roadGoals, themeEv: themeEv,
        get world() { return world; },
        get theme() { return theme; },
        /** Первый круг: m0 — сколько детей было в сцене до его постановочных участков */
        firstLap: function(m0) { planLap(0); track(scene.children.slice(m0)); },
        /** Мир вокруг дороги (src/inf-world.js): o — { rig, ground, hills, lite } */
        startWorld: function(o) {
            world = createInfWorld({ scene: scene, startZ: START_Z, trackWidth: ctx.TRACK_WIDTH, rig: o.rig, ground: o.ground, hills: o.hills, lights: ctx.lights, lite: o.lite });
            world.tick(ctx.z, true);
            return world;
        },
        /** Плотность зверей по километрам — для src/animals.js densityFn */
        animalDensity: function() { return rampAt(world ? world.dist : 0, warm).animals * (rule.animalMul || 1); },
        rule: rule,
        /** Узор задет (препятствие с it.pat не перепрыгнуто) */
        hitPattern: function(id) { patHit.add(id); },
        /** Мем впереди на ahead м (тесты и скриншоты): id из src/memes.js MEMES */
        spawnMeme: function(id, ahead) { return spawnMeme((world ? world.dist : 0) + ahead, id); },
        /** Каждый кадр заезда */
        tick: function(dt) {
            const t = world.tick(ctx.z), d = world.dist, stats = ctx.stats, risk = ctx.risk, powers = ctx.powers, z = ctx.z;
            themeEv.tick(d, z, dt);
            if (roadGoals) roadGoals.tick(d);
            tickPowers(powers, dt);
            renderPowerHud(activePowers(powers));
            police.tick(dt, ctx.x, z);
            const head = ctx.headstartTo;
            if (warm && !warmShown && !head && d > 25) { warmShown = true; try { ctx.plaque('🔥 ГОРЯЧИЙ СТАРТ', 'Трасса сразу как на ' + warm + ' м — ты уже опытный', 'crate-good'); } catch (e) {} }
            // узор пройден, ничего не задев, — «чисто» (перескок далеко вперёд — нет)
            while (patEnds.length && z < patEnds[0].z) {
                const pe = patEnds.shift();
                if (!patHit.has(pe.pat) && ctx.state === 'racing' && z > pe.z - 30) {
                    stats.patterns = (stats.patterns || 0) + 1;
                    const rv = riskEvent(risk, 'pattern');
                    try { ctx.popup('✔ Чисто! ×' + rv.mult); } catch (e) {}
                }
            }
            // «В УДАРЕ» (src/fever.js) и сочность (src/juice.js)
            const fv = feverHold(risk, powers);
            if (fv) ctx.addNitro(fv);
            renderFeverFx(risk);
            renderSpeedLines(speedLinesK(ctx.speed / ctx.maxSpeed, ctx.nitro > 0, risk.fever > 0));
            if ((risk.fever > 0) !== feverOn) {
                feverOn = risk.fever > 0;
                if (feverOn) {
                    stats.fevers = (stats.fevers || 0) + 1;
                    try { ctx.plaque('🔥 В УДАРЕ!', 'Множитель ×5: ' + FEVER_TIME + ' с неуязвим — сноси всё, «Е» сами летят', 'crate-good'); if (window.soundEngine) window.soundEngine.playSfx('fanfare', 0.8); } catch (e) {}
                }
            }
            // «Разгон» (src/ui/boosts.js): первые метры на нитро
            if (head && d < head) {
                ctx.addNitro(0.25);
                if (!headShown) { headShown = true; try { ctx.plaque('🚀 РАЗГОН!', HEADSTART_M + ' м на нитро — удары не считаются', 'crate-good'); } catch (e) {} }
            }
            // смена пейзажа
            if (t.theme !== theme) {
                theme = t.theme;
                ctx.setTheme(theme); // без надписи о смене пейзажа и наступлении ночи — их и так видно
                if (theme === weekTh) { try { ctx.plaque('💰 ПЕЙЗАЖ НЕДЕЛИ', theme.name + ': каждая «Е» за две', 'crate-good'); } catch (e) {} }
            }
            // сложность по километрам
            const rp = rampAt(d, warm);
            ctx.setRamp({ speedK: rp.speed * (rule.speedMul || 1), laneK: Math.max(0, Math.min(1, (d + warm - 700) / 2500)), trafficK: rp.trafficSpeed,
                maxAnimals: Math.round(rp.maxAnimals * (rule.animalMul || 1)), animalSpeed: rp.animalSpeed, traffic: Math.round(rp.traffic * (rule.trafficMul || 1)) + (rule.trafficAdd || 0) });
            // следующий круг расстановки — за 450 ед. до его начала (дальше тумана); по шагу за кадр — без рывка
            const k = Math.floor((d + 450) / ctx.span);
            if (gen) {
                if (step(function() { return genRnd ? withRandom(genRnd, function() { return gen.next().done; }) : gen.next().done; })) { gen = null; stage = 1; }
            } else if (stage === 1) {
                step(function() { planLap(lapK); });
                stage = 2;
            } else if (stage === 2) {
                const list = fresh.filter(function(o) { return o.parent === scene; });
                track(list);
                if (ctx.chunks) ctx.chunks.adopt(list);
                fresh = []; stage = 0;
            } else if (k > lapK) {
                lapK = k;
                genRnd = ctx.seed ? seededRnd((ctx.seed ^ Math.imul(k + 7, 0x85EBCA6B)) >>> 0) : null; // постановочные участки — тоже по сиду
                gen = ctx.startLap(k, LAP_MAPS[k % 3], k < 2 && !warm ? 'easy' : 'medium'); // первые круги — лёгкая расстановка
            }
            // мемы: следующий — за 170 м впереди (до тумана), не над разломом
            if (d + 170 > nextMeme) {
                if (!L.gaps.some(function(g) { const gd = START_Z - g.zNear; return nextMeme > gd - 25 && nextMeme < gd + 20; })) spawnMeme(nextMeme);
                nextMeme += MEME_EVERY[0] + Math.random() * (MEME_EVERY[1] - MEME_EVERY[0]);
            }
            for (let i = memeWalkers.length - 1; i >= 0; i--) {
                const w = memeWalkers[i];
                if (!w.parent) { memeWalkers.splice(i, 1); continue; }
                w.position.z += 0.9 * dt; w.position.y = Math.abs(Math.sin(w.position.z * 6)) * 0.03; // шаркает навстречу
            }
            if (++frame % 60 === 0) prune(z + 70);
        }
    };
    return run;
}
