/**
 * Первые три главы — обучение: подсказка «тренера» появляется, когда игрок подъезжает
 * к новой механике (не раньше и не пачкой). Показывается, пока глава не пройдена.
 *
 * when — условие по ситуации на дороге (ctx из игрового цикла):
 *   start — сразу после старта; gap/debris/event — до участка меньше N метров;
 *   animal — зверь впереди; boss — появился босс; nitro — есть нитро.
 */
export const TUTORIAL = [
    [ // глава 1: руль, звери, разлом, босс
        { id: 'lanes', when: 'start', text: '⬅➡ Меняй полосу — звери и ямы объезжаются' },
        { id: 'animal', when: 'animal', text: '🐾 Зверь впереди! Авария = штраф, 5 аварий — конец' },
        { id: 'gap', when: 'gap', dist: 75, text: '⚠ Разлом во всю дорогу — заезжай на трамплин ↑' },
        { id: 'boss', when: 'boss', text: '👊 Босс в броне! Увернись от атаки — после промаха тарань' }
    ],
    [ // глава 2: нитро-прыжок, арки
        { id: 'nitro', when: 'nitro', text: '⚡ Нитро на трамплине — высокий прыжок за ⭐ (−3 с)' },
        { id: 'debris', when: 'debris', dist: 70, text: '🪨 Над аркой висит груз — сейчас рухнет, уйди в сторону' },
        { id: 'near', when: 'animal', text: '💨 Проскочи вплотную к зверю — «На волоске!» даст нитро' }
    ],
    [ // глава 3: сцена карты, задания
        { id: 'tasks', when: 'start', text: '📋 В главе 3 задания — за каждое +3 Е (список на финише)' },
        { id: 'event', when: 'event', dist: 90, text: '🚦 Впереди опасный участок — смотри на сигнал и выбирай момент' },
        { id: 'heart', when: 'gap', dist: 75, text: '❤ Сердечко снимает одну аварию — не пропускай' }
    ]
];

export function tutorialFor(chapterIdx) {
    return TUTORIAL[chapterIdx] || [];
}

/**
 * Какую подсказку показать сейчас (или null). shown — Set уже показанных id.
 * ctx: { t, gap, debris, event, animal, boss, nitro } — t: секунды гонки, gap/debris/event: метры до участка.
 */
export function pickCoach(steps, shown, ctx) {
    for (let i = 0; i < steps.length; i++) {
        const s = steps[i];
        if (shown.has(s.id)) continue;
        let ok = false;
        if (s.when === 'start') ok = ctx.t >= 0.8;
        else if (s.when === 'gap' || s.when === 'debris' || s.when === 'event') {
            const d = ctx[s.when];
            ok = typeof d === 'number' && d > 0 && d < (s.dist || 70);
        } else ok = !!ctx[s.when];
        if (ok) return s;
    }
    return null;
}
