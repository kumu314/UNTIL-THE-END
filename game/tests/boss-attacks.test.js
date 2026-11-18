import { describe, expect, it, vi } from 'vitest';

vi.mock('phaser', () => ({ default: {
  Physics: { Arcade: { Sprite: class {} } },
  Geom: {
    Circle: class {
      constructor(x, y, radius) { Object.assign(this, { x, y, radius }); }
    },
    Intersects: {
      RectangleToRectangle: () => true,
      CircleToRectangle: (circle, rect) => circle.x >= rect.x && circle.x <= rect.x + rect.width,
    },
  },
  Math: {
    Angle: { Between: (x, y, tx, ty) => Math.atan2(ty - y, tx - x) },
    RadToDeg: (angle) => angle * 180 / Math.PI,
    Distance: { Between: (x, y, tx, ty) => Math.hypot(tx - x, ty - y) },
    Between: (min) => min,
  },
} }));

import BossTeacher from '../src/ai/BossTeacher.js';
import BossAdmin from '../src/ai/BossAdmin.js';
import { ProjectilePool } from '../src/ai/AIProjectiles.js';
import { BOSS } from '../src/config/aiConfig.js';

function makeBoss(Cls, kind, skill) {
  const shape = () => {
    const item = { destroy: vi.fn() };
    for (const name of ['setStrokeStyle', 'setDepth', 'setRotation', 'setAlpha']) {
      item[name] = vi.fn(() => item);
    }
    return item;
  };
  const scene = {
    add: { rectangle: vi.fn(shape), circle: vi.fn(shape) },
    ai: { bullets: { spawn: vi.fn(() => ({})) } },
    time: { now: 0, delayedCall: (_delay, callback) => callback() },
    tweens: { add: vi.fn() },
    cameras: { main: { scrollX: 0, scrollY: 0, width: 480, shake: vi.fn() } },
    events: { emit: vi.fn() },
  };
  const player = { x: 120, y: 240, takeDamage: vi.fn(), getBounds: () => ({}) };
  return Object.assign(Object.create(Cls.prototype), {
    active: true, defeated: false, x: 220, y: 208, groundY: 240,
    hp: 100, hpMax: 100, phase: 1, kind, cfg: BOSS[kind], player, scene,
    body: { setVelocityX: vi.fn() }, arena: { left: 0, right: 480 },
    nextBarrageAt: Infinity, cooldownScale: 1,
    pickSkill: () => skill, actionState: 'WANDER', actionTimer: 0,
    _introPlayed: true, hurtUntil: 0,
    setFlipX: vi.fn(), setAnim: vi.fn(), getBounds: () => ({}),
  });
}

function finishWindup(boss) {
  for (let tick = 1; tick <= 12; tick += 1) {
    boss.scene.time.now = tick * 40;
    boss.update(tick * 40, 40);
  }
}

describe('Boss attacks follow the on-screen warning', () => {
  it('does not damage a player overlapping the sprite while the boss winds up', () => {
    const boss = makeBoss(BossTeacher, 'teacher', 'sweep');
    boss.player.x = boss.x;
    boss.update(0, 16);
    expect(boss.player.takeDamage).not.toHaveBeenCalled();
    expect(boss.scene.ai.bullets.spawn).not.toHaveBeenCalled();
  });

  it('keeps the chalk volley aimed along the line shown before the player crosses sides', () => {
    const boss = makeBoss(BossTeacher, 'teacher', 'snipe');
    boss.beginSelect();
    boss.player.x = 340;
    finishWindup(boss);
    expect(boss.scene.ai.bullets.spawn).toHaveBeenCalledWith(expect.objectContaining({ vx: expect.any(Number) }));
    expect(boss.scene.ai.bullets.spawn.mock.calls[0][0].vx).toBeLessThan(0);
  });

  it('drops the dictionary at the previously marked spot', () => {
    const boss = makeBoss(BossTeacher, 'teacher', 'audit');
    boss.beginSelect();
    boss.player.x = 360;
    finishWindup(boss);
    expect(boss.scene.ai.bullets.spawn).toHaveBeenCalledWith(expect.objectContaining({
      x: 120, targetY: boss.groundY, texture: 'bullet_dictionary',
    }));
  });

  it('keeps the smoke rings on the side shown during the warning', () => {
    const boss = makeBoss(BossAdmin, 'employer', 'smoke');
    boss.beginSelect();
    boss.player.x = 350;
    finishWindup(boss);
    expect(boss.scene.ai.bullets.spawn.mock.calls[0][0].vx).toBeLessThan(0);
  });

  it('warns before each letter volley and keeps the normal attack animation free of barrage overrides', () => {
    const boss = makeBoss(BossAdmin, 'employer', 'smoke');
    boss.beginSelect(0);
    boss.phase = 2;
    boss.nextBarrageAt = 0;
    finishWindup(boss);
    expect(boss.pendingSkill).toBe('smoke');
    expect(boss.scene.ai.bullets.spawn).not.toHaveBeenCalledWith(
      expect.objectContaining({ texture: 'bullet_letter' }),
    );

    boss.clearTelegraphs();
    boss.actionState = 'WANDER';
    boss.beginSelect(480);
    expect(boss.pendingSkill).toBe('letters');
    const [first, second] = boss.attackWaves;
    expect(first.warnings).toHaveLength(2);
    expect(second.warnings).toBeUndefined();
    boss.scene.ai.bullets.spawn.mockClear();
    boss.update(520, 40);
    expect(boss.scene.ai.bullets.spawn).not.toHaveBeenCalled();
    finishWindup(boss);
    expect(second.warnings).toHaveLength(2);
    expect(boss.scene.ai.bullets.spawn).toHaveBeenCalledTimes(2);
  });

  it('damages at the dictionary impact once and then removes the landing warning', () => {
    const warning = { scene: {}, destroy: vi.fn() };
    const player = { body: { x: 113, y: 214, width: 14, height: 21 }, takeDamage: vi.fn() };
    const scene = {
      player, physics: { world: { bounds: { x: 0, y: 0, right: 480, bottom: 270 } } },
      add: { circle: vi.fn(() => ({ setDepth() { return this; } })) },
      tweens: { add: vi.fn() },
    };
    const pool = new ProjectilePool(scene);
    const book = {
      active: true, scene, x: 120, y: 216, vx: 0, vy: 100, gravity: 0, displayHeight: 20,
      life: 3, damage: 20, faction: 'enemy', aoeRadius: 30, targetY: 240,
      source: 'boss:teacher:audit', warning, getBounds: () => ({}),
      setActive(active) { this.active = active; }, setVisible: vi.fn(), clearTint: vi.fn(),
    };
    pool.pool = [book];
    pool.update(40, 40);
    expect(player.takeDamage).not.toHaveBeenCalled();
    expect(warning.destroy).not.toHaveBeenCalled();
    for (let time = 80; time <= 240; time += 40) pool.update(time, 40);
    expect(player.takeDamage).toHaveBeenCalledOnce();
    expect(player.takeDamage).toHaveBeenCalledWith(20, expect.objectContaining({ source: 'boss:teacher:audit' }));
    expect(warning.destroy).toHaveBeenCalledOnce();
    expect(scene.add.circle).toHaveBeenCalledWith(120, 240, 30, expect.any(Number), expect.any(Number));
  });
});
