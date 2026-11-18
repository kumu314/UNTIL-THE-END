import { GAME_HEIGHT, GAME_WIDTH } from '../config/gameConfig.js';
import { BattleHUD } from './BattleHUD.js';

/**
 * BattleHUD 挂载层
 *
 * BattleHUD 是成员 E 交付的纯 Canvas 2D 覆盖层（无 Phaser 依赖），
 * 但它需要一个外部 <canvas> 才能工作 —— 之前仓库里没有任何地方创建这个节点，
 * 所以整套 HUD 一直是死代码。本模块负责三件事：
 *
 *  1. 建一块全屏覆盖 canvas（pointer-events: none，不拦截鼠标键盘）
 *  2. 后备缓冲按屏幕实际像素绘制，布局坐标仍使用 480×270。
 *  3. 跟随窗口缩放 / Phaser ScaleManager 事件重新对齐。
 */
const CANVAS_ID = 'hud-overlay';

function ensureCanvas() {
  let canvas = document.getElementById(CANVAS_ID);
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = CANVAS_ID;
    Object.assign(canvas.style, {
      position: 'fixed',
      left: '0px',
      top: '0px',
      pointerEvents: 'none',
      zIndex: '10',
    });
    document.body.appendChild(canvas);
  }
  canvas.style.display = 'block';
  return canvas;
}

/**
 * @param {import('phaser').Game} game
 * @returns {{hud: BattleHUD, destroy: () => void}}
 */
export function mountBattleHud(game) {
  const canvas = ensureCanvas();

  const sync = () => {
    const src = game.canvas;
    if (!src) return;
    const rect = src.getBoundingClientRect();
    canvas.style.left = `${rect.left}px`;
    canvas.style.top = `${rect.top}px`;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    const ratio = window.devicePixelRatio || 1;
    const width = Math.max(1, Math.round(rect.width * ratio));
    const height = Math.max(1, Math.round(rect.height * ratio));
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
  };

  sync();
  window.addEventListener('resize', sync);
  game.scale.on('resize', sync);

  const hud = new BattleHUD(canvas);
  hud.setResolution(GAME_WIDTH, GAME_HEIGHT);

  const destroy = () => {
    window.removeEventListener('resize', sync);
    game.scale.off('resize', sync);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    canvas.style.display = 'none';
  };

  return { hud, destroy };
}

export default mountBattleHud;
