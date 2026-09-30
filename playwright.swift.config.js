// Как в CI на Linux: Edge без видеокарты (программная отрисовка) — ловит тесты, которые падают только на медленной машине
import base from './playwright.config.js';
export default { ...base, use: { ...base.use, channel: 'msedge', launchOptions: { args: [...base.use.launchOptions.args, '--disable-gpu'] } } };
