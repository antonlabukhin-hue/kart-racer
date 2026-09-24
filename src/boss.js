/**
 * Мини-боссы кампании
 * createArcadeBossMesh / spawnBoss / updateBoss пока живут в initGame (game.js)
 * Сюда вынесем после стабилизации импортов THREE и materials cache.
 */
export const BOSS_MODULE_READY = false;

export function createArcadeBossMesh() {
  throw new Error('boss.js: createArcadeBossMesh ещё не перенесён — используй game/initGame');
}
