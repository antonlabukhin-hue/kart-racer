/**
 * Тест-драйвы за достижения (как «попробовать доску на один забег» в Subway Surfers, только заработанно):
 * выполнил веху — получил билет 🎟 на ОДИН заезд по бесконечной трассе на машине или мотоцикле, которых у тебя нет.
 * После заезда — «Купить со скидкой» (или «как получить», если машина подарочная).
 * Вехи (первые три — в любом порядке, четвёртая открывается после третьей, дальше — бесконечно):
 *   📖 2 главы кампании        → «Ракета»
 *   🐾 3 волны «Звериного часа» → «Трайк» (мотоцикл; сам — только в подарок за 7 дней подряд)
 *   🛣 4 000 м в бесконечной    → «Ночной мститель»
 *   🏆 побей свой рекорд на +1 000 м (от рекорда на момент вехи 4 000 м) → «Машина времени»
 *   🔁 и каждые следующие +1 000 м к рекорду — тест-драйв случайной машины, которой у тебя ещё нет.
 * Машина уже есть — берётся самая дорогая из тех, что нет. Всё есть — вехи без билета (отметка остаётся).
 * profile.testDrives = { got: { id: время }, tickets: [{ car, why }], base: рекорд при 4000 м, next: следующая цель рекорда }
 * Логика — чистая (с тестами).
 */
import { GIFT_CARS } from './gift-cars.js';

export const TD_MILESTONES = [
    { id: 'camp2', icon: '📖', text: 'Пройди 2 главы кампании', car: 'raketa', need: function(s) { return s.chapters >= 2; }, prog: function(s) { return [Math.min(2, s.chapters), 2]; } },
    { id: 'beast3', icon: '🐾', text: 'Пройди 3 волны в «Зверином часе»', car: 'trike', need: function(s) { return s.beastWaves >= 3; }, prog: function(s) { return [Math.min(3, s.beastWaves), 3]; } },
    { id: 'inf4000', icon: '🛣', text: 'Проедь 4 000 м в бесконечной', car: 'avenger', need: function(s) { return s.infBest >= 4000; }, prog: function(s) { return [Math.min(4000, s.infBest), 4000]; } },
    { id: 'rec1000', icon: '🏆', text: 'Побей свой рекорд на 1 000 м', car: 'timecar', after: 'inf4000' }
];
export const REPEAT_STEP = 1000;

function state(p) {
    const t = p.testDrives = Object.assign({ got: {}, tickets: [], base: 0, next: 0 }, p.testDrives);
    if (!Array.isArray(t.tickets)) t.tickets = [];
    return t;
}

/** Машина для билета: своя у вехи, если её нет; иначе самая дорогая из отсутствующих (за «Е», не за кассеты) */
export function pickCar(profile, want, presets) {
    const own = profile.unlockedCars || [];
    if (want && own.indexOf(want) < 0) return want;
    const list = Object.keys(presets).filter(function(id) { const q = presets[id]; return own.indexOf(id) < 0 && q.priceChips > 0 && !q.priceVhs; })
        .sort(function(a, b) { return presets[b].priceChips - presets[a].priceChips; });
    return list[0] || null;
}

/**
 * После заезда: s — { chapters, beastWaves, infBest }. Выдаёт новые билеты (мутирует профиль).
 * Возвращает список новых билетов [{ car, why, icon }].
 */
export function checkTestDrives(profile, s, presets, now) {
    const t = state(profile), out = [], at = now != null ? now : Date.now();
    const give = function(id, icon, why, want) {
        t.got[id] = at;
        const car = pickCar(profile, want, presets);
        if (!car) return;
        const tk = { car: car, why: why, icon: icon };
        t.tickets.push(tk); out.push(tk);
    };
    TD_MILESTONES.forEach(function(m) {
        if (t.got[m.id] || !m.need || !m.need(s)) return;
        if (m.id === 'inf4000') { t.base = s.infBest; t.next = s.infBest + REPEAT_STEP; }
        give(m.id, m.icon, m.text, m.car);
    });
    if (t.got.inf4000 && t.next > 0 && s.infBest >= t.next) {
        const first = !t.got.rec1000;
        give(first ? 'rec1000' : 'rec' + t.next, '🏆', first ? 'Рекорд +1 000 м' : 'Рекорд ' + t.next.toLocaleString('ru-RU') + ' м', first ? 'timecar' : null);
        t.next = Math.max(t.next, s.infBest) + REPEAT_STEP;
    }
    return out;
}

/** Билеты в наличии (машину купили — билет сгорает) */
export function tickets(profile) {
    const own = profile.unlockedCars || [];
    return ((profile.testDrives && profile.testDrives.tickets) || []).filter(function(k) { return own.indexOf(k.car) < 0; });
}

/** Использовать билет на машину car (первый подходящий). true — был */
export function useTicket(profile, car) {
    const t = state(profile);
    const i = t.tickets.findIndex(function(k) { return k.car === car; });
    if (i < 0) return false;
    t.tickets.splice(i, 1);
    return true;
}

/** Лестница вех для окна: [{ icon, text, car, done, prog: [a, b] | null }] */
export function ladder(profile, s) {
    const t = state(profile);
    return TD_MILESTONES.map(function(m) {
        let prog = m.prog ? m.prog(s) : null;
        if (m.id === 'rec1000') prog = t.got.inf4000 ? [Math.max(0, Math.min(REPEAT_STEP, s.infBest - t.base)), REPEAT_STEP] : null;
        return { id: m.id, icon: m.icon, text: m.text, car: m.car, done: !!t.got[m.id], prog: prog, locked: !!(m.after && !t.got[m.after]) };
    });
}

/** Что везти в заезд: { car, price (0 — не продаётся), how — как получить подарочную, ticket } */
export function tdOffer(car, presets) {
    const g = GIFT_CARS[car];
    return { car: car, price: g ? 0 : ((presets[car] || {}).priceChips || 0), how: g ? g.how : null, ticket: true };
}
