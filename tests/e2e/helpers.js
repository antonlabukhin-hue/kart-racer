import { expect } from '@playwright/test';

// 404, которые штатные: браузер сам просит favicon (превью глав больше не запрашиваются наугад)
const KNOWN_404 = [/\/favicon\.ico$/];

// Собирает всё, что должно ронять тест: исключения, console.error, alert/confirm, HTTP >= 400
export function watchProblems(page) {
    const problems = [];
    page.on('pageerror', e => problems.push('pageerror: ' + e.message));
    // «Failed to load resource» браузер пишет на каждый 404 — их проверяет обработчик response ниже, с адресом
    page.on('console', m => {
        if (m.type() === 'error' && !m.text().startsWith('Failed to load resource')) problems.push('console.error: ' + m.text());
    });
    page.on('dialog', d => { problems.push('dialog: ' + d.message()); d.dismiss().catch(() => {}); });
    page.on('response', r => {
        if (r.status() >= 400 && !KNOWN_404.some(re => re.test(new URL(r.url()).pathname))) {
            problems.push('HTTP ' + r.status() + ' ' + r.url());
        }
    });
    return problems;
}

// Считает вызовы window.showAnimalShout — моста, который модуль animals.js вызывает у index.html
export async function countShouts(page) {
    await page.addInitScript(() => {
        window.__testShouts = 0;
        let fn;
        Object.defineProperty(window, 'showAnimalShout', {
            configurable: true,
            get() { return fn; },
            set(v) { fn = function () { window.__testShouts++; return v.apply(this, arguments); }; },
        });
    });
}

// briefing: true — не отмечать «Даю установку:» как прочитанный (плашка первого заезда покажется);
// tutorial: true — включить «Обучение в заезде» в настройках (по умолчанию оно выключено);
// fresh: true — настоящий новичок: новости с 3-го захода, «Слово дня» и др. со 2-го дня (src/visits.js); иначе всё открыто сразу
export async function login(page, name = 'Тестер', url = './', { briefing = false, tutorial = false, fresh = false } = {}) {
    if (!briefing) await page.addInitScript(() => localStorage.setItem('road_racing_briefing_v2', '1'));
    if (!fresh) await page.addInitScript(() => localStorage.setItem('road_racing_open_all', '1'));
    if (tutorial) await page.addInitScript(() => { const k = 'road_racing_settings_v1'; const st = JSON.parse(localStorage.getItem(k) || '{}'); st.tutorial = true; localStorage.setItem(k, JSON.stringify(st)); });
    // показ наград в конце заезда (крутящаяся «Е», кассета, салют рекорда) проверяет свой тест — остальным сразу итоги
    await page.addInitScript(() => { if (!sessionStorage.getItem('keep_reveal')) localStorage.setItem('road_racing_skip_reveal', '1'); });
    // плашку «Появились новые машины» проверяет свой тест — остальным она не мешает
    await page.addInitScript(() => { if (!sessionStorage.getItem('keep_newcars') && !localStorage.getItem('road_racing_new_cars_seen')) localStorage.setItem('road_racing_new_cars_seen', 'all'); });
    // «первое знакомство» (пауза перед новым на дороге) проверяет свой тест — остальным всё уже знакомо
    await page.addInitScript(() => { if (!sessionStorage.getItem('keep_meet') && !localStorage.getItem('road_racing_met_v1')) localStorage.setItem('road_racing_met_v1', 'all'); });
    // плашку «Машины в подарок» проверяет свой тест — остальным она не мешает
    await page.addInitScript(() => { if (!sessionStorage.getItem('keep_giftintro')) localStorage.setItem('road_racing_gift_cars_intro_v1', '1'); });
    // «Привет, Имя!» с новостями (src/ui/hello-news.js) проверяет свой тест — остальным не мешает
    await page.addInitScript(() => { if (!sessionStorage.getItem('keep_hello')) localStorage.setItem('road_racing_hello_skip', '1'); else localStorage.removeItem('road_racing_hello_skip'); });
    await page.goto(url);
    await expect(page.locator('#profile-login-btn')).toBeEnabled();
    await page.locator('#splash-screen').click();
    await page.locator('#profile-name-input').fill(name);
    await page.locator('#profile-name-input').press('Enter');
    await expect(page.locator('#main-menu-screen')).toBeVisible();
}

// Прежний свободный заезд скрыт из меню (его место заняла «Бесконечная трасса») — для проверок открываем его напрямую
export async function openFreeRace(page) {
    await expect(page.locator('#main-menu-screen')).toBeVisible();
    await page.evaluate(() => document.querySelector('.menu-card[data-menu="race"]').click());
}

// Свободный заезд: меню → (магазин при первом заезде) → сложность → лор → старт
export async function startFreeRace(page, difficulty = 'easy') {
    await openFreeRace(page);
    const shop = page.locator('#shop-action');
    if (await shop.isVisible()) await shop.click();
    await page.locator(`.difficulty-btn[data-diff="${difficulty}"]`).click();
    // лор показывается только перед первым свободным заездом
    const skip = page.locator('#lore-screen .lore-panel.active button', { hasText: /Пропустить|ПОЕХАЛИ/ }).first();
    await skipLoreIfShown(page);
    await page.locator('#map-select-go').click();
    await expect(page.locator('#game-hud')).toBeVisible({ timeout: 20_000 });
}

// «Звериный час» открывается после главы 1: отметить её пройденной в сохранении и перезайти
export async function unlockBeastHour(page, name = 'Тестер') {
    await page.evaluate(() => {
        const list = JSON.parse(localStorage.getItem('road_racing_profiles_v1') || '[]');
        list.forEach(p => { p.campaign = Object.assign({}, p.campaign, { unlocked: 2, completed: ['c01'] }); });
        localStorage.setItem('road_racing_profiles_v1', JSON.stringify(list));
    });
    await page.reload();
    await page.locator('#splash-screen').click();
    await page.locator('#profile-list').getByText(name).click();
    await expect(page.locator('.menu-card[data-menu="endless"]')).not.toHaveClass(/locked/);
}

// Лор свободного заезда показывается только в первый раз: ждём либо его, либо экран карт
export async function skipLoreIfShown(page) {
    const skip = page.locator('#lore-screen .lore-panel.active button', { hasText: /Пропустить|ПОЕХАЛИ/ }).first();
    const map = page.locator('#map-select-screen');
    await expect.poll(async () => (await skip.isVisible()) || (await map.isVisible()), { timeout: 10_000 }).toBe(true);
    if (await skip.isVisible()) await skip.click();
    await expect(map).toBeVisible();
}

// Первая трасса кампании: список трасс → (магазин) → качество → лор → старт
export async function startCampaign(page) {
    await page.locator('.menu-card[data-menu="campaign"]').click();
    await page.locator('.camp-track[data-idx="0"]').click();
    await page.locator('#shop-action').click();
    await page.locator('#campaign-quality-go').click();
    // лор перед заездом есть не у всех трасс
    const skip = page.locator('#lore-screen .lore-panel.active button', { hasText: /Пропустить|ПОЕХАЛИ/ }).first();
    const hud = page.locator('#game-hud');
    await expect(skip.or(hud).first()).toBeVisible({ timeout: 20_000 });
    if (await skip.isVisible()) await skip.click();
    await expect(hud).toBeVisible({ timeout: 20_000 });
}

export async function progress(page) {
    return page.evaluate(() => parseFloat(document.getElementById('progressBar')?.style.width) || 0);
}

// Дождаться, пока заезд реально пошёл (обработчики клавиш уже висят) — иначе на медленном CI
// нажатие газа до конца загрузки сцены теряется и машина стоит
export async function waitRacing(page, timeout = 60_000) { // CI без видеокарты: сцена с пейзажами стартует дольше
    await expect.poll(() => page.evaluate(() => window.__raceDebug && window.__raceDebug.state), { timeout }).toBe('racing');
}
