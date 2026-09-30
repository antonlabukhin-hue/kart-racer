/**
 * «До соперника N м» (как «друзья» в Subway Surfers): во время бесконечного заезда — ближайшая цель впереди
 * из таблицы рекордов (мировой, устройства и соперников из лора) и твой собственный рекорд.
 * Обогнал — плашка и следующая цель. Логика — чистая (с тестами).
 */

/**
 * Лесенка целей по возрастанию дальности: лучший результат каждого (кроме тебя) + твой рекорд.
 * rows — [{ name, dist, rival? }] (например, из topRuns); me — имя игрока; myBest — его рекорд (м).
 */
export function chaseTargets(rows, me, myBest) {
    const best = {};
    (rows || []).forEach(function(r) {
        if (!r || r.name === me || !(r.dist > 0)) return;
        if (!best[r.name] || r.dist > best[r.name].dist) best[r.name] = { name: r.name, dist: Math.round(r.dist) };
    });
    const out = Object.keys(best).map(function(k) { return best[k]; });
    if (myBest > 0) out.push({ name: 'твой рекорд', dist: Math.round(myBest), mine: true });
    return out.sort(function(a, b) { return a.dist - b.dist; });
}

/** Ближайшая цель впереди: { target, left } или null (всех обогнал) */
export function nextTarget(targets, dist) {
    for (let i = 0; i < targets.length; i++) if (targets[i].dist > dist) return { target: targets[i], left: Math.ceil(targets[i].dist - dist) };
    return null;
}

/**
 * Каждый кадр HUD: обновить строку и сообщить, кого только что обогнали.
 * st — { targets, passed: Set } (создаётся один раз на заезд). Возвращает обогнанную цель или null.
 */
export function stepChase(st, dist, el) {
    let overtaken = null;
    for (let i = 0; i < st.targets.length; i++) {
        const t = st.targets[i];
        if (t.dist <= dist && !st.passed.has(t.name)) { st.passed.add(t.name); if (t.dist > 50) overtaken = t; }
    }
    if (el) {
        const n = nextTarget(st.targets, dist);
        const txt = n ? '🎯 До ' + (n.target.mine ? 'рекорда' : n.target.name) + ': ' + n.left.toLocaleString('ru-RU') + ' м' : '👑 Ты впереди всех!';
        if (el.textContent !== txt) el.textContent = txt;
    }
    return overtaken;
}
