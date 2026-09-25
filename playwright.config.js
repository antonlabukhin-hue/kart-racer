import { defineConfig } from '@playwright/test';

// Два набора тестов:
// site      — tests/e2e: ровно та сборка, что уходит на сайт (npm run build + vite preview);
// scenarios — tests/e2e/scenarios: тестовая сборка (npm run build:test), заезд можно начать
//             с середины трассы (?start=0.4), чтобы быстро доехать до босса и финиша
export default defineConfig({
    workers: 1,
    retries: process.env.CI ? 1 : 0,
    timeout: 90_000,
    reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
    use: {
        viewport: { width: 1000, height: 650 },
        screenshot: 'only-on-failure',
        trace: 'retain-on-failure',
        launchOptions: {
            args: ['--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'],
        },
    },
    projects: [
        { name: 'site', testDir: 'tests/e2e', testIgnore: 'scenarios/**', use: { baseURL: 'http://localhost:4199/' } },
        // победный облёт камеры на сервере GitHub идёт ~20 с, плюс вход и меню — нужен запас
        { name: 'scenarios', testDir: 'tests/e2e/scenarios', timeout: 180_000, use: { baseURL: 'http://localhost:4299/' } },
    ],
    // каждый прогон заново собирает игру, чтобы не проверить старый dist/
    webServer: [
        {
            command: 'npx vite build --logLevel error && npx vite preview --port 4199 --strictPort',
            url: 'http://localhost:4199/',
            reuseExistingServer: false,
            timeout: 120_000,
        },
        {
            command: 'npx vite build --mode test --outDir dist-test --logLevel error && npx vite preview --outDir dist-test --port 4299 --strictPort',
            url: 'http://localhost:4299/',
            reuseExistingServer: false,
            timeout: 120_000,
        },
    ],
});
