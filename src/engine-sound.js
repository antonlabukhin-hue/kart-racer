/**
 * Звук двигателя: синтез «как у настоящего мотора» вместо одного пищащего пилообразного тона.
 * Как устроено в гоночных играх: обороты (RPM) ведут звук, а не скорость; внутри передачи обороты растут,
 * при переключении — короткий сброс газа и падение оборотов; высота тона = частота вспышек в цилиндрах
 * (обороты/60 × цилиндры/2), а «характер» мотора — в гармониках, неровности вспышек, шуме сгорания и резонансе выхлопа.
 * В AAA так делают на записях (кроссфейд петель по оборотам), здесь — то же поведение синтезом, без файлов:
 *   основной тон — волна с богатыми гармониками на частоте вспышек;
 *   «бубнёж» — полутон (f/2) — у больших V8 его много, у мопеда нет;
 *   шум сгорания — шум, пульсирующий с частотой вспышек (то самое «тарахтение»);
 *   неровность — лёгкое дрожание частоты (у старых моторов больше);
 *   выхлоп — резонанс на частоте профиля (большая машина — ниже), фильтр открывается с оборотами и газом;
 *   турбо — свист с наддувом, электро — вой без вспышек.
 * Профили машин — ENGINE_PROFILES (большие ниже, мопед и мотоциклы выше). Логика оборотов — чистая (с тестами).
 */

/** cyl — цилиндры, idle/red — холостые и отсечка, sub — доля полутона, rough — неровность, exh — резонанс выхлопа (Гц) */
export const ENGINE_PROFILES = {
    _default: { cyl: 4, idle: 850, red: 6000, sub: 0.25, rough: 0.35, exh: 220 },
    cheburashka: { cyl: 4, idle: 950, red: 5800, sub: 0.2, rough: 0.6, exh: 260 },   // воздушный V4 — тарахтит
    gorbaty: { cyl: 4, idle: 1000, red: 6000, sub: 0.15, rough: 0.65, exh: 300 },
    kirpich: { cyl: 4, idle: 850, red: 5600, sub: 0.3, rough: 0.35, exh: 190 },
    turbo: { cyl: 4, idle: 800, red: 5600, sub: 0.3, rough: 0.25, exh: 180, turbo: 1 },
    pirozhok: { cyl: 4, idle: 850, red: 5600, sub: 0.25, rough: 0.45, exh: 220 },
    saray: { cyl: 4, idle: 780, red: 5000, sub: 0.35, rough: 0.45, exh: 180 },
    gazel: { cyl: 4, idle: 720, red: 4600, sub: 0.45, rough: 0.35, exh: 140 },
    rafik: { cyl: 4, idle: 780, red: 4900, sub: 0.4, rough: 0.4, exh: 165 },
    buhanka: { cyl: 4, idle: 700, red: 4400, sub: 0.5, rough: 0.5, exh: 130 },
    shestisot: { cyl: 12, idle: 650, red: 6000, sub: 0.1, rough: 0.05, exh: 150 },   // V12 — гладкий и низкий
    raketa: { cyl: 4, idle: 1000, red: 7800, sub: 0.15, rough: 0.2, exh: 290 },
    thief: { cyl: 6, idle: 800, red: 7000, sub: 0.25, rough: 0.15, exh: 210 },
    neon: { cyl: 4, idle: 1000, red: 8500, sub: 0.1, rough: 0.15, exh: 330, turbo: 1 },
    bull: { cyl: 8, idle: 650, red: 5400, sub: 0.7, rough: 0.3, exh: 105 },          // большой V8 — бубнит
    cyborg: { cyl: 6, idle: 900, red: 7500, sub: 0.2, rough: 0.1, exh: 240, turbo: 1 },
    avenger: { cyl: 8, idle: 700, red: 6500, sub: 0.75, rough: 0.35, exh: 115 },
    trike: { cyl: 2, idle: 1100, red: 8500, sub: 0.35, rough: 0.55, exh: 250 },       // мотоциклетный V2
    ghostcar: { cyl: 8, idle: 700, red: 6200, sub: 0.6, rough: 0.25, exh: 125 },
    moped: { cyl: 2, idle: 1600, red: 9500, sub: 0, rough: 0.7, exh: 420 },           // двухтактный мопед — вспышка каждый оборот (как 2 цилиндра) — высокий «тр-р-р»
    chariot: { cyl: 6, idle: 800, red: 6500, sub: 0.3, rough: 0.2, exh: 170 },
    timecar: { cyl: 6, idle: 800, red: 6500, sub: 0.3, rough: 0.2, exh: 180 },
    carpet: { cyl: 4, idle: 1200, red: 9000, sub: 0, rough: 0, exh: 400, elec: 1 },   // ковёр-самолёт — волшебный вой
    zubilo: { cyl: 4, idle: 900, red: 6500, sub: 0.2, rough: 0.35, exh: 240 },
    mechta: { cyl: 4, idle: 850, red: 6200, sub: 0.25, rough: 0.3, exh: 220 }
};

export function engineProfile(carId) { return ENGINE_PROFILES[carId] || ENGINE_PROFILES._default; }

/** Пороги передач — те же, что в main.js (там щелчок переключения) */
export const GEAR_EDGES = [0, 0.06, 0.18, 0.34, 0.52, 0.72, 1.0];
/** С каких оборотов (доля отсечки) начинается передача: высокие передачи — выше (меньше провал) */
const GEAR_FLOOR = [0, 0.38, 0.5, 0.56, 0.6, 0.64];

/** Целевые обороты: n — доля макс. скорости 0..1, gear 0..5 */
export function targetRpm(n, gear, prof) {
    const p = prof || ENGINE_PROFILES._default;
    if (n < 0.005) return p.idle;
    const g = Math.max(0, Math.min(5, gear | 0));
    const g0 = GEAR_EDGES[g], g1 = GEAR_EDGES[g + 1];
    const inG = Math.max(0, Math.min(1, (n - g0) / (g1 - g0)));
    if (g === 0) return p.idle + inG * (p.red * 0.55 - p.idle);
    const lo = p.red * GEAR_FLOOR[g], hi = p.red * (g === 5 ? 0.97 : 0.92);
    return lo + inG * (hi - lo);
}

/** Частота вспышек (Гц): обороты/60 × цилиндры/2 (четырёхтакт) */
export function firingHz(rpm, cyl) { return Math.max(14, rpm / 60 * Math.max(1, cyl) / 2); }

/**
 * Обороты догоняют цель: вверх — с инерцией мотора, вниз (переключение) — быстро.
 * Возвращает новые обороты.
 */
export function stepRpm(rpm, target, dt) {
    const k = target > rpm ? 7 : 16;
    return rpm + (target - rpm) * (1 - Math.exp(-k * Math.max(0, dt)));
}

/** Гармоники основного тона: сильная основа + убывающий ряд, чётные чуть тише (как у пульсирующего выхлопа) */
function engineWave(ctx, elec) {
    const N = 24, re = new Float32Array(N + 1), im = new Float32Array(N + 1);
    for (let h = 1; h <= N; h++) im[h] = elec ? (h === 1 ? 1 : h === 2 ? 0.35 : h === 4 ? 0.12 : 0) : Math.pow(h, -0.85) * (h % 2 ? 1 : 0.7);
    return ctx.createPeriodicWave(re, im);
}

function noiseBuf(ctx) {
    const len = ctx.sampleRate, b = ctx.createBuffer(1, len, ctx.sampleRate), d = b.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) { last = (last + 0.08 * (Math.random() * 2 - 1)) / 1.08; d[i] = last * 3; } // «коричневатый» шум — гул, не шипение
    return b;
}

function shaperCurve(drive) {
    const n = 1024, c = new Float32Array(n);
    for (let i = 0; i < n; i++) { const x = i / (n - 1) * 2 - 1; c[i] = Math.tanh(x * drive) / Math.tanh(drive); }
    return c;
}

/**
 * Запасной простой мотор (два осциллятора, как раньше): если полный голос на устройстве не заработал.
 * Тот же интерфейс { set(rpm, load), stop() }; частота — от оборотов, без автоматизаций с накоплением.
 */
export function createSimpleVoice(ctx, out, prof) {
    const p = prof || ENGINE_PROFILES._default;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.connect(out);
    const o1 = ctx.createOscillator(); o1.type = 'sawtooth';
    const o2 = ctx.createOscillator(); o2.type = 'square';
    const g2 = ctx.createGain(); g2.gain.value = 0.4;
    o1.connect(lp); o2.connect(g2); g2.connect(lp);
    o1.start(); o2.start();
    let last = -1;
    return {
        prof: p, simple: true,
        set: function(rpm) {
            const now = ctx.currentTime;
            if (now - last < 0.033) return;
            last = now;
            const f = Math.max(40, Math.min(420, firingHz(rpm, p.cyl) * (p.cyl >= 8 ? 0.6 : 1.1)));
            o1.frequency.setValueAtTime(f, now); o2.frequency.setValueAtTime(f * 0.5, now);
            lp.frequency.setValueAtTime(Math.min(2600, 350 + f * 4), now);
        },
        stop: function() { [o1, o2].forEach(function(o) { try { o.stop(); } catch (e) {} }); [o1, o2, g2, lp].forEach(function(n) { try { n.disconnect(); } catch (e) {} }); }
    };
}

/**
 * Плавно к значению v. В игре — без накопления событий автоматизации: на iPhone (WebKit) каждое setTargetAtTime
 * остаётся в очереди параметра, 30–60 вызовов в секунду за заезд — тысячи событий: звук заикается («пикает»),
 * память растёт, вкладку выкидывает. Поэтому: сброс очереди → текущее значение → короткий линейный переход (2 события).
 * live = false — запись демо (OfflineAudioContext): там можно setTargetAtTime по времени.
 */
export function glide(param, v, now, tc, live) {
    if (!isFinite(v)) return;
    if (!live) { param.setTargetAtTime(v, now, tc); return; }
    try {
        param.cancelScheduledValues(now);
        param.setValueAtTime(param.value, now);
        param.linearRampToValueAtTime(v, now + tc * 2);
    } catch (e) { try { param.value = v; } catch (e2) {} }
}

/**
 * Голос мотора: граф Web Audio в out (GainNode). voice.set(rpm, load, prof) — каждый кадр; voice.stop().
 * load 0..1 — газ (разгон громче и «грязнее», сброс газа — тише и глуше).
 */
export function createEngineVoice(ctx, out, prof, opts) {
    const p = prof || ENGINE_PROFILES._default, lite = !!(opts && opts.lite); // lite — телефон: меньше узлов, без «дрожания» и свиста
    const t = ctx.currentTime, nodes = [];
    const mk = function(n) { nodes.push(n); return n; };
    const mix = mk(ctx.createGain()); mix.gain.value = 1;
    const shaper = mk(ctx.createWaveShaper()); shaper.curve = shaperCurve(1.6); shaper.oversample = lite ? 'none' : '2x';
    const exh = mk(ctx.createBiquadFilter()); exh.type = 'peaking'; exh.frequency.value = p.exh; exh.Q.value = 1.1; exh.gain.value = 7;
    const lp = mk(ctx.createBiquadFilter()); lp.type = 'lowpass'; lp.Q.value = 0.7; lp.frequency.value = 900;
    const hp = mk(ctx.createBiquadFilter()); hp.type = 'highpass'; hp.frequency.value = 35;
    mix.connect(shaper); shaper.connect(exh); exh.connect(lp); lp.connect(hp); hp.connect(out);

    const f0 = firingHz(p.idle, p.cyl);
    const main = mk(ctx.createOscillator()); main.setPeriodicWave(engineWave(ctx, p.elec)); main.frequency.value = f0;
    const gMain = mk(ctx.createGain()); gMain.gain.value = 0.55;
    main.connect(gMain); gMain.connect(mix);

    const sub = mk(ctx.createOscillator()); sub.type = 'triangle'; sub.frequency.value = f0 / 2;
    const gSub = mk(ctx.createGain()); gSub.gain.value = 0.5 * (p.sub || 0);
    sub.connect(gSub); gSub.connect(mix);

    // шум сгорания, пульсирующий с частотой вспышек
    const noise = mk(ctx.createBufferSource()); noise.buffer = ctx.__engNoise || (ctx.__engNoise = noiseBuf(ctx)); noise.loop = true;
    const bp = mk(ctx.createBiquadFilter()); bp.type = 'bandpass'; bp.Q.value = 0.9; bp.frequency.value = f0 * 3;
    const gNoise = mk(ctx.createGain()); gNoise.gain.value = p.elec ? 0 : 0.18;
    const pulse = mk(ctx.createOscillator()); pulse.type = 'sine'; pulse.frequency.value = f0;
    const gPulse = mk(ctx.createGain()); gPulse.gain.value = p.elec ? 0 : 0.16;
    pulse.connect(gPulse); gPulse.connect(gNoise.gain);
    noise.connect(bp); bp.connect(gNoise); gNoise.connect(mix);

    // неровность вспышек: два медленных «дрожания» частоты
    let lfoA = null, lfoB = null, gJit = null;
    if (!lite) {
        lfoA = mk(ctx.createOscillator()); lfoA.frequency.value = 5.3;
        lfoB = mk(ctx.createOscillator()); lfoB.frequency.value = 8.7;
        gJit = mk(ctx.createGain()); gJit.gain.value = 0;
        lfoA.connect(gJit); lfoB.connect(gJit); gJit.connect(main.frequency); gJit.connect(pulse.frequency);
    }

    // турбо-свист / электро-вой
    let whine = null, gWhine = null;
    if (!lite && (p.turbo || p.elec)) {
        whine = mk(ctx.createOscillator()); whine.type = 'sine'; whine.frequency.value = 1200;
        gWhine = mk(ctx.createGain()); gWhine.gain.value = 0;
        whine.connect(gWhine); gWhine.connect(hp);
    }
    [main, sub, noise, pulse, lfoA, lfoB, whine].forEach(function(o) { if (o) o.start(t); });

    const tc = 0.025;
    let lastSet = -1;
    return {
        prof: p,
        /** at — время для записи без проигрывания (демо); в игре — не чаще 30 раз в секунду */
        set: function(rpm, load, at) {
            const live = at == null, now = live ? ctx.currentTime : at;
            if (live && now - lastSet < 0.033) return;
            lastSet = now;
            const f = firingHz(rpm, p.cyl), rn = Math.max(0, Math.min(1, rpm / p.red)), L = Math.max(0, Math.min(1, load));
            const g = function(param, v, k) { glide(param, v, now, k || tc, live); };
            g(main.frequency, f); g(pulse.frequency, f); g(sub.frequency, f / 2);
            g(bp.frequency, Math.min(4000, f * 3 + 200));
            if (gJit) g(gJit.gain, f * 0.012 * (p.rough || 0) * (1.2 - rn), 0.08);
            // под газом — ярче и громче шум, без газа — глухо
            g(lp.frequency, Math.min(7000, 500 + rn * 2600 + L * 1800));
            g(gNoise.gain, p.elec ? 0 : 0.1 + 0.2 * L);
            g(gMain.gain, 0.45 + 0.2 * L);
            if (whine) { g(whine.frequency, p.elec ? f * 6 : 900 + rn * 2600); g(gWhine.gain, p.elec ? 0.05 + 0.05 * rn : 0.025 * L * rn * rn, 0.06); }
        },
        stop: function() {
            [main, sub, noise, pulse, lfoA, lfoB, whine].forEach(function(o) { if (o) { try { o.stop(); } catch (e) {} } });
            nodes.forEach(function(n) { try { n.disconnect(); } catch (e) {} });
        }
    };
}
