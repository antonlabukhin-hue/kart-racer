/**
 * Игровые данные: кампания, машины, животные
 */

export const CAMPAIGN_TRACKS = [
    { id: 'c01', name: 'Выезд из Арсеньева', style: 'arsenev', weather: 'day', diff: 'easy',
      desc: 'Кафе «Ностальджгия». Антидот в багажнике.',
      loreTitle: 'Перехват частоты',
      loreAfter: 'Курьер.\nЯ слышал твой мотор ещё у кафе «Ностальджгия».\n\nТы думаешь, что везёшь «лекарство для мира».\nНа деле — яд для того порядка, который я выстроил.\n\nЗвероСуд — не авария природы.\nЭто приговор.\nИ я не дам тебе его отменить.\n\nГони. Мне нравится смотреть, как ты ещё надеешься.' },
    { id: 'c02', name: 'Трасса «Туманный мост»', style: 'arsenev', weather: 'rain', diff: 'easy',
      desc: 'Дождь. Разметка почти не видна.',
      loreTitle: 'Мокрый асфальт',
      loreAfter: 'Дождь смывает следы людей.\nОставляет только тех, кто умеет жить без правил.\n\nТвои звери уже знают номер «Чебурашки».\nОни не злые — они свободные.\nА свободу вы называли «ошибкой эксперимента».\n\nАнтидот вернёт их в клетки… только уже в головах.\nЯ этого не допущу.' },
    { id: 'c03', name: 'Ночной объезд', style: 'arsenev', weather: 'night', diff: 'medium',
      desc: 'Только фары и глаза в темноте.',
      loreTitle: 'Зелёные глаза',
      loreAfter: 'Ночью хорошо видно, кто кого боится.\n\nТы жмёшь на газ, а они — смотрят.\nНе из-под колёс. Из темноты.\n\nЯ научил их не просить дорогу.\nТы научился её отбирать.\nИнтересно, кто из вас ближе к человеку 90-х…\nк тому, кто брал своё без спроса.' },
    { id: 'c04', name: 'Промзона: Снежные ворота', style: 'promzona', weather: 'day',
      theme: 'snow', diff: 'medium',
      desc: 'Ржавые трубы и ядовитый дым.',
      loreTitle: 'Моя территория',
      loreAfter: 'Промзона — не декорации.\nЗдесь плавили будущее, пока начальство смотрело «Брата» на кассете.\n\nЯ работал за этими трубами.\nПока «исследовательский центр» ставил галочки в отчётах.\n\nОни хотели идеальных вегетарианцев.\nПолучили тех, кто больше не хочет быть едой.\nИ знаешь что? Я горжусь правкой.' },
    { id: 'c05', name: 'Цех №7', style: 'promzona', weather: 'rain', diff: 'medium',
      desc: 'Кислотные лужи. Не тормози резко.',
      loreTitle: 'Цех правды',
      loreAfter: 'Цех №7.\nИменно здесь в 2025-м выпустили «исправление экосистемы».\n\nЯ был в смене.\nЯ видел, как они проснулись.\nНе как звери — как граждане без паспорта.\n\nЦентр назвал это сбоем.\nЯ назвал это единственным честным экспериментом за десятилетие.\n\nТвой антидот — кнопка «отмена».\nА я терпеть не могу, когда историю переписывают задним числом.' },
    { id: 'c06', name: 'Красные трубы', style: 'promzona', weather: 'night', diff: 'hard',
      desc: 'Мигающие лампы. Не смотри по сторонам.',
      loreTitle: 'Красный сигнал',
      loreAfter: 'Каждый твой финиш — репортаж.\n«Курьер снова прорвался».\n\nМне нужна тишина, а не герои на радио.\nЛюди снова поверят, что мир можно «починить бутылкой».\n\nПочини себя сначала.\nТы возил пиратский «Терминатор» и жвачку «Турбо».\nТеперь вдруг — спаситель цивилизации?\n\nСбавь пафос. Или скорость. На выбор.' },
    { id: 'c07', name: 'Свалка «Надежда»', style: 'svalka', weather: 'day', diff: 'medium',
      desc: 'Горы хлама и странный запах.',
      loreTitle: 'Свалка равных',
      loreAfter: '«Надежда» — лучшее название для кучи мусора.\nКак и ваш центр.\n\nЗдесь лежат кассеты, шины, обещания депутатов.\nИ тушки тех, кто верил в «временные меры».\n\nАнтидот на свалке — просто стекло в коробке.\nПока ты не довезёшь.\n\nЯ уже проиграл одну войну бумаге и печатям.\nВторую — на асфальте — не проиграю.' },
    { id: 'c08', name: 'Свалка: Первый снег', style: 'svalka', weather: 'rain',
      theme: 'snow', diff: 'hard',
      desc: 'Токсичный туман. Держи комбо.',
      loreTitle: 'Яд и лекарство',
      loreAfter: 'Забавно: вы зовёте зелёный дым «токсичным»,\nа свой антидот — «спасением».\n\nОба меняют мозг.\nРазница в том, кто подписывает приказ.\n\nЯ дал зверям право быть хамами.\nВы хотите вернуть им право быть молчаливыми.\n\nСкажи честно, курьер:\nты за мир… или за привычный фон за окном?' },
    { id: 'c09', name: 'Холодный рассвет', style: 'svalka', weather: 'night', diff: 'hard',
      desc: 'Серо-зелёный рассвет над кучами шин.',
      loreTitle: 'Пульс на частоте',
      loreAfter: 'Я слышу тебя сквозь помехи.\nСердце стучит чаще, чем мотор на холостых.\n\nВ Центре тоже кто-то ждёт.\nНе «мир». Конкретный человек с допуском и страхом.\n\nЕсли антидот сработает — звери забудут, кто они.\nЗабудут ЗвероСуд.\nЗабудут меня.\n\nА я не люблю, когда меня вычёркивают из протокола.' },
    { id: 'c10', name: 'Шоссе «Последний VHS»', style: 'arsenev', weather: 'day', diff: 'hard',
      desc: 'Ностальгия и высокая скорость.',
      loreTitle: 'Кассета судьбы',
      loreAfter: '«Терминатор», «Битлз», «Король и Шут»…\nТы возил прошлое, пока настоящее гнило.\n\nЯ тоже из того времени.\nТолько вместо гитары у меня был лабораторный журнал.\n\nТы веришь, что Армагеддон останавливают песнями.\nЯ остановил его иначе: отдал дорогу тем, кого вы давили.\n\nИрония: контрабандист стал мессией.\nА я — голосом в приёмнике.\nКто из нас настоящий?' },
    { id: 'c11', name: 'Подступы к Центру', style: 'promzona', weather: 'rain', diff: 'hard',
      desc: 'Охрана, звери, нитро — всё сразу.',
      loreTitle: 'Последний заслон',
      loreAfter: 'Почти у ворот.\nЗа ними люди в халатах, которые всё «исправят».\n\nПередай им от меня:\nмир не станет прежним — он уже был ложью.\nЗвероСуд всего лишь снял маску.\n\nЕсли ворвёшься — получишь свою сцену из боевика 90-х.\nПобеда, титры, жвачка.\n\nА частота… останется моей.' },
    { id: 'c12', name: 'Центр: Снежный двор', style: 'svalka', weather: 'day',
      theme: 'snow', diff: 'hard',
      desc: 'Старый рубеж. Антидот почти у цели.',
      loreTitle: 'После титров?',
      loreAfter: '…Тишина?\nНет. Только пауза.\n\nБутылка на столе — ещё не победа.\nЧастота гудит глубже Центра.' },
    { id: 'c13', name: 'Кольцо «Радиорынок»', style: 'arsenev', weather: 'day', diff: 'medium',
      desc: 'Антенны и пиратские ретрансляторы.',
      loreTitle: 'Эфир жив',
      loreAfter: 'Здесь меняли кассеты на жвачку.\nТеперь — частоты на жизни.\n\nТреск в эфире — не помехи.\nЭто очередь без разрешения.' },
    { id: 'c14', name: 'Эстакада «Чёрный дым»', style: 'promzona', weather: 'rain', diff: 'medium',
      desc: 'Высота, ветер, скользкий бетон.',
      loreTitle: 'Сверху виднее',
      loreAfter: 'С эстакады город — схема.\nСхема, которую я уже правил.\n\nНе смотри вниз слишком долго.' },
    { id: 'c15', name: 'Карьер «Пустой желудок»', style: 'svalka', weather: 'day', diff: 'hard',
      desc: 'Пыль, ухабы, открытое поле.',
      loreTitle: 'Дно',
      loreAfter: 'Карьер выели ради «прогресса».\nОсталась дыра и эхо.\n\nАнтидот не засыплет её — только заставит делать вид.' },
    { id: 'c16', name: 'Тоннель «Белое молчание»', style: 'promzona', weather: 'night',
      theme: 'snow', diff: 'hard',
      desc: 'Темнота, эхо, узкая полоса.',
      loreTitle: 'Без сигнала',
      loreAfter: 'В тоннеле частота почти мертва.\nПочти.\n\nВыключи свет — услышишь дыхание тех, кто ждал курьера.' },
    { id: 'c17', name: 'Крыша Центра', style: 'arsenev', weather: 'day', diff: 'hard',
      desc: 'Настоящий финал. Доставь антидот.',
      loreTitle: 'Последняя помеха',
      loreAfter: 'Вот и крыша.\nВот и ты.\n\nЛей антидот. Пусть мир станет «добрым».\n\nЯ останусь в эфире — как предупреждение.\nДо связи, курьер.' }
];

export const CAMPAIGN_STAGE_MODS = {
    c01: null,
    c02: {
        terrainSeed: 202, terrainScale: 0.028, terrainAmp: 1.4,
        sky: 0x6a7a88, fog: 0x6a7a88, fogNear: 18, fogFar: 95,
        ambient: 0x556677, ground: 0x3a4550,
        animals: ['DOG','DEER','FOX','CAT','HUMAN','BOAR'],
        trafficMul: 0.9, oilMul: 1.4, bumpMul: 1.2, animalMul: 1.1
    },
    c03: {
        terrainSeed: 303, terrainScale: 0.045, terrainAmp: 2.0,
        sky: 0x0a1020, fog: 0x12182a, fogNear: 22, fogFar: 110,
        ambient: 0x1a2235, ground: 0x1a1e28,
        animals: ['BEAR','BOAR','DOG','CAT','FOX','DEER'],
        trafficMul: 0.7, oilMul: 0.8, bumpMul: 1.0, animalMul: 1.25
    },
    c04: {
        terrainSeed: 404, terrainScale: 0.042, terrainAmp: 2.4,
        sky: 0x5a6048, fog: 0x4a5040, fogNear: 26, fogFar: 120,
        ambient: 0x4a5540, ground: 0x3a4030,
        animals: ['CROC','RHINO','PEACOCK','DINO'],
        trafficMul: 1.3, oilMul: 1.5, bumpMul: 1.3, animalMul: 1.15
    },
    c05: {
        terrainSeed: 505, terrainScale: 0.05, terrainAmp: 2.6,
        sky: 0x4a6050, fog: 0x3a5040, fogNear: 20, fogFar: 100,
        ambient: 0x355545, ground: 0x2a3830,
        animals: ['CROC','ELEPHANT','RHINO','DINO','PEACOCK'],
        trafficMul: 1.4, oilMul: 1.8, bumpMul: 1.5, animalMul: 1.2
    },
    c06: {
        terrainSeed: 606, terrainScale: 0.038, terrainAmp: 2.2,
        sky: 0x2a1520, fog: 0x301820, fogNear: 24, fogFar: 105,
        ambient: 0x3a2028, ground: 0x281818,
        animals: ['DINO','RHINO','CROC','ELEPHANT'],
        trafficMul: 1.2, oilMul: 1.3, bumpMul: 1.4, animalMul: 1.35
    },
    c07: {
        terrainSeed: 707, terrainScale: 0.055, terrainAmp: 3.0,
        sky: 0x4a6a40, fog: 0x3d5a38, fogNear: 22, fogFar: 115,
        ambient: 0x3a5a30, ground: 0x3a4a28,
        animals: ['LION','MONKEY','HIPPO','ZEBRA'],
        trafficMul: 1.1, oilMul: 2.0, bumpMul: 1.6, animalMul: 1.2
    },
    c08: {
        terrainSeed: 808, terrainScale: 0.048, terrainAmp: 2.7,
        sky: 0x2a4a30, fog: 0x1a3a28, fogNear: 16, fogFar: 90,
        ambient: 0x2a4a35, ground: 0x2a3a22,
        animals: ['LION','GIRAFFE','HIPPO','MONKEY','ZEBRA'],
        trafficMul: 1.15, oilMul: 2.2, bumpMul: 1.7, animalMul: 1.3
    },
    c09: {
        terrainSeed: 909, terrainScale: 0.033, terrainAmp: 1.9,
        sky: 0x2a3a48, fog: 0x253545, fogNear: 20, fogFar: 100,
        ambient: 0x2a3848, ground: 0x2a3038,
        animals: ['ZEBRA','GIRAFFE','LION','MONKEY'],
        trafficMul: 1.0, oilMul: 1.4, bumpMul: 1.3, animalMul: 1.4
    },
    c10: {
        terrainSeed: 1010, terrainScale: 0.03, terrainAmp: 1.7,
        sky: 0x8a6a50, fog: 0x7a5a40, fogNear: 28, fogFar: 130,
        ambient: 0x6a5040, ground: 0x4a3a30,
        animals: ['DOG','CAT','BEAR','HUMAN','CHICKEN','FOX','BOAR'],
        trafficMul: 1.35, oilMul: 1.1, bumpMul: 1.2, animalMul: 1.15
    },
    c11: {
        terrainSeed: 1111, terrainScale: 0.052, terrainAmp: 2.9,
        sky: 0x4a3a48, fog: 0x3a2a38, fogNear: 18, fogFar: 95,
        ambient: 0x4a3a50, ground: 0x2a2230,
        animals: ['CROC','RHINO','ELEPHANT','DINO','LION','BEAR'],
        trafficMul: 1.6, oilMul: 1.7, bumpMul: 1.8, animalMul: 1.5
    },
    c12: {
        terrainSeed: 1212, terrainScale: 0.036, terrainAmp: 2.1,
        sky: 0x5a7088, fog: 0x4a6078, fogNear: 25, fogFar: 125,
        ambient: 0x506070, ground: 0x3a4a50,
        animals: ['HUMAN','DOG','CAT','PEACOCK','MONKEY','FOX'],
        trafficMul: 1.5, oilMul: 1.2, bumpMul: 1.4, animalMul: 1.25
    }
};

// Скорость и разгон подняты на 20% относительно исходных (0.35/0.31/0.41 и 0.018/0.014/0.024) —
// по просьбе сделать обычную езду быстрее; масштабируем обе величины вместе, чтобы
// сохранить прежнее ощущение разгона (время до максимума не изменилось).
export const CAR_PRESETS = {
    cheburashka: { name: 'Чебурашка', color: 0xff2200, maxSpeed: 0.42, accel: 0.0216, durability: 1.00, oilGrip: 1.00, priceChips: 0 },
    kirpich:     { name: 'Нива',       color: 0x4a6a4a, maxSpeed: 0.372, accel: 0.0168, durability: 0.70, oilGrip: 1.18, priceChips: 12 },
    turbo:       { name: 'Волга',      color: 0xc0a060, maxSpeed: 0.492, accel: 0.0288, durability: 1.15, oilGrip: 0.72, priceChips: 20 }
};

export const ANIMAL_TYPES = {
    // --- Карта 1: Арсеньев (яркие, контрастные) ---
    DOG: { id: 'dog', name: 'Собака', width: 0.68, height: 0.52, color: 0xD2691E, accentColor: 0xFFF8DC, speedCross: 4.0, speedZ: 0.02, penalty: 0.35, timePenalty: 4, radius: 0.78, design: 'dog', emoji: '🐕' },
    CAT: { id: 'cat', name: 'Кот', width: 0.54, height: 0.42, color: 0xFF8C00, accentColor: 0xFFFAF0, speedCross: 5.0, speedZ: 0.015, penalty: 0.25, timePenalty: 3, radius: 0.66, design: 'cat', emoji: '🐈' },
    DEER: { id: 'deer', name: 'Олень', width: 0.92, height: 0.88, color: 0xDEB887, accentColor: 0xFFFFFF, speedCross: 5.5, speedZ: 0.025, penalty: 0.45, timePenalty: 6, radius: 1.05, design: 'deer', emoji: '🦌' },
    BOAR: { id: 'boar', name: 'Кабан', width: 0.88, height: 0.68, color: 0x6B4423, accentColor: 0x1A1A1A, speedCross: 3.5, speedZ: 0.02, penalty: 0.5, timePenalty: 5, radius: 0.98, design: 'boar', emoji: '🐗' },
    FOX: { id: 'fox', name: 'Лиса', width: 0.60, height: 0.44, color: 0xFF4500, accentColor: 0xFFFFFF, speedCross: 4.5, speedZ: 0.018, penalty: 0.3, timePenalty: 3.5, radius: 0.72, design: 'fox', emoji: '🦊' },
    BEAR: { id: 'bear', name: 'Медведь', width: 1.20, height: 1.08, color: 0x8B4513, accentColor: 0x3D2314, speedCross: 2.5, speedZ: 0.015, penalty: 0.6, timePenalty: 7, radius: 1.30, design: 'bear', emoji: '🐻' },
    CHICKEN: { id: 'chicken', name: 'Курица', width: 0.48, height: 0.50, color: 0xFFD700, accentColor: 0xFF0000, speedCross: 3.8, speedZ: 0.02, penalty: 0.2, timePenalty: 2.5, radius: 0.55, design: 'chicken', emoji: '🐔' },
    HUMAN: { id: 'human', name: 'Человек', width: 0.55, height: 0.58, color: 0xF5DEB3, accentColor: 0x1E90FF, speedCross: 4.0, speedZ: 0.025, penalty: 0.2, timePenalty: 3, radius: 0.68, design: 'human', emoji: '👤' },
    // --- Карта 2: Промзона ---
    CROC: { id: 'croc', name: 'Крокодил', width: 1.15, height: 0.45, color: 0x228B22, accentColor: 0x006400, speedCross: 3.2, speedZ: 0.02, penalty: 0.5, timePenalty: 6, radius: 1.1, design: 'croc', emoji: '🐊' },
    RHINO: { id: 'rhino', name: 'Носорог', width: 1.25, height: 0.85, color: 0xA9A9A9, accentColor: 0x696969, speedCross: 2.8, speedZ: 0.015, penalty: 0.55, timePenalty: 6, radius: 1.2, design: 'rhino', emoji: '🦏' },
    ELEPHANT: { id: 'elephant', name: 'Слон', width: 1.35, height: 1.1, color: 0x808080, accentColor: 0xC0C0C0, speedCross: 2.2, speedZ: 0.012, penalty: 0.65, timePenalty: 7, radius: 1.35, design: 'elephant', emoji: '🐘' },
    DINO: { id: 'dino', name: 'Динозавр', width: 1.2, height: 1.0, color: 0x32CD32, accentColor: 0xFFD700, speedCross: 3.5, speedZ: 0.02, penalty: 0.55, timePenalty: 6, radius: 1.2, design: 'dino', emoji: '🦖' },
    PEACOCK: { id: 'peacock', name: 'Павлин', width: 0.7, height: 0.95, color: 0x00CED1, accentColor: 0xFF1493, speedCross: 4.2, speedZ: 0.02, penalty: 0.3, timePenalty: 3.5, radius: 0.8, design: 'peacock', emoji: '🦚' },
    // --- Карта 3: Свалка ---
    LION: { id: 'lion', name: 'Лев', width: 1.05, height: 0.75, color: 0xDAA520, accentColor: 0x8B4513, speedCross: 4.0, speedZ: 0.02, penalty: 0.5, timePenalty: 5.5, radius: 1.05, design: 'lion', emoji: '🦁' },
    MONKEY: { id: 'monkey', name: 'Обезьяна', width: 0.55, height: 0.65, color: 0xCD853F, accentColor: 0xFFE4C4, speedCross: 5.0, speedZ: 0.025, penalty: 0.3, timePenalty: 3.5, radius: 0.7, design: 'monkey', emoji: '🐒' },
    GIRAFFE: { id: 'giraffe', name: 'Жираф', width: 0.7, height: 1.4, color: 0xF4A460, accentColor: 0x8B4513, speedCross: 3.5, speedZ: 0.02, penalty: 0.45, timePenalty: 5, radius: 0.95, design: 'giraffe', emoji: '🦒' },
    ZEBRA: { id: 'zebra', name: 'Зебра', width: 0.95, height: 0.8, color: 0xF5F5F5, accentColor: 0x1A1A1A, speedCross: 4.5, speedZ: 0.022, penalty: 0.4, timePenalty: 4.5, radius: 1.0, design: 'zebra', emoji: '🦓' },
    HIPPO: { id: 'hippo', name: 'Бегемот', width: 1.3, height: 0.85, color: 0x9370DB, accentColor: 0x4B0082, speedCross: 2.5, speedZ: 0.015, penalty: 0.6, timePenalty: 6.5, radius: 1.25, design: 'hippo', emoji: '🦛' }
};

export const MAP_ANIMALS = {
    arsenev: ['DOG','CAT','DEER','BOAR','FOX','BEAR','CHICKEN','HUMAN'],
    promzona: ['CROC','RHINO','ELEPHANT','DINO','PEACOCK'],
    svalka: ['LION','MONKEY','GIRAFFE','ZEBRA','HIPPO']
};
