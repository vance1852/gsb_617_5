import type {
  Player,
  Enemy,
  Bullet,
  ExpGem,
  DamageNumber,
  SpikeEffect,
  OrbitBall,
} from "./types";
import { SpatialGrid } from "./spatialGrid";
import { circleCollides, distanceSq, normalize } from "./utils";
import { createDamageNumber, createExpGem } from "./entityFactory";

export class CollisionSystem {
  private spatialGrid: SpatialGrid;

  constructor(cellSize: number = 100) {
    this.spatialGrid = new SpatialGrid(cellSize);
  }

  update(
    player: Player,
    enemies: Enemy[],
    bullets: Bullet[],
    expGems: ExpGem[],
    spikeEffects: SpikeEffect[],
    orbitBalls: Map<string, OrbitBall[]>,
    dt: number,
  ): {
    newDamageNumbers: DamageNumber[];
    newExpGems: ExpGem[];
    kills: number;
  } {
    const newDamageNumbers: DamageNumber[] = [];
    const newExpGems: ExpGem[] = [];
    let kills = 0;

    this.spatialGrid.clear();
    for (const enemy of enemies) {
      if (!enemy.dead) {
        this.spatialGrid.insert(enemy);
      }
    }
    for (const bullet of bullets) {
      if (!bullet.dead) {
        this.spatialGrid.insert(bullet);
      }
    }
    for (const gem of expGems) {
      if (!gem.dead) {
        this.spatialGrid.insert(gem);
      }
    }

    for (const bullet of bullets) {
      if (bullet.dead) continue;

      bullet.trail.unshift({ x: bullet.x, y: bullet.y });
      if (bullet.trail.length > 8) {
        bullet.trail.pop();
      }

      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
      bullet.lifeTime -= dt;

      if (bullet.lifeTime <= 0) {
        bullet.dead = true;
        continue;
      }

      const nearbyEnemies = this.spatialGrid.queryEnemies(
        bullet.x,
        bullet.y,
        50,
      );

      for (const enemy of nearbyEnemies) {
        if (enemy.dead) continue;
        if (bullet.hitEnemies.has(enemy.id)) continue;

        if (
          circleCollides(
            bullet.x,
            bullet.y,
            bullet.radius,
            enemy.x,
            enemy.y,
            enemy.radius,
          )
        ) {
          bullet.hitEnemies.add(enemy.id);
          enemy.health -= bullet.damage;
          bullet.pierce--;

          newDamageNumbers.push(
            createDamageNumber(
              enemy.x,
              enemy.y - enemy.radius,
              bullet.damage,
              "#ffff44",
            ),
          );

          if (enemy.health <= 0) {
            enemy.dead = true;
            kills++;
            newExpGems.push(createExpGem(enemy.x, enemy.y, enemy.expValue));
          }

          if (bullet.pierce <= 0) {
            bullet.dead = true;
            break;
          }
        }
      }
    }

    for (const [_weaponId, balls] of orbitBalls.entries()) {
      for (const ball of balls) {
        const ballX = player.x + Math.cos(ball.angle) * ball.radius;
        const ballY = player.y + Math.sin(ball.angle) * ball.radius;
        const ballRadius = 12;

        const nearbyEnemies = this.spatialGrid.queryEnemies(
          ballX,
          ballY,
          ballRadius + 50,
        );

        for (const enemy of nearbyEnemies) {
          if (enemy.dead) continue;
          if (ball.hitCooldown.has(enemy.id)) continue;

          if (
            circleCollides(
              ballX,
              ballY,
              ballRadius,
              enemy.x,
              enemy.y,
              enemy.radius,
            )
          ) {
            const damage = Math.floor(ball.damage * (1 + player.damageBonus));
            enemy.health -= damage;
            ball.hitCooldown.set(enemy.id, 0.2);

            newDamageNumbers.push(
              createDamageNumber(
                enemy.x,
                enemy.y - enemy.radius,
                damage,
                "#44ff44",
              ),
            );

            if (enemy.health <= 0) {
              enemy.dead = true;
              kills++;
              newExpGems.push(createExpGem(enemy.x, enemy.y, enemy.expValue));
            }
          }
        }
      }
    }

    for (const spike of spikeEffects) {
      if (spike.lifeTime <= 0) continue;

      const nearbyEnemies = this.spatialGrid.queryEnemies(
        spike.x,
        spike.y,
        spike.radius,
      );

      for (const enemy of nearbyEnemies) {
        if (enemy.dead) continue;
        if (spike.hitEnemies.has(enemy.id)) continue;

        if (
          circleCollides(
            spike.x,
            spike.y,
            spike.radius,
            enemy.x,
            enemy.y,
            enemy.radius,
          )
        ) {
          const damage = Math.floor(spike.damage * (1 + player.damageBonus));
          enemy.health -= damage;
          spike.hitEnemies.add(enemy.id);

          newDamageNumbers.push(
            createDamageNumber(
              enemy.x,
              enemy.y - enemy.radius,
              damage,
              "#ff44ff",
            ),
          );

          if (enemy.health <= 0) {
            enemy.dead = true;
            kills++;
            newExpGems.push(createExpGem(enemy.x, enemy.y, enemy.expValue));
          }
        }
      }
    }

    player.invincibleTimer -= dt;

    for (const enemy of enemies) {
      if (enemy.dead) continue;

      if (
        circleCollides(
          player.x,
          player.y,
          player.radius,
          enemy.x,
          enemy.y,
          enemy.radius,
        )
      ) {
        if (player.invincibleTimer <= 0) {
          player.health -= enemy.damage;
          player.invincibleTimer = 0.5;

          newDamageNumbers.push(
            createDamageNumber(
              player.x,
              player.y - player.radius,
              enemy.damage,
              "#ff4444",
            ),
          );
        }
      }
    }

    for (const gem of expGems) {
      if (gem.dead) continue;

      gem.vx *= 0.95;
      gem.vy *= 0.95;
      gem.x += gem.vx * dt;
      gem.y += gem.vy * dt;
      gem.pulsePhase += dt * 5;

      const distSq = distanceSq(player.x, player.y, gem.x, gem.y);
      const pickupR = player.pickupRange;
      const pickupR2 = pickupR * pickupR;

      if (distSq < pickupR2) {
        const dir = normalize(player.x - gem.x, player.y - gem.y);
        gem.vx += dir.x * 60;
        gem.vy += dir.y * 60;
        if (distSq <= gem.radius * gem.radius) {
          gem.dead = true;
          player.exp += gem.value;
        }
      }
    }

    return { newDamageNumbers, newExpGems, kills };
  }

  getGrid(): SpatialGrid {
    return this.spatialGrid;
  }
}
