import type {
  Player,
  Enemy,
  Bullet,
  LightningEffect,
  SpikeEffect,
  GravityEffect,
  WeaponInstance,
  WeaponConfig,
  OrbitBall,
} from "./types";
import { normalize, distanceSq } from "./utils";
import {
  createBullet,
  createLightningEffect,
  createSpikeEffect,
  createGravityEffect,
} from "./entityFactory";
import weaponsConfig from "./config/weapons.json";

const weapons = weaponsConfig as unknown as Record<string, WeaponConfig>;

export class WeaponSystem {
  private orbitBalls: Map<string, OrbitBall[]> = new Map();
  private newBullets: Bullet[] = [];
  private newLightnings: LightningEffect[] = [];
  private newSpikes: SpikeEffect[] = [];
  private newGravityEffects: GravityEffect[] = [];

  getNewBullets(): Bullet[] {
    const result = this.newBullets;
    this.newBullets = [];
    return result;
  }

  getNewLightnings(): LightningEffect[] {
    const result = this.newLightnings;
    this.newLightnings = [];
    return result;
  }

  getNewSpikes(): SpikeEffect[] {
    const result = this.newSpikes;
    this.newSpikes = [];
    return result;
  }

  getNewGravityEffects(): GravityEffect[] {
    const result = this.newGravityEffects;
    this.newGravityEffects = [];
    return result;
  }

  getOrbitBalls(weaponId: string): OrbitBall[] {
    return this.orbitBalls.get(weaponId) || [];
  }

  updateOrbitBalls(
    weapon: WeaponInstance,
    _playerX: number,
    _playerY: number,
    dt: number,
  ): void {
    const config = weapon.currentStats;
    if (config.type !== "orb") return;

    let balls = this.orbitBalls.get(weapon.configId);
    const orbCount = config.orbCount || 1;

    if (!balls) {
      balls = [];
      this.orbitBalls.set(weapon.configId, balls);
    }

    while (balls.length < orbCount) {
      const angle = (balls.length / orbCount) * Math.PI * 2;
      balls.push({
        angle,
        radius: config.orbRadius || 80,
        speed: config.orbSpeed || 3,
        damage: config.damage,
        hitCooldown: new Map(),
      });
    }

    for (let i = 0; i < balls.length; i++) {
      const ball = balls[i];
      ball.angle += ball.speed * dt;
      ball.radius = config.orbRadius || 80;
      ball.speed = config.orbSpeed || 3;
      ball.damage = config.damage;

      ball.hitCooldown.forEach((cd, id) => {
        ball.hitCooldown.set(id, cd - dt);
        if (cd - dt <= 0) {
          ball.hitCooldown.delete(id);
        }
      });
    }

    while (balls.length > orbCount) {
      balls.pop();
    }
  }

  updateWeapon(
    weapon: WeaponInstance,
    player: Player,
    enemies: Enemy[],
    dt: number,
  ): void {
    const config = weapon.currentStats;
    const cooldownMultiplier = 1 - player.cooldownReduction;
    const effectiveCooldown = config.cooldown * cooldownMultiplier;

    weapon.cooldownTimer -= dt;
    if (weapon.cooldownTimer > 0) return;
    weapon.cooldownTimer = effectiveCooldown;

    const damageMultiplier = 1 + player.damageBonus;
    const effectiveDamage = Math.floor(config.damage * damageMultiplier);

    switch (config.type) {
      case "gun":
        this.fireGun(player, enemies, config, effectiveDamage);
        break;
      case "ring":
        this.fireRing(player, config, effectiveDamage);
        break;
      case "lightning":
        this.fireLightning(player, enemies, config, effectiveDamage);
        break;
      case "spike":
        this.fireSpike(player, config, effectiveDamage);
        break;
      case "storm":
        this.fireStorm(player, config, effectiveDamage);
        break;
      case "gravity":
        this.fireGravity(player, config, effectiveDamage);
        break;
      case "thunderstorm":
        this.fireThunderstorm(player, enemies, config, effectiveDamage);
        break;
    }
  }

  private fireGun(
    player: Player,
    enemies: Enemy[],
    config: WeaponConfig,
    damage: number,
  ): void {
    const range = config.range || 400;
    let nearestEnemy: Enemy | null = null;
    let nearestDistSq = range * range;

    for (const enemy of enemies) {
      if (enemy.dead) continue;
      const distSq = distanceSq(player.x, player.y, enemy.x, enemy.y);
      if (distSq < nearestDistSq) {
        nearestDistSq = distSq;
        nearestEnemy = enemy;
      }
    }

    if (!nearestEnemy) return;

    const dir = normalize(nearestEnemy.x - player.x, nearestEnemy.y - player.y);
    const bullet = createBullet(
      player.x,
      player.y,
      dir.x,
      dir.y,
      config.bulletSpeed || 400,
      damage,
      config.pierce || 1,
      "#ffff44",
      range / (config.bulletSpeed || 400),
    );
    this.newBullets.push(bullet);
  }

  private fireRing(player: Player, config: WeaponConfig, damage: number): void {
    const directions = config.directions || 8;
    const range = config.range || 350;

    for (let i = 0; i < directions; i++) {
      const angle = (i / directions) * Math.PI * 2;
      const dx = Math.cos(angle);
      const dy = Math.sin(angle);
      const bullet = createBullet(
        player.x,
        player.y,
        dx,
        dy,
        config.bulletSpeed || 300,
        damage,
        config.pierce || 2,
        "#44ffff",
        range / (config.bulletSpeed || 300),
      );
      this.newBullets.push(bullet);
    }
  }

  private fireLightning(
    player: Player,
    enemies: Enemy[],
    config: WeaponConfig,
    damage: number,
  ): void {
    const range = config.range || 300;
    const jumpRange = config.jumpRange || 150;
    const chainCount = config.chainCount || 3;

    let availableEnemies = enemies.filter((e) => !e.dead);
    if (availableEnemies.length === 0) return;

    const points: { x: number; y: number }[] = [{ x: player.x, y: player.y }];
    const hitEnemies: Set<number> = new Set();
    let currentX = player.x;
    let currentY = player.y;

    for (let i = 0; i < chainCount; i++) {
      let nearestEnemy: Enemy | null = null;
      let nearestDistSq = Infinity;
      const effectiveRange = i === 0 ? range : jumpRange;

      for (const enemy of availableEnemies) {
        if (hitEnemies.has(enemy.id)) continue;
        const distSq = distanceSq(currentX, currentY, enemy.x, enemy.y);
        if (
          distSq < nearestDistSq &&
          distSq < effectiveRange * effectiveRange
        ) {
          nearestDistSq = distSq;
          nearestEnemy = enemy;
        }
      }

      if (!nearestEnemy) break;

      points.push({ x: nearestEnemy.x, y: nearestEnemy.y });
      nearestEnemy.health -= damage;
      hitEnemies.add(nearestEnemy.id);
      currentX = nearestEnemy.x;
      currentY = nearestEnemy.y;
    }

    if (points.length > 1) {
      this.newLightnings.push(createLightningEffect(points));
    }
  }

  private fireSpike(
    player: Player,
    config: WeaponConfig,
    damage: number,
  ): void {
    const radius = config.radius || 100;
    this.newSpikes.push(createSpikeEffect(player.x, player.y, radius, damage));
  }

  private fireStorm(
    player: Player,
    config: WeaponConfig,
    damage: number,
  ): void {
    const directions = config.directions || 24;
    const range = config.range || 600;
    const bulletSpeed = config.bulletSpeed || 500;
    const pierce = config.pierce || 3;
    const angleOffset = Math.random() * ((Math.PI * 2) / directions);

    for (let i = 0; i < directions; i++) {
      const angle = (i / directions) * Math.PI * 2 + angleOffset;
      const dx = Math.cos(angle);
      const dy = Math.sin(angle);
      const bullet = createBullet(
        player.x,
        player.y,
        dx,
        dy,
        bulletSpeed,
        damage,
        pierce,
        "#ff88ff",
        range / bulletSpeed,
      );
      this.newBullets.push(bullet);
    }
  }

  private fireGravity(
    player: Player,
    config: WeaponConfig,
    damage: number,
  ): void {
    const pullRadius = config.pullRadius || 250;
    const pullForce = config.pullForce || 400;
    const explosionRadius = config.explosionRadius || 150;
    this.newGravityEffects.push(
      createGravityEffect(
        player.x,
        player.y,
        pullRadius,
        pullForce,
        explosionRadius,
        damage,
      ),
    );
  }

  private fireThunderstorm(
    player: Player,
    enemies: Enemy[],
    config: WeaponConfig,
    damage: number,
  ): void {
    const range = config.range || 500;
    const lightningCount = config.lightningCount || 3;
    let availableEnemies = enemies.filter((e) => {
      if (e.dead) return false;
      const distSq = distanceSq(player.x, player.y, e.x, e.y);
      return distSq < range * range;
    });

    for (let l = 0; l < lightningCount; l++) {
      if (availableEnemies.length === 0) {
        const randomAngle = Math.random() * Math.PI * 2;
        const randomDist = Math.random() * range * 0.8;
        const targetX = player.x + Math.cos(randomAngle) * randomDist;
        const targetY = player.y + Math.sin(randomAngle) * randomDist;
        const points: { x: number; y: number }[] = [
          { x: player.x, y: player.y },
          { x: targetX, y: targetY },
        ];
        this.newLightnings.push(createLightningEffect(points));
        continue;
      }

      const randomIdx = Math.floor(Math.random() * availableEnemies.length);
      const target = availableEnemies[randomIdx];
      availableEnemies.splice(randomIdx, 1);

      const chainLength = 2 + Math.floor(Math.random() * 3);
      const points: { x: number; y: number }[] = [{ x: player.x, y: player.y }];
      const hitEnemies: Set<number> = new Set();
      let currentX = player.x;
      let currentY = player.y;
      let currentTarget: Enemy | null = target;

      for (let i = 0; i < chainLength && currentTarget; i++) {
        points.push({ x: currentTarget.x, y: currentTarget.y });
        currentTarget.health -= damage;
        hitEnemies.add(currentTarget.id);
        currentX = currentTarget.x;
        currentY = currentTarget.y;

        let nextTarget: Enemy | null = null;
        let nearestDistSq = Infinity;
        for (const e of availableEnemies) {
          if (hitEnemies.has(e.id)) continue;
          const distSq = distanceSq(currentX, currentY, e.x, e.y);
          if (distSq < nearestDistSq && distSq < 200 * 200) {
            nearestDistSq = distSq;
            nextTarget = e;
          }
        }

        if (nextTarget) {
          const idx = availableEnemies.indexOf(nextTarget);
          if (idx !== -1) availableEnemies.splice(idx, 1);
        }
        currentTarget = nextTarget;
      }

      if (points.length > 1) {
        this.newLightnings.push(createLightningEffect(points));
      }
    }
  }

  upgradeWeapon(weapon: WeaponInstance): void {
    const config = weapons[weapon.configId];
    if (!config || weapon.level >= config.maxLevel) return;

    weapon.level++;
    const upgrade = config.upgrades?.find((u) => u.level === weapon.level);
    if (upgrade) {
      weapon.currentStats = { ...weapon.currentStats };
      for (const [key, value] of Object.entries(upgrade)) {
        if (key !== "level") {
          (weapon.currentStats as unknown as Record<string, unknown>)[key] =
            value;
        }
      }
    }
  }

  addNewWeapon(weaponId: string): WeaponInstance | null {
    const config = weapons[weaponId];
    if (!config) return null;

    return {
      configId: weaponId,
      level: 1,
      currentStats: { ...config },
      cooldownTimer: 0,
    };
  }

  removeWeapon(weaponId: string): void {
    this.orbitBalls.delete(weaponId);
  }

  reset(): void {
    this.orbitBalls.clear();
    this.newBullets = [];
    this.newLightnings = [];
    this.newSpikes = [];
    this.newGravityEffects = [];
  }
}
