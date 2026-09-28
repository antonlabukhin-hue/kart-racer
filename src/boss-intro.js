/**
 * Карточка представления босса («файтинг»-стиль) и карточка второй фазы.
 * Подсказка по атаке учит читать босса: что он делает и как увернуться.
 */
export const ATTACK_HINTS = {
    sweep: 'Бьёт битой по своей полосе — уходи в соседнюю',
    snipe: 'Стреляет издалека — меняй полосу после вспышки',
    burst: 'Очередь веером — держись края',
    mouth: 'Кусает вплотную — не липни к нему',
    rocket: 'Ракета по твоей полосе — перестраивайся',
    flame: 'Огонь из трубы — объезжай пламя',
    chain: 'Цепь через дорогу — прыгай или уходи',
    acid: 'Кислотные лужи — объезжай зелёное',
    riff: 'Звуковая волна — не стой на месте',
    saw: 'Пила на асфальте — меняй полосу',
    drill: 'Бур из-под земли — следи за трещинами',
    neon: 'Слепящая вспышка — держи руль ровно',
    tools: 'Швыряет гайки — лови просвет',
    ram: 'Идёт на таран — отвернись в последний миг',
    zap: 'Разряд по полосе — уходи с искрящей',
    drone: 'Дрон сверху — меняй полосу под тенью',
    hammer: 'Молот по дороге — жди удара и проезжай'
};

const esc = function(t) {
    return String(t == null ? '' : t).replace(/[&<>"']/g, function(c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
};
const hex = function(n, d) { return '#' + ((n != null ? n : d) >>> 0).toString(16).padStart(6, '0').slice(-6); };

/** «Кабан «Бригада»» → { title: 'Кабан', nick: 'Бригада' } */
export function splitBossName(name) {
    const m = /^(.*?)\s*«(.+)»\s*$/.exec(String(name || ''));
    return m ? { title: m[1], nick: m[2] } : { title: '', nick: String(name || 'Босс') };
}

export function bossIntroHtml(def, chapterNo, hp) {
    const n = splitBossName(def && def.name);
    const hint = ATTACK_HINTS[def && def.attack] || 'Увернись от атаки — после промаха тарань';
    return '<div class="bi-stripe" style="background:' + hex(def && def.trim, 0xffcc00) + '"></div>'
        + '<div class="bi-top">БОСС' + (chapterNo ? ' · глава ' + chapterNo : '') + '</div>'
        + '<div class="bi-title">' + esc(n.title) + '</div>'
        + '<div class="bi-nick" style="color:' + hex(def && def.eye, 0xffdd44) + '">«' + esc(n.nick) + '»</div>'
        + '<div class="bi-hp">' + '❤'.repeat(Math.max(1, Math.min(8, hp || 3))) + ' <span>броня: увернись и тарань</span></div>'
        + '<div class="bi-hint">' + esc(hint) + '</div>'
        + (def && def.shout ? '<div class="bi-quote">— ' + esc(def.shout) + '</div>' : '');
}

/** Карточка смены фазы: 2 — баррикады, 3 — ярость и таран навстречу */
export function bossPhaseHtml(def, phase) {
    const n = splitBossName(def && def.name);
    if (phase === 2) {
        return '<div class="bi-top">ФАЗА 2</div><div class="bi-nick" style="color:#ffaa22">«' + esc(n.nick) + '» строит баррикады</div>'
            + '<div class="bi-hint">Ищи просвет — проскочил чисто, он открыт</div>';
    }
    return '<div class="bi-top">ФАЗА 3</div><div class="bi-nick" style="color:#ff4422">«' + esc(n.nick) + '» в ярости</div>'
        + '<div class="bi-hint">Бежит навстречу — уйди с полосы или прыгай на него с трамплина</div>';
}

/**
 * Босс сбежал с арены: не «провал», а обещание реванша.
 * nextChapterNo — номер следующей главы кампании (или null — свободный заезд / последняя глава).
 */
export function bossEscapeHtml(def, nextChapterNo) {
    const n = splitBossName(def && def.name);
    const next = nextChapterNo ? 'Догоним в главе ' + nextChapterNo : 'Догоним в следующем заезде';
    return '<div class="bi-top">УШЁЛ</div>'
        + '<div class="bi-nick" style="color:#ffcc44">«' + esc(n.nick) + '» сбежал</div>'
        + '<div class="bi-hint">' + esc(next) + ' →</div>';
}
