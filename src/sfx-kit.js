/**
 * Звуки событий заезда — синтез WebAudio, каждый со своим характером и в слышимом на телефоне диапазоне
 * (динамик телефона почти не играет ниже ~300 Гц: старые «бух» и «тук-тук» на 50–120 Гц там не слышны).
 * Громкость выровнена по звону «Е» (ring) — по RMS в отрисовке (см. tests/unit/sfx-kit.test.js).
 *
 * Каждый звук — функция (ctx, out, t0, vs, noise): ctx — AudioContext/OfflineAudioContext, out — куда подключать,
 * t0 — время начала, vs — громкость (1 — как «Е»), noise — буфер белого шума (может быть null).
 */

function tone(ctx, out, t0, vs, wave, freq, at, dur, peak, slide, attack) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = wave;
    o.frequency.setValueAtTime(freq, t0 + at);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t0 + at + dur);
    g.gain.setValueAtTime(0.0001, t0);
    if (attack) { g.gain.setValueAtTime(0.0001, t0 + at); g.gain.exponentialRampToValueAtTime(Math.max(0.001, peak * vs), t0 + at + attack); }
    else g.gain.setValueAtTime(Math.max(0.001, peak * vs), t0 + at);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + at + dur);
    o.connect(g); g.connect(out);
    o.start(t0 + at); o.stop(t0 + at + dur + 0.02);
}

/** Шум через фильтр: type — lowpass/highpass/bandpass, f — частота (или [от, до] — сдвиг), q — добротность */
function noiseBurst(ctx, out, t0, vs, noise, at, dur, peak, type, f, q) {
    if (!noise) return;
    const n = ctx.createBufferSource(); n.buffer = noise; n.loop = true;
    const fl = ctx.createBiquadFilter(); fl.type = type; fl.Q.value = q || 1;
    if (Array.isArray(f)) { fl.frequency.setValueAtTime(f[0], t0 + at); fl.frequency.exponentialRampToValueAtTime(f[1], t0 + at + dur); }
    else fl.frequency.value = f;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.setValueAtTime(Math.max(0.001, peak * vs), t0 + at);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + at + dur);
    n.connect(fl); fl.connect(g); g.connect(out);
    n.start(t0 + at); n.stop(t0 + at + dur + 0.02);
}

export const SFX = {
    /** «Е» — «колечко» как в 16-битных платформерах (эталон громкости); pitch — выше в цепочке */
    ring: function(ctx, out, t0, vs, noise, pitch) {
        const P = pitch || 1, note = function(w, f, at, d, p) { tone(ctx, out, t0, vs, w, f, at, d, p); };
        note('square', 1318.5 * P, 0, 0.06, 0.11);
        note('triangle', 1318.5 * P, 0, 0.06, 0.14);
        note('square', 2093 * P, 0.05, 0.34, 0.1);
        note('triangle', 2093 * P, 0.05, 0.38, 0.16);
        note('sine', 4186 * P, 0.05, 0.16, 0.06);
        note('sine', 3136 * P, 0.1, 0.2, 0.04);
    },
    /** Авария с машиной: хруст металла (шум с опускающимся фильтром), «бам» кузова и звон осколков стекла */
    crash: function(ctx, out, t0, vs, noise) {
        noiseBurst(ctx, out, t0, vs, noise, 0, 0.32, 0.9, 'bandpass', [2400, 500], 0.8);   // хруст
        noiseBurst(ctx, out, t0, vs, noise, 0, 0.08, 0.7, 'highpass', 1800, 0.7);          // удар
        tone(ctx, out, t0, vs, 'square', 420, 0, 0.22, 0.14, 160);                          // «бам» кузова
        tone(ctx, out, t0, vs, 'sawtooth', 310, 0.01, 0.18, 0.1, 140);
        [3520, 4699, 3951, 5274].forEach(function(f, i) { tone(ctx, out, t0, vs, 'sine', f, 0.07 + i * 0.045, 0.12, 0.07); }); // осколки
    },
    /** Ящик: сухой треск досок — три щелчка и шорох щепок */
    crate: function(ctx, out, t0, vs, noise) {
        [0, 0.055, 0.12].forEach(function(at, i) {
            noiseBurst(ctx, out, t0, vs, noise, at, 0.05, 0.85 - i * 0.15, 'bandpass', 1100 + i * 350, 2.2);
            tone(ctx, out, t0, vs, 'triangle', 620 - i * 90, at, 0.06, 0.16, 300);
        });
        noiseBurst(ctx, out, t0, vs, noise, 0.14, 0.22, 0.28, 'bandpass', [3000, 1400], 1.2); // щепки
    },
    /** Сердечко: тёплый двойной «дзынь» вверх (до-ми-соль-до) с мягким мерцанием */
    heart: function(ctx, out, t0, vs) {
        tone(ctx, out, t0, vs, 'triangle', 660, 0, 0.09, 0.22, 520);                       // «тук»
        tone(ctx, out, t0, vs, 'triangle', 660, 0.11, 0.09, 0.2, 520);                     // «тук»
        [1046.5, 1318.5, 1568, 2093].forEach(function(f, i) {
            tone(ctx, out, t0, vs, 'sine', f, 0.16 + i * 0.06, 0.32, 0.16);
            tone(ctx, out, t0, vs, 'triangle', f * 2, 0.16 + i * 0.06, 0.12, 0.04);
        });
    },
    /** Броня: звонкий удар по стальной пластине (негармонические обертоны) и короткий «вжух» щита */
    shield: function(ctx, out, t0, vs, noise) {
        noiseBurst(ctx, out, t0, vs, noise, 0, 0.06, 0.6, 'bandpass', 2600, 3);            // удар
        [[880, 0.55, 0.14], [1397, 0.45, 0.1], [2217, 0.35, 0.07], [3170, 0.25, 0.05]].forEach(function(p) {
            tone(ctx, out, t0, vs, 'triangle', p[0], 0, p[1], p[2]);
        });
        tone(ctx, out, t0, vs, 'sine', 600, 0.05, 0.3, 0.12, 1800, 0.05);                   // «вжух» щита вверх
        noiseBurst(ctx, out, t0, vs, noise, 0.05, 0.28, 0.18, 'bandpass', [900, 4000], 2);
    },
    /** Нитро: рёв с подъёмом — пила вверх через фильтр и «выстрел» выхлопа */
    nitro: function(ctx, out, t0, vs, noise) {
        noiseBurst(ctx, out, t0, vs, noise, 0, 0.07, 0.6, 'bandpass', 1500, 1.5);          // «пых»
        tone(ctx, out, t0, vs, 'sawtooth', 330, 0.02, 0.42, 0.12, 1320, 0.03);              // рёв вверх
        tone(ctx, out, t0, vs, 'square', 495, 0.02, 0.4, 0.07, 1980, 0.03);
        noiseBurst(ctx, out, t0, vs, noise, 0.02, 0.4, 0.3, 'bandpass', [700, 3500], 1.4);  // поток
        tone(ctx, out, t0, vs, 'sine', 2637, 0.3, 0.18, 0.06);                             // искра в конце
    },
    /** Подныр: днище скребёт асфальт ~0.85 с — металлический скрежет рывками и визг (в диапазоне динамика телефона) */
    scrape: function(ctx, out, t0, vs, noise) {
        noiseBurst(ctx, out, t0, vs, noise, 0, 0.06, 0.22, 'highpass', 1500, 0.7);          // «шварк» касания
        for (let i = 0; i < 7; i++) noiseBurst(ctx, out, t0, vs, noise, 0.04 + i * 0.11, 0.13, 0.42 - i * 0.03, 'bandpass', 1900 + (i % 3) * 600, 3.5); // скрежет рывками
        tone(ctx, out, t0, vs, 'sawtooth', 1760, 0.03, 0.8, 0.035, 1480);                  // визг металла
        tone(ctx, out, t0, vs, 'square', 2349, 0.05, 0.7, 0.018, 2100);
    }
};

/** Белый шум для синтеза (одна секунда) */
export function makeNoise(ctx) {
    const b = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
}

/** Множители громкости: каждый звук на слух как «Е» (авария — чуть громче: важное событие) */
export const SFX_LEVEL = { ring: 1, crash: 0.63, crate: 2.5, heart: 1.35, shield: 1.4, nitro: 1.95, scrape: 3 };

/** Сыграть звук name с выравниванием громкости; vs — общая громкость эффектов */
export function playKit(name, ctx, out, t0, vs, noise, pitch) {
    const f = SFX[name];
    if (!f) return false;
    f(ctx, out, t0, vs * (SFX_LEVEL[name] || 1), noise, pitch);
    return true;
}
