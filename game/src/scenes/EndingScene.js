import Phaser from 'phaser';
import { playVideo } from '../ui/VideoOverlay.js';
import { addSceneText } from '../ui/SceneText.js';

const PHOTO_KEY = 'ending_group_photo';

/** 静态片尾：沿用黑屏文本结局，在其后展示大合照与制作名单。 */
export default class EndingScene extends Phaser.Scene {
  constructor() {
    super('EndingScene');
  }

  preload() {
    // 按需加载，避免让片尾图片增加第一关的启动等待。
    if (!this.textures.exists(PHOTO_KEY)) {
      this.load.image(PHOTO_KEY, 'assets/ending/group-photo.png');
    }
  }

  async create() {
    this.leaving = false;
    this.cameras.main.setBackgroundColor('#171c26');

    // 结局视频：先看完（或跳过）再露出片尾合照；视频缺失/失败时直接继续，不阻塞流程。
    await playVideo('assets/video/ending.mp4', { skipAfterMs: 2500 });
    if (!this.sys.isActive()) return;

    const text = (x, y, value, options) => addSceneText(this, x, y, value, options);

    text(18, 22, '见我', { size: 24, weight: 700, name: 'ending-title' });
    text(19, 56, 'UNTIL THE END', { size: 9, weight: 600, color: '#c7bfb2' });
    this.add.rectangle(158, 136, 1, 226, 0x64533f);
    text(18, 87, '制作团队', { size: 12, color: '#d4b783', weight: 650 });
    ['李姝怡', '贾明杰', '邓宜安', '赵紫阳', '任涵毓'].forEach((name, i) => {
      text(18, 111 + i * 17, name, { size: 11, name: 'ending-credit' });
    });
    text(18, 202, '谢谢你，走到这里。', { size: 9, color: '#c7bfb2' });

    this.add.rectangle(318, 120, 296, 200, 0x302a28).setStrokeStyle(1, 0xa5875b);
    if (this.textures.exists(PHOTO_KEY)) {
      // 3:2 原图完整展示；不裁人物，不改变场景和碰撞配置。
      this.add.image(318, 120, PHOTO_KEY).setDisplaySize(288, 192);
    } else {
      // 图片加载失败仍有文字片尾和返回入口，不能卡死通关流程。
      text(318, 120, '这一路，有你们真好。', { size: 11, center: true });
    }
    text(318, 234, '人生不是一场必须要赢的战斗。', { size: 11, center: true, name: 'ending-line' });
    text(318, 251, '走过的每一步，都算数。', { size: 11, center: true, color: '#d4b783', name: 'ending-line' });

    const { element: button } = text(80, 237, '返回第一关  ↵', {
      size: 10, weight: 650, center: true, width: 124, tag: 'button', name: 'ending-return',
    });
    button.type = 'button';
    Object.assign(button.style, {
      fontFamily: 'inherit', pointerEvents: 'auto', cursor: 'pointer',
      height: 'calc(24 * var(--scene-unit))', background: '#39362f', border: '1px solid #9d835c',
    });
    const goBack = () => {
      if (this.leaving) return;
      this.leaving = true;
      this.scene.start('StageScene', { phase: 'youth' });
    };
    button.addEventListener('click', goBack);
    this.input.keyboard?.on('keydown-ENTER', goBack);
    this.input.keyboard?.on('keydown-SPACE', goBack);
    this.events.once('shutdown', () => {
      this.input.keyboard?.off('keydown-ENTER', goBack);
      this.input.keyboard?.off('keydown-SPACE', goBack);
    });
  }
}
