import Phaser from 'phaser';
import BossBase from './BossBase.js';

export class BossAdmin extends BossBase {
  constructor(scene, x, y, arena) {
    super(scene, x, y, 'employer', arena);
  }

  skillAnim(id) {
    return { smoke: 'smoke', stamp: 'slam', letters: 'envelopes' }[id];
  }

  planSkill(id) {
    const damage = this.cfg.damage;
    if (id === 'smoke') {
      const dir = Math.sign(this.player.x - this.x) || 1;
      const shot = {
        x: this.x + dir * 24, y: this.groundY - 20, vx: dir * 55, vy: 0,
        texture: 'bullet_ring', damage: damage.smoke, source: 'boss:employer:smoke',
        life: 3.2, slow: { mult: 0.7, duration: 2 },
      };
      return [0, 160, 320].map((at) => ({ at, warn: at === 0, shots: [shot] }));
    }

    if (id === 'stamp') {
      return [{ at: 0, shots: [-1, 1].map((dir) => ({
        x: this.x + dir * 18, y: this.groundY - 5,
        vx: dir * 150, vy: 0, angle: dir < 0 ? 180 : 0,
        texture: 'bullet_shockwave', damage: damage.stamp, source: 'shockwave', life: 2.2,
      })) }];
    }

    const cam = this.scene.cameras.main;
    const ticks = [];
    for (let at = 0; at < this.cfg.letterRainDuration * 1000; at += 320) {
      const right = cam.scrollX + cam.width - 16;
      const left = cam.scrollX + 16;
      const mid = Math.floor((left + right) / 2);
      const shots = [
        Phaser.Math.Between(Math.ceil(left), mid - 16),
        Phaser.Math.Between(mid + 16, Math.floor(right)),
      ].map((x) => ({
        x, y: cam.scrollY - 16, vx: 0, vy: 100,
        texture: 'bullet_letter', damage: damage.letter, source: 'boss:employer:letters', life: 4,
      }));
      ticks.push({ at, shots });
    }
    return ticks;
  }

  onSkillRelease(id) {
    if (id === 'stamp') {
      this.scene.cameras.main.shake(240, 0.006);
      this.scene.events.emit('ai:fx', { type: 'slam', x: this.x, y: this.groundY, wide: 170 });
    } else if (id === 'letters') {
      this.letterRainActive = true;
      this.scene.events.emit('ai:fx', { type: 'barrage', kind: 'letter' });
    }
  }
}

export default BossAdmin;
