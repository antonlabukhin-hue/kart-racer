import { test, expect } from '@playwright/test';
import { watchProblems, login, startFreeRace, waitRacing } from '../helpers.js';

// «Ещё раз» за секунду: на поражении R (или «Повторить») — и через ~1 с снова едешь; «почти доехал» — на экране
test('«Повторить»: короткий отсчёт, R на финише, «до финиша оставалось»', async ({ page }) => {
    const problems = watchProblems(page);
    await login(page, 'Тестер', './?start=0.9');
    await startFreeRace(page, 'easy');
    await waitRacing(page);
    await page.evaluate(() => window.__raceDebug.end('crash'));
    await expect(page.locator('#finish-screen')).toContainText('до финиша оставалось', { ignoreCase: true });
    await expect(page.locator('#finish-screen')).toContainText('почти доехал');
    // какие цифры показал отсчёт после «Повторить»: должен начаться сразу с «1» (по игровому времени, не по часам —
    // на медленном CI кадры длиннее)
    await page.evaluate(() => {
        window.__cd = [];
        new MutationObserver(() => { const el = document.getElementById('race-countdown'); if (el && window.__cd[window.__cd.length - 1] !== el.textContent) { window.__cd.push(el.textContent); } })
            .observe(document.body, { childList: true, subtree: true, characterData: true });
    });
    await page.keyboard.press('r');
    await expect.poll(() => page.evaluate(() => window.__raceDebug && window.__raceDebug.state), { timeout: 30_000 }).toBe('racing');
    const seen = await page.evaluate(() => window.__cd.filter(t => /^[0-9]$/.test(t)));
    expect(seen).toEqual(['1']);
    expect(problems).toEqual([]);
});

// Множитель за риск: «на волоске» растит ×, авария сжигает; на финише — очки риска и прогресс заданий
test('множитель за риск в заезде и задания на финише', async ({ page }) => {
    const problems = watchProblems(page);
    await login(page, 'Тестер', './?start=0.5');
    // три задания на виду в меню
    await expect(page.locator('#mm-missions .mmm-row')).toHaveCount(3);
    await startFreeRace(page, 'easy');
    await waitRacing(page);
    // задание «на волоске» — чтобы точно был прогресс
    // два «на волоске»; у него перезарядка 1.2 с игрового времени — повторяем, пока не засчитается второй
    await page.evaluate(() => window.__raceDebug.nearMissNow());
    await expect.poll(async () => page.evaluate(() => { const d = window.__raceDebug; if (d.risk.events < 2) d.nearMissNow(); return d.risk.events; }),
        { timeout: 30_000, intervals: [300] }).toBe(2);
    await expect(page.locator('#risk-hud .rk-mult')).toHaveText('×3');
    const pts = await page.evaluate(() => window.__raceDebug.risk.points);
    expect(pts).toBe(50 + 100);
    await page.evaluate(() => window.__raceDebug.end('win'));
    await expect(page.locator('#finish-screen .fin-risk')).toContainText('150', { timeout: 20_000 });
    await expect(page.locator('#finish-screen .fin-risk')).toContainText('×3');
    expect(problems).toEqual([]);
});

// Серия дней: огонёк в меню, сундук дня забирается один раз — фишки и жвачки на счёт
test('серия дней: сундук дня', async ({ page }) => {
    const problems = watchProblems(page);
    await login(page);
    await expect(page.locator('#mm-streak')).toBeVisible();
    await expect(page.locator('#mm-streak-n')).toHaveText('1');
    await expect(page.locator('#mm-badge-chest')).toBeVisible();
    await page.locator('#mm-streak').click();
    await expect(page.locator('.chest-modal')).toContainText('Серия: 1 день подряд');
    await page.locator('.ch-claim').click();
    await expect(page.locator('.chest-modal .ch-got')).toContainText('+70 Е'); // сундук без жвачек: бывшие 🍬 — в «Е»
    await page.locator('.ch-later').click();
    await expect(page.locator('.chest-modal')).toHaveCount(0);
    await expect(page.locator('#mm-badge-chest')).toBeHidden();
    await expect(page.locator('#mm-chips')).toHaveText('70');
    // вернулся на следующий день — серия 2 и сундук предлагается сам
    await page.evaluate(() => {
        const l = JSON.parse(localStorage.getItem('road_racing_profiles_v1'));
        const d = new Date(); d.setDate(d.getDate() - 1);
        const k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        l.forEach(p => { p.streak = { count: 1, last: k, claimed: k }; });
        localStorage.setItem('road_racing_profiles_v1', JSON.stringify(l));
    });
    await page.reload();
    await page.locator('#splash-screen').click();
    await page.locator('#profile-list').getByText('Тестер').click();
    await expect(page.locator('.chest-modal')).toContainText('Серия: 2 дня подряд');
    await page.locator('.ch-claim').click();
    await expect(page.locator('.chest-modal .ch-got')).toContainText('+110 Е');
    expect(problems).toEqual([]);
});

// «Привет, Имя!» после заставки: новости (машины в подарок, тест-драйвы…) → «Смотреть» — витрина; 7 дней подряд — «Тебе подарок!»
test('«Привет» с новостями, машины в подарок: витрина и подарок за 7 дней подряд', async ({ page }) => {
    const problems = watchProblems(page);
    await page.addInitScript(() => { sessionStorage.setItem('keep_hello', '1'); sessionStorage.setItem('keep_giftintro', '1'); });
    await login(page);
    const hello = page.locator('.hello-modal');
    await expect(hello).toContainText('Тестер', { timeout: 15_000 });
    await expect(hello.locator('.hn-item.new')).toHaveCount(4); // новых — не больше 4, остальные — в «Ранее»
    await expect(hello.locator('.hn-item.new').first()).toContainText('Машина недели');
    await expect(hello.locator('.hn-old')).toContainText('Машины в подарок'); // старые новости — свёрнуты в «Ранее»
    await expect(hello.locator('.hn-row[data-act="week"]')).toContainText(/\/ \d+\s000 м/);
    await hello.locator('.hn-go').click();
    await expect(hello).toHaveCount(0);
    await page.locator('.mm-tab[data-menu="cars"]').click();
    await expect(page.locator('#shop-screen')).toBeVisible();
    await page.locator('#shop-cars .shop-car-btn[data-car="trike"]').click();
    await expect(page.locator('#shop-action')).toContainText('ТОЛЬКО В ПОДАРОК');
    await expect(page.locator('#shop-desc')).toContainText('из 7 дней');
    await expect(page.locator('#shop-cars .shop-car-btn.gift')).toHaveCount(2); // подарочные — золотые
    // седьмой день подряд (сундук сегодня уже забран — не мешает)
    await page.evaluate(() => {
        const d = new Date(), p2 = n => (n < 10 ? '0' : '') + n, today = d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate());
        const l = JSON.parse(localStorage.getItem('road_racing_profiles_v1'));
        l.forEach(p => { p.streak = { count: 7, last: today, claimed: today }; });
        localStorage.setItem('road_racing_profiles_v1', JSON.stringify(l));
    });
    await page.reload();
    await page.locator('#splash-screen').click();
    await page.locator('#profile-list').getByText('Тестер').click();
    await expect(page.locator('.giftcar-modal')).toContainText('Тебе подарок', { timeout: 15_000 });
    await expect(page.locator('.giftcar-modal')).toContainText('Трайк');
    await page.locator('.giftcar-modal .nc-go').click();
    await expect(page.locator('#shop-action')).toContainText('ВЫБРАТЬ');
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('road_racing_profiles_v1'))[0].unlockedCars)).toContain('trike');
    expect(problems).toEqual([]);
});

// крючки: секретная краска за 10 заездов в 3 дня и билет тест-драйва за 2 главы — на итогах; билет — кнопка в меню и заезд на чужой машине
test('секретная краска и тест-драйв за вехи: плашки на итогах, билет в меню, один заезд', async ({ page }) => {
    const problems = watchProblems(page);
    await login(page);
    await page.evaluate(() => {
        const d = new Date(), k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        const l = JSON.parse(localStorage.getItem('road_racing_profiles_v1'));
        l.forEach(p => { p.campaign = Object.assign(p.campaign || {}, { completed: [0, 1] }); p.activity = { [k]: 9 }; p.streak = { count: 1, last: k, claimed: k }; });
        localStorage.setItem('road_racing_profiles_v1', JSON.stringify(l));
    });
    await page.reload();
    await page.locator('#splash-screen').click();
    await page.locator('#profile-list').getByText('Тестер').click();
    await expect(page.locator('#mm-td')).not.toHaveClass(/has/);
    await page.locator('.menu-card[data-menu="infinite"]').click();
    await page.locator('#shop-action').click();
    await waitRacing(page);
    await page.evaluate(() => window.__raceDebug.end('crash'));
    await expect(page.locator('#finish-screen .fin-paint')).toContainText('Неон');
    await expect(page.locator('#finish-screen .fin-td')).toContainText('Ракета');
    await page.locator('#finish-menu-btn').click();
    await expect(page.locator('#mm-td')).toHaveClass(/has/);
    await expect(page.locator('#mm-td-text')).toContainText('Ракета');
    await page.locator('#mm-td').click();
    await page.locator('.td-ticket').first().click();
    await waitRacing(page);
    const p = await page.evaluate(() => JSON.parse(localStorage.getItem('road_racing_profiles_v1'))[0]);
    expect(p.testDrives.tickets).toEqual([]);
    expect(p.secretPaints.got.neon).toBeTruthy();
    await page.evaluate(() => window.__raceDebug.end('crash'));
    await expect(page.locator('#finish-screen')).toContainText('Тест-драйв: «Ракета»');
    expect(problems).toEqual([]);
});

// подарок за возвращение (3+ дня без игры), именной номер за 14 дней подряд, машина недели на итогах бесконечной
test('подарок за возвращение, именной номер, машина недели', async ({ page }) => {
    const problems = watchProblems(page);
    await page.addInitScript(() => sessionStorage.setItem('keep_hello', '1'));
    await login(page);
    await page.locator('.hello-modal .hn-go').click();
    const seed = async (days, count) => {
        await page.evaluate(([days, count]) => {
            const d = new Date(); d.setDate(d.getDate() - days);
            const k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
            const l = JSON.parse(localStorage.getItem('road_racing_profiles_v1'));
            l.forEach(p => { p.streak = { count: count, last: k, claimed: k }; });
            localStorage.setItem('road_racing_profiles_v1', JSON.stringify(l));
        }, [days, count]);
        await page.reload();
        await page.locator('#splash-screen').click();
        await page.locator('#profile-list').getByText('Тестер').click();
    };
    // не было 5 дней
    await seed(5, 3);
    const gift = page.locator('.hello-modal .hn-gift');
    await expect(gift).toContainText('С возвращением', { timeout: 15_000 });
    const chips = await page.evaluate(() => JSON.parse(localStorage.getItem('road_racing_profiles_v1'))[0].season.chips || 0);
    await gift.locator('.hn-claim').click();
    await expect(gift.locator('.hn-got')).toContainText('+400 Е');
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('road_racing_profiles_v1'))[0].season.chips)).toBe(chips + 400);
    await page.locator('.hello-modal .hn-go').click();
    // 14-й день подряд
    await seed(1, 13);
    await expect(page.locator('.giftcar-modal')).toContainText('Трайк', { timeout: 15_000 }); // 7+ дней подряд — сначала подарок «Трайк», «Привет» — после
    await page.locator('.giftcar-modal .nc-later').click();
    await expect(page.locator('.hello-modal .hn-gift')).toContainText('Именной номер', { timeout: 15_000 });
    await page.locator('.hello-modal .hn-go').click();
    await expect(page.locator('.chest-modal')).toBeVisible(); // сундук дня — после «Привет», а не поверх
    await page.locator('.chest-modal .ch-later').click();
    // машина недели — прогресс на итогах бесконечной
    await page.locator('.menu-card[data-menu="infinite"]').click();
    await page.locator('#shop-action').click();
    await waitRacing(page);
    await page.keyboard.down('w');
    await expect.poll(() => page.evaluate(() => window.__raceDebug.inf ? window.__raceDebug.inf.dist : 0), { timeout: 20_000 }).toBeGreaterThan(30); // хоть немного проехать
    await page.keyboard.up('w');
    await page.evaluate(() => window.__raceDebug.end('crash'));
    await page.locator('.cc-no').click(); // «Е» за возвращение есть — предлагают «Дальше за 100 Е»; к итогам
    await expect(page.locator('#finish-screen .fin-week-prog')).toContainText('Машина недели');
    expect(problems).toEqual([]);
});
