export interface Vector2 {
  x: number;
  y: number;
}

export interface WeaponConfig {
  id: string;
  name: string;
  description: string;
  type: 'gun' | 'ring' | 'orb' | 'lightning' | 'spike' | 'storm' | 'gravity' | 'thunderstorm';
  damage: number;
  cooldown: number;
  bulletSpeed?: number;
  pierce?: number;
  range?: number;
  directions?: number;
  orbCount?: number;
  orbRadius?: number;
  orbSpeed?: number;
  chainCount?: number;
  jumpRange?: number;
  radius?: number;
  pullRadius?: number;
  explosionRadius?: number;
  pullForce?: number;
  lightningCount?: number;
  maxLevel: number;
  evolvesWith?: string;
  isEvolution?: boolean;
  upgrades?: Array<Record<string, number>>;
}

export interface WeaponInstance {
  configId: string;
  level: number;
  currentStats: WeaponConfig;
  cooldownTimer: number;
}

export interface EnemyConfig {
  id: string;
  name: string;
  color: string;
  size: number;
  health: number;
  speed: number;
  damage: number;
  expValue: number;
  spawnWeight: number;
  startTime: number;
  dashSpeed?: number;
  dashDuration?: number;
  dashCooldown?: number;
}

export interface PassiveUpgrade {
  id: string;
  name: string;
  description: string;
  type: 'passive';
  effect: 'moveSpeed' | 'maxHealth' | 'pickupRange' | 'healRate' | 'damageBonus' | 'cooldownReduction';
  value: number;
  maxLevel: number;
}

export interface UpgradeOption {
  id: string;
  name: string;
  description: string;
  type: 'weapon' | 'passive' | 'evolution';
  level: number;
  maxLevel: number;
  isNew: boolean;
  isEvolution?: boolean;
  evolvesFrom?: string[];
  evolvesTo?: string;
}

export interface Entity {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  dead: boolean;
}

export interface Player extends Entity {
  health: number;
  maxHealth: number;
  moveSpeed: number;
  baseMoveSpeed: number;
  exp: number;
  expToNext: number;
  level: number;
  pickupRange: number;
  basePickupRange: number;
  healRate: number;
  damageBonus: number;
  cooldownReduction: number;
  weapons: WeaponInstance[];
  passiveLevels: Record<string, number>;
  invincibleTimer: number;
}

export interface Enemy extends Entity {
  type: string;
  health: number;
  maxHealth: number;
  speed: number;
  damage: number;
  expValue: number;
  color: string;
  dashTimer?: number;
  dashCooldownTimer?: number;
  isDashing?: boolean;
}

export interface Bullet extends Entity {
  damage: number;
  pierce: number;
  hitEnemies: Set<number>;
  lifeTime: number;
  color: string;
  trail: Vector2[];
}

export interface ExpGem extends Entity {
  value: number;
  pulsePhase: number;
}

export interface DamageNumber {
  id: number;
  x: number;
  y: number;
  value: number;
  lifeTime: number;
  maxLifeTime: number;
  color: string;
}

export interface OrbitBall {
  angle: number;
  radius: number;
  speed: number;
  damage: number;
  hitCooldown: Map<number, number>;
}

export interface LightningEffect {
  id: number;
  points: Vector2[];
  lifeTime: number;
  maxLifeTime: number;
}

export interface SpikeEffect {
  id: number;
  x: number;
  y: number;
  radius: number;
  lifeTime: number;
  maxLifeTime: number;
  damage: number;
  hitEnemies: Set<number>;
}

export interface GravityEffect {
  id: number;
  x: number;
  y: number;
  pullRadius: number;
  pullForce: number;
  explosionRadius: number;
  damage: number;
  pullDuration: number;
  pullTimer: number;
  exploded: boolean;
  hitEnemies: Set<number>;
}

export interface GameState {
  paused: boolean;
  gameOver: boolean;
  levelUp: boolean;
  time: number;
  kills: number;
  upgradeOptions: UpgradeOption[];
}

export interface SpatialGrid {
  cellSize: number;
  cells: Map<string, Array<Enemy | Bullet | ExpGem>>;
}
