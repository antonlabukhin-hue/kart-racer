import { defineConfig } from '@playwright/test';

// Тесты гоняют собранную игру (как на сайте): npm run build + vite preview
export default defineConfig({
    testDir: 'tests/e2e',
    workers: 1,
    retries: process.env.CI ? 1 : 0,
    timeout: 90_000,
    reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
    use: {
        baseURL: 'http://localhost:4199/',
        viewport: { width: 1000, height: 650 },
        screenshot: 'only-on-failure',
        trace: 'retain-on-failure',
        launchOptions: {
            args: ['--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'],
        },
    },
    // каждый прогон заново собирает игру, чтобы не проверить старый dist/
    webServer: {
        command: 'npx vite build --logLevel error && npx vite preview --port 4199 --strictPort',
        url: 'http://localhost:4199/',
        reuseExistingServer: false,
        timeout: 120_000,
    },
});
