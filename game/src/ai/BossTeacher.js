import Phaser from 'phaser';
import BossBase from './BossBase.js';

export class BossTeacher extends BossBase {
  constructor(scene, x, y, arena) {
    super(scene, x, y, 'teacher', arena);
  }

  skillAnim(id) {
    return { sweep: 'sweep', snipe: 'throw_chalk', audit: 'summon', paper: 'enraged' }[id];
  }

  planSkill(id) {
    const damage = this.cfg.damage;
    if (id === 'sweep') {
      return [{ at: 0, shots: [-1, 1].map((dir) => ({
        x: this.x + dir * 14, y: this.groundY - 5,
        vx: dir * 130, vy: 0, angle: dir < 0 ? 180 : 0,
        texture: 'bullet_shockwave', damage: damage.sweep,
        source: 'boss:teacher:sweep', life: 2.2,
      })) }];
    }

    if (id === 'snipe') {
      const y = this.groundY - 38;
      const targetY = this.player.body?.center.y ?? this.player.y - 10;
      const angle = Phaser.Math.Angle.Between(this.x, y, this.player.x, targetY);
      const shot = {
        x: this.x + Math.cos(angle) * 16, y: y + Math.sin(angle) * 16,
        vx: Math.cos(angle) * 180, vy: Math.sin(angle) * 180,
        angle: Phaser.Math.RadToDeg(angle),
        texture: 'bullet_chalk_boss', anim: 'projectiles:chalk', hitSize: 8,
        damage: damage.snipe, source: 'boss:teacher:snipe', life: 1.8,
      };
      return [0, 120, 240].map((at) => ({ at, warn: at === 0, shots: [shot] }));
    }

    const cam = this.scene.cameras.main;
    if (id === 'audit') {
      return [{ at: 0, shots: [{
        x: this.player.x, y: cam.scrollY - 16, vx: 0, vy: 0, gravity: 500,
        texture: 'bullet_dictionary', damage: damage.audit, source: 'boss:teacher:audit', life: 3,
        aoeRadius: 30, targetY: this.groundY,
      }] }];
    }

    const cols = 6;
    const gapA = Phaser.Math.Between(0, cols - 1);
    const gapB = (gapA + 2 + Phaser.Math.Between(0, 1)) % cols;
    const shots = [];
    for (let col = 0; col < cols; col += 1) {
      if (col === gapA || col === gapB) continue;
      shots.push({
        x: cam.scrollX + 16 + ((cam.width - 32) / (cols - 1)) * col,
        y: cam.scrollY - 20, vx: 0, vy: this.cfg.paperFallSpeed,
        texture: 'bullet_paper', damage: damage.paper, source: 'boss:teacher:paper',
        life: 4, angle: 90,
      });
    }
    return [{ at: 0, shots }];
  }

  onSkillRelease(id) {
    if (id === 'sweep') {
      this.scene.cameras.main.shake(180, 0.004);
      this.scene.events.emit('ai:fx', { type: 'slam', x: this.x, y: this.groundY, wide: 160 });
    } else if (id === 'paper') {
      this.scene.events.emit('ai:fx', { type: 'barrage', kind: 'paper' });
    }
  }
}

export default BossTeacher;
