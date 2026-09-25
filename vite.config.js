// base './' — сайт открывается из подпапки /kart-racer/ на GitHub Pages
export default {
  base: './',
  // без подмены отсутствующих файлов на index.html: картинка, которой нет, даёт 404, как на GitHub Pages
  appType: 'mpa',
  // unit-тесты (npm run test:unit) лежат в tests/unit, e2e гоняет Playwright
  test: { dir: 'tests/unit' },
};
