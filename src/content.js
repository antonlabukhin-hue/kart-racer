/**
 * Контент мета-игры: карты, реплики злодея, достижения, трофеи, детали и краски,
 * награды сезона, ежедневные контракты, выкрики зверей. Только данные — без логики.
 * (вынесено из main.js)
 */

export const MAP_ORDER = ['arsenev', 'promzona', 'svalka'];

export const MAP_NAMES = {
    arsenev: 'Трасса Арсеньева',
    promzona: 'Промзона',
    svalka: 'Свалка «Надежда»'
};

export const CAMPAIGN_FINISH_LINES = [
    'Одна трасса — не победа.\nТы лишь выехал из клетки, курьер.\nАнтидот всё ещё в багажнике… и под прицелом.',
    'Дождь смыл твои следы, но не мой интерес.\nПродолжай. Мне нравится, как ты цепляешься за «мир».',
    'Ночь тебя не съела — жаль.\nЗелёные глаза запомнили «Ушастика».\nДальше будет теснее.',
    'Промзона открыла рот.\nТы въехал в мою территорию добровольно.\nХрабрость или глупость — разберём на финише Центра.',
    'Цех №7 помнит мой почерк.\nТы едешь по чертежам, которые я же и испортил.\nАнтидот не исправит автора.',
    'Красный свет труб — не декорация.\nЭто предупреждение.\nСбавь героизм, пока частота ещё вежливая.',
    'Свалка «Надежда» приняла тебя как ещё один остов.\nТы выбрался. Пока что.\nНадежда — плохой навигатор.',
    'Зелёный дым не отличил, кто прав.\nОн только показал, кто дышит глубже.\nТы всё ещё везёшь «undo» для моего приговора.',
    'Холодный рассвет.\nЯ слышал, как стучало сердце.\nНе путай адреналин с правотой.',
    'Кассеты, «Киборг-убийца», жвачка…\nТы снова в ностальгии, а я — в эфире.\nИрония не спасёт антидот.',
    'Подступы к Центру.\nПочти у двери тех, кто всё «исправит».\nСкажи им: мир без ЗвероСуда — снова ложь в халате.',
    'Ты доехал.\nБутылка на столе. Подписи. Улыбки.\nНо частота останется.\nВключи радио завтра — если услышишь треск, это не сбой. Это я.',
    'Радиорынок гудит.\nТы купил время — не победу.',
    'Эстакада не прощает тормозов.\nЯ жду внизу схемы.',
    'Карьер пуст, как обещания Центра.\nГони дальше.',
    'В тоннеле ты один… почти.\nМолчание — тоже частота.',
    'Крыша. Финал. Или антракт?\nВключи радио завтра.'
];

export const VILLAIN_INTRO = {
    title: 'Кто говорит с тобой',
    text: 'Меня не будет в рации под именем.\nТолько треск, пауза и голос, который знает твой маршрут лучше диспетчера.\n\nКогда-то я ставил подписи рядом с теми, кто «исправлял экосистему».\nПотом увидел правду: звери проснулись, а люди — нет.\n\nЗвероСуд — мой ответ на ваши отчёты.\nАнтидот — их попытка нажать undo.\n\nТы — курьер между двумя правдами.\nВезёшь надежду Центра… и мешаешь моей.\n\nСемнадцать трасс.\nОдин багажник.\nИ частота, с которой я не сойду.'
};

export const ACHIEVEMENTS = [
    { id: 'first_win', name: 'Первый финиш', desc: 'Доехать до конца', img: 'images/trophy_first_win.png' },
    { id: 'perfect', name: 'Идеал', desc: 'Финиш без аварий', img: 'images/trophy_first_perfect.png' },
    { id: 'night_rider', name: 'Ночной курьер', desc: 'Финиш ночью', img: 'images/trophy_night_rider.png' },
    { id: 'rain_man', name: 'Дождевик', desc: 'Финиш в дождь', img: 'images/trophy_rain_man.png' },
    { id: 'hard_win', name: 'ЗвероСуд', desc: 'Победа на сложном', img: 'images/trophy_hard_win.png' },
    { id: 'gum_2', name: 'Турбо-коллекционер', desc: '2 жвачки за заезд', img: 'images/trophy_gum_2.png' },
    { id: 'no_nitro', name: 'Без нитро', desc: 'Финиш без нитро', img: 'images/trophy_no_nitro.png' },
    { id: 'oil_lover', name: 'Масломан', desc: '5 масляных пятен за заезд', img: 'images/trophy_oil_lover.png' },
    { id: 'bear_friend', name: 'Друг медведя', desc: '5 ударов по зверям за заезд', img: 'images/trophy_bear_friend.png' },
    { id: 'season5', name: 'Смена открыта', desc: '5 уровень сезона', img: 'images/trophy_season5.png' },
    { id: 'races10', name: 'Стахановец', desc: '10 заездов', img: 'images/trophy_races10.png' },
    { id: 'wins5', name: 'Надёжный курьер', desc: '5 побед', img: 'images/trophy_wins5.png' }
];

export const CAR_SHOP_ORDER = ['cheburashka', 'kirpich', 'gorbaty', 'turbo', 'pirozhok', 'buhanka', 'rafik', 'zubilo'];

export const CAR_PARTS = [
    { id: 'spoiler', name: 'Спойлер «Кирпич»', price: 80, slot: 'spoiler' },
    { id: 'skirts', name: 'Пороги', price: 60, slot: 'skirts' },
    { id: 'exhaust', name: 'Выхлоп двойной', price: 70, slot: 'exhaust' },
    { id: 'roof_rack', name: 'Багажник на крышу', price: 90, slot: 'roof' },
    { id: 'lip', name: 'Губа передняя', price: 50, slot: 'lip' },
    { id: 'rims', name: 'Литьё «Мелодия»', price: 100, slot: 'rims' },
    { id: 'antenna', name: 'Антенна-кнут', price: 30, slot: 'antenna' },
    { id: 'fog', name: 'Противотуманки', price: 40, slot: 'fog' },
    { id: 'xenon', name: 'Ксенон фар', price: 110, slot: 'lights' }
];

export const CAR_PAINTS = [
    { id: 'stock', name: 'Завод', color: null, price: 0 },
    { id: 'red', name: 'Арсеньев красный', color: 0xcc2200, price: 50 },
    { id: 'black', name: 'Чёрный кирпич', color: 0x1a1a1a, price: 60 },
    { id: 'yellow', name: 'Такси 90-х', color: 0xe8b800, price: 60 },
    { id: 'white', name: 'Белая ночь', color: 0xd8d8d8, price: 50 },
    { id: 'green', name: 'Промзона', color: 0x3a6a3a, price: 50 },
    { id: 'purple', name: 'Дискотека', color: 0x5a2a7a, price: 80 },
    { id: 'chrome', name: 'Хром-мечта', color: 0xaaaaaa, price: 120 }
];

export const TROPHIES = [
    { id: 't_cheburashka', name: 'Плюшевый Ушастик', emoji: '🧸', desc: 'Первый финиш', need: 'first_win' },
    { id: 't_wolf', name: 'Волк в тельняшке', emoji: '🐺', desc: 'Друг медведя', need: 'bear_friend' },
    { id: 't_terminator', name: 'Кассета «Киборг-убийца»', emoji: '🤖', desc: 'Финиш ночью', need: 'night_rider' },
    { id: 't_matrix', name: 'Красная пилюля', emoji: '💊', desc: 'Финиш без аварий', need: 'perfect' },
    { id: 't_brother', name: 'Тёмные очки братка', emoji: '🕶️', desc: 'Победа на сложном', need: 'hard_win' },
    { id: 't_titanic', name: 'Кулон «Синее море»', emoji: '💎', desc: '2 жвачки за рейс', need: 'gum_2' },
    { id: 't_pokemon', name: 'Жёлтая молния', emoji: '⚡', desc: 'Финиш без нитро', need: 'no_nitro' },
    { id: 't_ranetki', name: 'Микрофон рок-группы', emoji: '🎤', desc: 'Уровень сезона 5', need: 'season5' },
    { id: 't_taxi', name: 'Шашечки такси', emoji: '🚕', desc: '10 заездов', need: 'races10' },
    { id: 't_mk', name: 'Фишка из автомата', emoji: '🕹️', desc: '5 побед', need: 'wins5' }
];

export const SEASON_REWARDS = [
    { level: 1,  text: 'Рамка «Курьер 2037»', gum: 10, chips: 0 },
    { level: 2,  text: 'Реплика радио №1', gum: 5, chips: 0 },
    { level: 3,  text: 'Стикер «Не бить — засудит»', gum: 10, chips: 0 },
    { level: 4,  text: 'Гудок «Мелодия»', gum: 5, chips: 10 },
    { level: 5,  text: 'Номер «АРС–90»', gum: 15, chips: 10 },
    { level: 6,  text: 'Пачка «Разгона»', gum: 50, chips: 0 },
    { level: 7,  text: 'Фишка из автомата', gum: 0, chips: 10 },
    { level: 8,  text: 'Титул «Без нитро»', gum: 10, chips: 0 },
    { level: 9,  text: 'Новый крик зверя', gum: 5, chips: 0 },
    { level: 10, text: 'Окрас «Ночная пыль»', gum: 20, chips: 20 },
    { level: 11, text: 'Жвачка ×30', gum: 30, chips: 0 },
    { level: 12, text: 'Фишка ×1', gum: 0, chips: 10 },
    { level: 13, text: 'Рамка «Промзона FM»', gum: 15, chips: 0 },
    { level: 14, text: 'Титул «Друг медведя»', gum: 10, chips: 0 },
    { level: 15, text: 'Окрас «Кирпич ржавый»', gum: 20, chips: 20 },
    { level: 16, text: 'Жвачка ×40', gum: 40, chips: 0 },
    { level: 17, text: 'Фишка ×1', gum: 0, chips: 10 },
    { level: 18, text: 'Реплика радио №2', gum: 10, chips: 0 },
    { level: 19, text: 'Титул «Масломан»', gum: 10, chips: 0 },
    { level: 20, text: 'Гудок «Яблоньки»', gum: 25, chips: 20 },
    { level: 21, text: 'Стикер «Свалка»', gum: 15, chips: 0 },
    { level: 22, text: 'Фишка ×2', gum: 0, chips: 20 },
    { level: 23, text: 'Рамка «Надежда»', gum: 15, chips: 0 },
    { level: 24, text: 'Титул «С Арсеньева»', gum: 15, chips: 0 },
    { level: 25, text: 'Окрас «Турбо сезон»', gum: 30, chips: 30 },
    { level: 26, text: 'Жвачка ×50', gum: 50, chips: 0 },
    { level: 27, text: 'Фишка ×2', gum: 0, chips: 20 },
    { level: 28, text: 'Реплика босса', gum: 15, chips: 0 },
    { level: 29, text: 'Рамка «Золотой Кирпич»', gum: 20, chips: 20 },
    { level: 30, text: 'Звание «Кассета ЗвероСуда»', gum: 100, chips: 50 }
];

export const DAILY_CONTRACTS = [
    { id: 'fin_2crash', title: 'Аккуратный рейс', desc: 'Финиш с ≤2 авариями', check: m => m.state==='win' && m.strikes<=2, xp: 100, gum: 25, chips: 10 },
    { id: 'gum2', title: 'Сладкий груз', desc: 'Финиш и собери ≥2 жвачки', check: m => m.state==='win' && (m.gumPicked||0)>=2, xp: 90, gum: 30, chips: 10 },
    { id: 'nitro1', title: 'Зелёная стрела', desc: 'Финиш, взяв нитро ≥1', check: m => m.state==='win' && (m.nitroPicked||0)>=1, xp: 80, gum: 20, chips: 10 },
    { id: 'no_nitro', title: 'На своих двоих', desc: 'Финиш без нитро', check: m => m.state==='win' && (m.nitroPicked||0)===0, xp: 100, gum: 25, chips: 10 },
    { id: 'night', title: 'Ночная смена', desc: 'Финиш в погоде «Ночь»', check: m => m.state==='win' && m.weather==='night', xp: 110, gum: 30, chips: 20 },
    { id: 'rain', title: 'Мокрый асфальт', desc: 'Финиш в дождь', check: m => m.state==='win' && m.weather==='rain', xp: 100, gum: 25, chips: 10 },
    { id: 'perfect', title: 'Чистый лист', desc: 'Финиш без аварий', check: m => m.state==='win' && m.strikes===0, xp: 130, gum: 40, chips: 20 },
    { id: 'hard', title: 'ЗвероСуд', desc: 'Победа на сложном', check: m => m.state==='win' && m.difficulty==='hard', xp: 150, gum: 35, chips: 20 },
    // контракты на механики — не только «финишируй»
    { id: 'landings2', title: 'Каскадёр', desc: 'Финиш и 2 чистые посадки с трамплина', check: m => m.state==='win' && (m.cleanLandings||0)>=2, xp: 120, gum: 30, chips: 20 },
    { id: 'boss', title: 'Охотник', desc: 'Сбей босса в одном заезде', check: m => !!m.bossDefeated, xp: 130, gum: 30, chips: 20 },
    { id: 'clean2', title: 'Без царапины', desc: '2 чистых отрезка по 10 с за заезд', check: m => (m.cleanSegments||0)>=2, xp: 110, gum: 25, chips: 20 },
    { id: 'boards1', title: 'Долой рекламу', desc: 'Снеси рекламный щит и финишируй', check: m => m.state==='win' && (m.billboards||0)>=1, xp: 100, gum: 25, chips: 10 },
    { id: 'nearmiss5', title: 'На волоске', desc: '«На волоске!» ×5 и финиш', check: m => m.state==='win' && (m.nearMiss||0)>=5, xp: 120, gum: 30, chips: 20 }
];

export const ANIMAL_SHOUTS_LIST = [
    'куда прешь!',
    'я снимаю тебя!',
    'в интернет выложу!',
    'Ты че с Мелодии?',
    'Сковпин, куда прешь!',
    'Салов не гони',
    'Кабанцев ты же наш!',
    'Я тебя засужу!',
    'Он с Арсеньева!'
];
