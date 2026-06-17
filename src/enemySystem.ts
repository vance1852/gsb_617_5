import type { Enemy, EnemyConfig } from "./types";
import { createEnemy, createExpGem } from "./entityFactory";
import { normalize, distance } from "./utils";
import enemiesConfig from "./config/enemies.json";

const enemies = enemiesConfig as Record<string, EnemyConfig>;

export class EnemySystem {
  private spawnTimer: number = 0;
  private spawnInterval: number = 2.0;
  private minSpawnInterval: number = 0.3;

  update(
    enemiesList: Enemy[],
    playerX: number,
    playerY: number,
    cameraWidth: number,
    cameraHeight: number,
    gameTime: number,
    dt: number,
  ): { newEnemies: Enemy[]; newExpGems: ReturnType<typeof createExpGem>[] } {
    const difficultyMultiplier = 1 + gameTime / 60;
    const newEnemies: Enemy[] = [];
    const newExpGems: ReturnType<typeof createExpGem>[] = [];

    this.spawnInterval = Math.max(this.minSpawnInterval, 2.0 - gameTime / 120);

    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = this.spawnInterval;
      const spawnCount = Math.min(5, 1 + Math.floor(gameTime / 30));
      for (let i = 0; i < spawnCount; i++) {
        const enemy = this.spawnEnemy(
          playerX,
          playerY,
          cameraWidth,
          cameraHeight,
          gameTime,
          difficultyMultiplier,
        );
        if (enemy) {
          newEnemies.push(enemy);
        }
      }
    }

    for (const enemy of enemiesList) {
      if (enemy.dead) continue;
      this.updateEnemy(enemy, playerX, playerY, dt);

      if (enemy.health <= 0) {
        enemy.dead = true;
        newExpGems.push(createExpGem(enemy.x, enemy.y, enemy.expValue));
      }
    }

    return { newEnemies, newExpGems };
  }

  private spawnEnemy(
    playerX: number,
    playerY: number,
    cameraWidth: number,
    cameraHeight: number,
    gameTime: number,
    difficultyMultiplier: number,
  ): Enemy | null {
    const availableTypes = Object.values(enemies).filter(
      (e) => e.startTime <= gameTime,
    );

    if (availableTypes.length === 0) return null;

    const totalWeight = availableTypes.reduce(
      (sum, e) => sum + e.spawnWeight,
      0,
    );
    let random = Math.random() * totalWeight;
    let selectedType = availableTypes[0];

    for (const type of availableTypes) {
      random -= type.spawnWeight;
      if (random <= 0) {
        selectedType = type;
        break;
      }
    }

    const spawnDistance = Math.max(cameraWidth, cameraHeight) * 0.6 + 50;
    const angle = Math.random() * Math.PI * 2;
    const x = playerX + Math.cos(angle) * spawnDistance;
    const y = playerY + Math.sin(angle) * spawnDistance;

    return createEnemy(selectedType, x, y, difficultyMultiplier);
  }

  private updateEnemy(
    enemy: Enemy,
    playerX: number,
    playerY: number,
    dt: number,
  ): void {
    const dx = playerX - enemy.x;
    const dy = playerY - enemy.y;
    const dir = normalize(dx, dy);

    let speed = enemy.speed;

    if (enemy.type === "dasher" && enemy.dashCooldownTimer !== undefined) {
      if (enemy.isDashing) {
        enemy.dashTimer = (enemy.dashTimer || 0) - dt;
        speed = enemies.dasher.dashSpeed || 200;

        if (enemy.dashTimer <= 0) {
          enemy.isDashing = false;
          enemy.dashCooldownTimer = enemies.dasher.dashCooldown || 2;
        }
      } else {
        enemy.dashCooldownTimer -= dt;

        if (enemy.dashCooldownTimer <= 0) {
          const dist = distance(enemy.x, enemy.y, playerX, playerY);
          if (dist < 250) {
            enemy.isDashing = true;
            enemy.dashTimer = enemies.dasher.dashDuration || 0.5;
          }
        }
      }
    }

    enemy.vx = dir.x * speed;
    enemy.vy = dir.y * speed;
    enemy.x += enemy.vx * dt;
    enemy.y += enemy.vy * dt;
  }

  reset(): void {
    this.spawnTimer = 0;
    this.spawnInterval = 2.0;
  }
}
