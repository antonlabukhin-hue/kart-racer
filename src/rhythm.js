/**
 * Ритм заезда: как часто выпускать зверей в зависимости от того, где машина на трассе.
 * разгон → «слалом» → бой с боссом (фокус на нём) → финальная гонка. На ремонте и развилке — реже,
 * чтобы зверь не перекрыл единственную свободную полосу. В среднем за заезд зверей столько же,
 * сколько при ровной частоте — меняется ритм, а не сложность.
 */
export const RHYTHM = [
    { from: 0, mul: 0.5, name: 'разгон' },
    { from: 0.12, mul: 1.35, name: 'слалом' },
    { from: 0.42, mul: 0.65, name: 'босс' },
    { from: 0.82, mul: 1.7, name: 'финал' },
    { from: 0.96, mul: 0.8, name: 'финишная прямая' }
];
export const SEGMENT_CALM = 0.6;
const SEGMENT_SPAN = { roadworks: 60 / 1320, fork: 80 / 1320, tunnel: 90 / 1320 };

export function rhythmAt(progress) {
    let mul = RHYTHM[0].mul;
    for (let i = 0; i < RHYTHM.length; i++) if (progress >= RHYTHM[i].from) mul = RHYTHM[i].mul;
    return mul;
}

/** Множитель частоты появления зверей; layout — раскладка трассы (segments учитываются) */
export function densityAt(progress, layout) {
    let mul = rhythmAt(progress);
    const segs = (layout && layout.segments) || [];
    for (let i = 0; i < segs.length; i++) {
        const sg = segs[i];
        if (sg.type === 'tunnel') continue;
        const len = SEGMENT_SPAN[sg.type] || 0.05;
        // чуть заранее: зверь выбегает впереди машины
        if (progress >= sg.at - 0.03 && progress <= sg.at + len) { mul *= SEGMENT_CALM; break; }
    }
    return mul;
}
