import type {
  Player,
  Enemy,
  Bullet,
  ExpGem,
  DamageNumber,
  LightningEffect,
  SpikeEffect,
  GravityEffect,
  EnemyConfig,
  WeaponConfig
} from './types';
import { nextEntityId, randomRange } from './utils';
import weaponsConfig from './config/weapons.json';

export function createPlayer(): Player {
  return {
    id: nextEntityId(),
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    radius: 16,
    dead: false,
    health: 100,
    maxHealth: 100,
    moveSpeed: 200,
    baseMoveSpeed: 200,
    exp: 0,
    expToNext: 20,
    level: 1,
    pickupRange: 80,
    basePickupRange: 80,
    healRate: 0.5,
    damageBonus: 0,
    cooldownReduction: 0,
    weapons: [
      {
        configId: 'basicGun',
        level: 1,
        currentStats: { ...(weaponsConfig as unknown as Record<string, WeaponConfig>).basicGun },
        cooldownTimer: 0
      }
    ],
    passiveLevels: {},
    invincibleTimer: 0
  };
}

export function createEnemy(
  config: EnemyConfig,
  x: number,
  y: number,
  difficultyMultiplier: number
): Enemy {
  const scaledHealth = Math.floor(config.health * difficultyMultiplier);
  const enemy: Enemy = {
    id: nextEntityId(),
    type: config.id,
    x,
    y,
    vx: 0,
    vy: 0,
    radius: config.size,
    dead: false,
    health: scaledHealth,
    maxHealth: scaledHealth,
    speed: config.speed,
    damage: config.damage,
    expValue: config.expValue,
    color: config.color
  };

  if (config.id === 'dasher') {
    enemy.dashTimer = 0;
    enemy.dashCooldownTimer = config.dashCooldown || 2;
    enemy.isDashing = false;
  }

  return enemy;
}

export function createBullet(
  x: number,
  y: number,
  dx: number,
  dy: number,
  speed: number,
  damage: number,
  pierce: number,
  color: string = '#ffff00',
  lifeTime: number = 3
): Bullet {
  return {
    id: nextEntityId(),
    x,
    y,
    vx: dx * speed,
    vy: dy * speed,
    radius: 6,
    dead: false,
    damage,
    pierce,
    hitEnemies: new Set(),
    lifeTime,
    color,
    trail: []
  };
}

export function createExpGem(
  x: number,
  y: number,
  value: number
): ExpGem {
  return {
    id: nextEntityId(),
    x: x + randomRange(-10, 10),
    y: y + randomRange(-10, 10),
    vx: randomRange(-30, 30),
    vy: randomRange(-30, 30),
    radius: 8,
    dead: false,
    value,
    pulsePhase: Math.random() * Math.PI * 2
  };
}

export function createDamageNumber(
  x: number,
  y: number,
  value: number,
  color: string = '#ffffff'
): DamageNumber {
  return {
    id: nextEntityId(),
    x: x + randomRange(-10, 10),
    y,
    value,
    lifeTime: 1,
    maxLifeTime: 1,
    color
  };
}

export function createLightningEffect(
  points: { x: number; y: number }[]
): LightningEffect {
  return {
    id: nextEntityId(),
    points,
    lifeTime: 0.3,
    maxLifeTime: 0.3
  };
}

export function createSpikeEffect(
  x: number,
  y: number,
  radius: number,
  damage: number
): SpikeEffect {
  return {
    id: nextEntityId(),
    x,
    y,
    radius,
    lifeTime: 0.5,
    maxLifeTime: 0.5,
    damage,
    hitEnemies: new Set()
  };
}

export function createGravityEffect(
  x: number,
  y: number,
  pullRadius: number,
  pullForce: number,
  explosionRadius: number,
  damage: number
): GravityEffect {
  return {
    id: nextEntityId(),
    x,
    y,
    pullRadius,
    pullForce,
    explosionRadius,
    damage,
    pullDuration: 1.0,
    pullTimer: 1.0,
    exploded: false,
    hitEnemies: new Set()
  };
}
