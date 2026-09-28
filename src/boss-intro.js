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
    const hint = ATTACK_HINTS[def && def.attack] || 'Тарань ×' + hp + ' или обгони';
    return '<div class="bi-stripe" style="background:' + hex(def && def.trim, 0xffcc00) + '"></div>'
        + '<div class="bi-top">БОСС' + (chapterNo ? ' · глава ' + chapterNo : '') + '</div>'
        + '<div class="bi-title">' + esc(n.title) + '</div>'
        + '<div class="bi-nick" style="color:' + hex(def && def.eye, 0xffdd44) + '">«' + esc(n.nick) + '»</div>'
        + '<div class="bi-hp">' + '❤'.repeat(Math.max(1, Math.min(8, hp || 3))) + ' <span>броня: увернись и тарань</span></div>'
        + '<div class="bi-hint">' + esc(hint) + '</div>'
        + (def && def.shout ? '<div class="bi-quote">— ' + esc(def.shout) + '</div>' : '');
}

export function bossPhase2Html(def) {
    const n = splitBossName(def && def.name);
    return '<div class="bi-top">ФАЗА 2</div><div class="bi-nick" style="color:#ff4422">«' + esc(n.nick) + '» в ярости</div>'
        + '<div class="bi-hint">Быстрее и злее — атаки чаще</div>';
}
