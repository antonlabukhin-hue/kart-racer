import { expect } from '@playwright/test';

// 404, которые сейчас штатные: браузер сам просит favicon, кампания перебирает camp_02…camp_17
const KNOWN_404 = [/\/favicon\.ico$/, /\/images\/camp_\d+\.(jpg|png)$/];

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

export async function login(page, name = 'Тестер', url = './') {
    await page.goto(url);
    await expect(page.locator('#profile-login-btn')).toBeEnabled();
    await page.locator('#splash-screen').click();
    await page.locator('#profile-name-input').fill(name);
    await page.locator('#profile-name-input').press('Enter');
    await expect(page.locator('#main-menu-screen')).toBeVisible();
}

// Свободный заезд: меню → (магазин при первом заезде) → сложность → лор → старт
export async function startFreeRace(page, difficulty = 'easy') {
    await page.locator('.menu-card[data-menu="race"]').click();
    const shop = page.locator('#shop-action');
    if (await shop.isVisible()) await shop.click();
    await page.locator(`.difficulty-btn[data-diff="${difficulty}"]`).click();
    await page.getByRole('button', { name: /Пропустить/ }).click();
    await page.locator('#map-select-go').click();
    await expect(page.locator('#game-hud')).toBeVisible({ timeout: 20_000 });
}

// Первая трасса кампании: список трасс → (магазин) → качество → лор → старт
export async function startCampaign(page) {
    await page.locator('.menu-card[data-menu="campaign"]').click();
    await page.locator('.camp-track[data-idx="0"]').click();
    await page.locator('#shop-action').click();
    await page.locator('#campaign-quality-go').click();
    // лор перед заездом есть не у всех трасс
    const skip = page.getByRole('button', { name: /Пропустить/ });
    const hud = page.locator('#game-hud');
    await expect(skip.or(hud).first()).toBeVisible({ timeout: 20_000 });
    if (await skip.isVisible()) await skip.click();
    await expect(hud).toBeVisible({ timeout: 20_000 });
}

export async function progress(page) {
    return page.evaluate(() => parseFloat(document.getElementById('progressBar')?.style.width) || 0);
}
