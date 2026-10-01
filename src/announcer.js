/**
 * Ведущий-комментатор (в духе ведущего гонок с 16-битных приставок): короткие реплики на важные моменты заезда —
 * крупным текстом в рамке ведущего и голосом, если запись есть.
 *
 * Голос: файлы public/voice/<id>.mp3 (id — у каждой реплики ниже, например start_1.mp3) и список записанных
 * в public/voice/index.json — массив id: ["start_1", "crash_2"]. Нет файла или списка — реплика только текстом.
 * Список всех реплик для записи — docs/VOICE.md (собирается из LINES).
 *
 * Настройка «Ведущий»: voice — голос и текст, text — только текст, off — молчит.
 * Логика выбора (кулдаун, приоритет, без повторов) — чистая, с тестами; показ и звук — в createAnnouncer.
 */
export const LINES = {
    start: [
        ['start_1', 'Двигатели прогреты — понеслась!'],
        ['start_2', 'Добрый вечер, страна! Дорога ждёт героя!'],
        ['start_3', 'Пристегнись, водила. Эфир пошёл!'],
        ['start_4', 'Кто сегодня король трассы? Сейчас узнаем!']
    ],
    crash: [
        ['crash_1', 'Ох! Это будет стоить денег!'],
        ['crash_2', 'Бам! Кузову больно, мне смешно!'],
        ['crash_3', 'Кто ставил тут этот столб?!'],
        ['crash_4', 'Жестяночка помялась… едем дальше!'],
        ['crash_5', 'Ай-яй-яй! Мама такого не покажет!']
    ],
    lastLife: [
        ['last_1', 'Последнее сердечко! Не дыши!'],
        ['last_2', 'Один удар — и всё. Аккуратнее, родной!']
    ],
    nearMiss: [
        ['near_1', 'На волоске! Я поседел!'],
        ['near_2', 'Вот это проскочил!'],
        ['near_3', 'Краска на краске — красота!'],
        ['near_4', 'Миллиметр! Ювелир!']
    ],
    nitro: [
        ['nitro_1', 'Нитро! Держи руль двумя руками!'],
        ['nitro_2', 'Ракета на колёсах!'],
        ['nitro_3', 'Полный газ — асфальт плавится!']
    ],
    heart: [
        ['heart_1', 'Сердечко! Ещё поживём!'],
        ['heart_2', 'Запасная жизнь — бери, не стесняйся!']
    ],
    fever: [
        ['fever_1', 'В УДАРЕ! Его не остановить!'],
        ['fever_2', 'Горячо! Все с дороги!'],
        ['fever_3', 'Вот это я понимаю — рок-н-ролл!']
    ],
    record: [
        ['record_1', 'НОВЫЙ РЕКОРД! Запишите в историю!'],
        ['record_2', 'Рекорд побит! Страна гордится!'],
        ['record_3', 'Дальше, чем когда-либо! Невероятно!']
    ],
    overtake: [
        ['over_1', 'Обогнал! Прощай, соперник!'],
        ['over_2', 'Ещё один позади! Кто следующий?'],
        ['over_3', 'Он даже не понял, что случилось!']
    ],
    police: [
        ['police_1', 'ГАИ на хвосте! Жми!'],
        ['police_2', 'Мигалки в зеркале! Ой-ой-ой!']
    ],
    caught: [
        ['caught_1', 'Попался! Документики, пожалуйста!'],
        ['caught_2', 'Всё, приехали. Командир доволен.']
    ],
    chance: [
        ['chance_1', 'Второй шанс! Не каждому дают!'],
        ['chance_2', 'Он снова в деле!']
    ],
    cassette: [
        ['tape_1', 'Кассета! Перемотай карандашом!'],
        ['tape_2', 'Видеокассета — редкость!']
    ],
    billboard: [
        ['board_1', 'Рекламу — в щепки!'],
        ['board_2', 'Минус один щит! Директор плачет!']
    ],
    landscape: [
        ['land_1', 'Новые места — новые приключения!'],
        ['land_2', 'Пейзаж сменился, а газ всё тот же!']
    ],
    finish: [
        ['finish_1', 'Вот это заезд! Повторим?'],
        ['finish_2', 'Неплохо, водила! Но можно дальше!'],
        ['finish_3', 'Конец эфира… или нет? Жми «Повторить»!']
    ],
    finishRecord: [
        ['finrec_1', 'Рекорд! Я бы тебе медаль дал, да денег нет!'],
        ['finrec_2', 'Легенда трассы! Так держать!']
    ]
};

/** Важность: важные перебивают кулдаун и текущую реплику */
const PRIORITY = { record: 3, caught: 3, finishRecord: 3, finish: 2, police: 2, fever: 2, chance: 2, lastLife: 2, overtake: 2, start: 2 };
/** Как часто говорить на частые события (доля случаев) */
const CHANCE = { nearMiss: 0.35, crash: 0.7, nitro: 0.6, billboard: 0.5, landscape: 0.6, heart: 0.8 };
export const GAP = 5; // секунд тишины между обычными репликами

/**
 * Чистый выбор реплики. st — состояние { last: время последней, recent: [id…] }, t — время (с), rnd — [0,1)
 * Возвращает [id, текст] или null.
 */
export function pickLine(st, kind, t, rnd) {
    const list = LINES[kind];
    if (!list) return null;
    const r = rnd || Math.random;
    const pr = PRIORITY[kind] || 1;
    if (pr < 2 && t - (st.last != null ? st.last : -1e9) < GAP) return null;
    if (CHANCE[kind] != null && r() >= CHANCE[kind]) return null;
    const recent = st.recent || (st.recent = []);
    const fresh = list.filter(function(l) { return recent.indexOf(l[0]) < 0; });
    const pool = fresh.length ? fresh : list;
    const line = pool[Math.floor(r() * pool.length) % pool.length];
    recent.push(line[0]);
    if (recent.length > 8) recent.shift();
    st.last = t;
    return line;
}

/** Все реплики списком (для docs/VOICE.md и записи голоса) */
export function allLines() {
    const out = [];
    Object.keys(LINES).forEach(function(k) { LINES[k].forEach(function(l) { out.push({ kind: k, id: l[0], text: l[1] }); }); });
    return out;
}

/**
 * Показ и голос. o: { mode() → 'voice'|'text'|'off', volume() → 0..1, base ('voice/') }
 * → { say(kind) }
 */
export function createAnnouncer(o) {
    const opts = o || {};
    const st = { last: null, recent: [] };
    let recorded = null, audio = null, el = null, hideT = 0;
    const base = opts.base || 'voice/';
    const loadList = function() {
        if (recorded || typeof fetch === 'undefined') return;
        recorded = {};
        fetch(base + 'index.json').then(function(r) { return r.ok ? r.json() : []; }).then(function(ids) {
            (Array.isArray(ids) ? ids : []).forEach(function(id) { recorded[id] = true; });
        }).catch(function() {});
    };
    const show = function(text) {
        if (!el || !el.isConnected) {
            el = document.createElement('div');
            el.className = 'announcer';
            el.innerHTML = '<i aria-hidden="true">🎙</i><span></span>';
            document.body.appendChild(el);
        }
        el.lastChild.textContent = text;
        el.classList.remove('out');
        void el.offsetWidth;
        el.classList.add('in');
        clearTimeout(hideT);
        hideT = setTimeout(function() { if (el) { el.classList.remove('in'); el.classList.add('out'); } }, 2300);
    };
    const voice = function(id) {
        if (!recorded || !recorded[id]) return;
        try {
            if (audio) audio.pause();
            audio = new Audio(base + id + '.mp3');
            audio.volume = Math.max(0, Math.min(1, opts.volume ? opts.volume() : 1));
            const pr = audio.play();
            if (pr && pr.catch) pr.catch(function() {});
        } catch (e) {}
    };
    return {
        say: function(kind) {
            const mode = opts.mode ? opts.mode() : 'voice';
            if (mode === 'off') return null;
            loadList();
            const line = pickLine(st, kind, (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000);
            if (!line) return null;
            show(line[1]);
            if (mode === 'voice') voice(line[0]);
            return line;
        },
        /** заезд кончился / вышли в меню — убрать рамку и замолчать */
        hush: function() { clearTimeout(hideT); if (el) el.remove(); el = null; if (audio) { try { audio.pause(); } catch (e) {} } }
    };
}

/** Крупная плашка игры (showBigPlaque) → о чём сказать ведущему */
export function plaqueKind(title) {
    const t = String(title || '');
    const map = [['В УДАРЕ', 'fever'], ['НОВЫЙ РЕКОРД', 'record'], ['ОБОГНАЛ', 'overtake'], ['ВТОРОЙ ШАНС', 'chance'], ['ГАИ ПОЙМАЛА', 'caught'],
        ['ВИДЕОКАССЕТА', 'cassette'], ['РЕКЛАМА СНЕСЕНА', 'billboard'], ['ПЕЙЗАЖ', 'landscape']];
    for (let i = 0; i < map.length; i++) if (t.indexOf(map[i][0]) >= 0) return map[i][1];
    return null;
}
