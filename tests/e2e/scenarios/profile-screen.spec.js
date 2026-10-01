import { test, expect } from '@playwright/test';
import { login, watchProblems } from '../helpers.js';

// кружок у настроек → экран профиля: прогресс и аватарка (загрузка фото, видно в кружке, сохраняется после перезагрузки)
test('профиль: экран с прогрессом и загрузка аватарки', async ({ page }) => {
    const problems = watchProblems(page);
    await login(page);
    await expect(page.locator('#mm-avatar-btn')).toContainText('Т'); // без фото — первая буква имени
    await page.locator('#mm-avatar-btn').click();
    const card = page.locator('.pf-card');
    await expect(card).toContainText('Тестер');
    await expect(card).toContainText('Рекорд дальности');
    // крошечная картинка 2×2 (PNG)
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP4z8DwnwEJMIA4JAgAI8kH+W4u5ToAAAAASUVORK5CYII=', 'base64');
    await card.locator('.pf-file').setInputFiles({ name: 'ava.png', mimeType: 'image/png', buffer: png });
    await expect(card.locator('.pf-ava img')).toBeVisible();
    await expect(page.locator('#mm-avatar-btn img')).toHaveAttribute('src', /^data:image\/jpeg/);
    await card.locator('.pf-close').click();
    await page.reload();
    await page.locator('#splash-screen').click();
    await page.locator('#profile-list').getByText('Тестер').click();
    await expect(page.locator('#mm-avatar-btn img')).toBeVisible();
    expect(problems).toEqual([]);
});
