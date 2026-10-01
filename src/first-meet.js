/**
 * Первое знакомство: когда впереди впервые показывается что-то новое (зверь, яма, ящик «?», шипы…),
 * заезд встаёт на паузу и плашка объясняет, что это и что делать; «Продолжить» — едем дальше.
 * Каждое — один раз на устройстве (localStorage). Выбор — чистая функция (с тестами), плашка — здесь же.
 */
export const MEET_KEY = 'road_racing_met_v1';

export const MEET = {
    echip: { icon: 'Е', title: 'Железные «Е»', text: 'Собирай — это деньги: новые машины, прокачка, краска и детали.' },
    animal: { icon: '🐾', title: 'Звери на дороге', text: 'Выбегают поперёк — объезжай. Удар — авария, после пятой заезд окончен.' },
    traffic: { icon: '🚗', title: 'Попутки', text: 'Едут медленнее и иногда перестраиваются — обгоняй по свободной полосе.' },
    pothole: { icon: '🕳', title: 'Яма', text: 'Сильно гасит скорость — объезжай.' },
    bump: { icon: '⛰', title: 'Кочка', text: 'Подбрасывает и тормозит — лучше объехать.' },
    slide: { icon: '🛢', title: 'Скользкое пятно', text: 'Масло, лёд, кислота или смола — занесёт и замедлит.' },
    spikes: { icon: '⚠', title: 'Шипы', text: 'Не авария, но пару секунд скорость на 30% ниже. Перепрыгни или объедь.' },
    crate: { icon: '📦', title: 'Ящик «?»', text: 'Сноси! Внутри чаще подарок — нитро, усиление или «Е». Но бывает и подвох.' },
    power: { icon: '🧲', title: 'Усиления', text: 'Магнит, двойные «Е» или броня — бери, они помогают.' },
    vhs: { icon: '📼', title: 'Видеокассета', text: 'Редкая валюта — за кассеты открываются особые машины.' },
    nitro: { icon: '⚡', title: 'Нитро', text: 'Зелёные стрелки на асфальте — рывок скорости.' },
    gum: { icon: '❤', title: 'Сердечко', text: 'Снимает одну аварию — не пропускай.' },
    billboard: { icon: '💥', title: 'Рекламный щит', text: 'Тарань! Это не авария: +10 Е и очки стиля.' },
    debris: { icon: '🪨', title: 'Арка с грузом', text: 'Груз сейчас рухнет — уйди в свободную полосу.' },
    gap: { icon: '🚧', title: 'Разлом', text: 'Во всю дорогу — заезжай на трамплин и перелетай.' }
};
// в каком окне впереди (ед.) показывать: достаточно близко, чтобы видеть, и далеко, чтобы успеть
export const MEET_NEAR = 14, MEET_FAR = 42;
const SLIDES = ['oil', 'acid', 'ice', 'tar'];

/** Что из нового ближе всего впереди (id) — или null. seen — Set знакомых; w — списки мира и машина */
export function pickMeet(w, seen) {
    let best = null, bestD = Infinity;
    const see = function(id, z, far) {
        const d = w.z - z;
        if (seen.has(id) || !(d > MEET_NEAR && d < (far || MEET_FAR)) || d >= bestD) return;
        best = id; bestD = d;
    };
    (w.collectibles || []).forEach(function(c) { if (c.active && MEET[c.type]) see(c.type, c.z); });
    (w.obstacles || []).forEach(function(o) { if (o.active) see(SLIDES.indexOf(o.type) >= 0 ? 'slide' : o.type, o.z); });
    (w.boards || []).forEach(function(b) { if (!b.smashed) see('billboard', b.z); });
    (w.animals || []).forEach(function(a) { if (a && a.triggered && !a.hit) see('animal', a.z); });
    (w.cars || []).forEach(function(c) { if (c && Math.abs((c.x || 0) - w.x) < 3) see('traffic', c.z); });
    (w.debris || []).forEach(function(dz) { if (!dz.fired) see('debris', dz.z, 70); });
    (w.gaps || []).forEach(function(g) { see('gap', g.zNear, 80); });
    return best;
}

export function loadSeen() {
    try {
        const raw = localStorage.getItem(MEET_KEY);
        if (raw === 'all') return new Set(Object.keys(MEET));
        return new Set(JSON.parse(raw || '[]'));
    } catch (e) { return new Set(); }
}
function saveSeen(seen) {
    try { localStorage.setItem(MEET_KEY, JSON.stringify(Array.from(seen))); } catch (e) {}
}

/**
 * Плашка знакомства: заезд на паузе (флаг window.__racePaused, как у кнопки паузы), пока не нажмут «Продолжить». Отмечает знакомым сразу.
 * «Пропустить всё обучение» — отметить знакомым всё (дальше подсказок не будет).
 */
export function showMeet(id, seen, pause) {
    pause = pause || function(on) { window.__racePaused = on; };
    const m = MEET[id];
    if (!m) return;
    seen.add(id); saveSeen(seen);
    pause(true);
    const el = document.createElement('div');
    el.className = 'meet-overlay';
    el.innerHTML = '<div class="meet-card" role="dialog" aria-modal="true"><div class="meet-new">НОВОЕ НА ДОРОГЕ</div><i class="meet-ico"></i><b class="meet-title"></b><p class="meet-text"></p>'
        + '<button type="button" class="meet-go">Продолжить ▶</button><button type="button" class="meet-off">⏭ Пропустить всё обучение</button></div>';
    el.querySelector('.meet-ico').textContent = m.icon;
    el.querySelector('.meet-title').textContent = m.title;
    el.querySelector('.meet-text').textContent = m.text;
    document.body.appendChild(el);
    let done = false;
    const close = function() {
        if (done) return;
        done = true;
        document.removeEventListener('keydown', onKey, true);
        el.remove(); pause(false);
    };
    const onKey = function(e) { if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); } };
    document.addEventListener('keydown', onKey, true);
    el.querySelector('.meet-go').onclick = close;
    el.querySelector('.meet-off').onclick = function() { Object.keys(MEET).forEach(function(k) { seen.add(k); }); saveSeen(seen); close(); };
    setTimeout(function() { try { el.querySelector('.meet-go').focus(); } catch (e) {} }, 50);
}
