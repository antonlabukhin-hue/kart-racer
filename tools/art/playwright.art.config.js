// Рендер картинок игры из самого движка: npm run art
// Тестовая сборка (есть window.__raceDebug) → настоящие заезды → камера → кадр без интерфейса.
import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: '.',
    testMatch: 'render.spec.js',
    workers: 1,
    timeout: 600_000,
    reporter: 'list',
    use: {
        baseURL: 'http://localhost:4399/',
        locale: 'ru-RU',
        channel: process.env.ART_CHANNEL || 'msedge',
        deviceScaleFactor: 1,
        launchOptions: { args: ['--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] },
    },
    webServer: {
        command: 'npx vite build --mode test --outDir dist-test --logLevel error && npx vite preview --outDir dist-test --port 4399 --strictPort',
        url: 'http://localhost:4399/',
        cwd: '../..',
        reuseExistingServer: false,
        timeout: 120_000,
    },
});
