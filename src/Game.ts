import type {
  Player,
  Enemy,
  Bullet,
  ExpGem,
  DamageNumber,
  LightningEffect,
  SpikeEffect,
  GravityEffect,
  GameState,
  OrbitBall,
} from "./types";
import { InputSystem } from "./input";
import { Camera } from "./camera";
import { Renderer } from "./renderer";
import { WeaponSystem } from "./weaponSystem";
import { EnemySystem } from "./enemySystem";
import { UpgradeSystem } from "./upgradeSystem";
import { CollisionSystem } from "./collisionSystem";
import { createPlayer } from "./entityFactory";
import { clamp, resetEntityIdCounter } from "./utils";

export class Game {
  private input: InputSystem;
  private camera: Camera;
  private renderer: Renderer;
  private weaponSystem: WeaponSystem;
  private enemySystem: EnemySystem;
  private upgradeSystem: UpgradeSystem;
  private collisionSystem: CollisionSystem;

  private player: Player;
  private enemies: Enemy[] = [];
  private bullets: Bullet[] = [];
  private expGems: ExpGem[] = [];
  private damageNumbers: DamageNumber[] = [];
  private lightnings: LightningEffect[] = [];
  private spikes: SpikeEffect[] = [];
  private gravityEffects: GravityEffect[] = [];

  private gameState: GameState;
  private lastTime: number = 0;
  private animationId: number = 0;
  private maxEntities: number = 1000;

  constructor(canvas: HTMLCanvasElement) {
    this.input = new InputSystem();
    this.camera = new Camera(window.innerWidth, window.innerHeight);
    this.renderer = new Renderer(canvas, this.camera);
    this.weaponSystem = new WeaponSystem();
    this.enemySystem = new EnemySystem();
    this.upgradeSystem = new UpgradeSystem(this.weaponSystem);
    this.collisionSystem = new CollisionSystem(100);

    this.player = createPlayer();
    this.gameState = {
      paused: false,
      gameOver: false,
      levelUp: false,
      time: 0,
      kills: 0,
      upgradeOptions: [],
    };

    this.setupResize();
  }

  private setupResize(): void {
    const resize = () => {
      this.renderer.resize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", resize);
    resize();
  }

  start(): void {
    this.lastTime = performance.now();
    this.gameLoop();
  }

  stop(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }

  private gameLoop = (): void => {
    const now = performance.now();
    let dt = (now - this.lastTime) / 1000;
    dt = Math.min(dt, 0.05);
    this.lastTime = now;

    this.update(dt);
    this.render();

    this.input.endFrame();
    this.animationId = requestAnimationFrame(this.gameLoop);
  };

  private update(dt: number): void {
    if (this.gameState.gameOver) {
      if (this.input.wasPressed("r")) {
        this.restart();
      }
      return;
    }

    if (this.input.wasPressed(" ")) {
      this.gameState.paused = !this.gameState.paused;
    }

    if (this.gameState.paused && !this.gameState.levelUp) {
      return;
    }

    if (this.gameState.levelUp) {
      this.handleUpgradeSelection();
      return;
    }

    this.gameState.time += dt;

    const movement = this.input.getMovement();
    this.player.vx = movement.x * this.player.moveSpeed;
    this.player.vy = movement.y * this.player.moveSpeed;
    this.player.x += this.player.vx * dt;
    this.player.y += this.player.vy * dt;

    this.player.health = clamp(
      this.player.health + this.player.healRate * dt,
      0,
      this.player.maxHealth,
    );

    if (this.player.health <= 0) {
      this.gameState.gameOver = true;
      return;
    }

    for (const weapon of this.player.weapons) {
      if (weapon.currentStats.type === "orb") {
        this.weaponSystem.updateOrbitBalls(
          weapon,
          this.player.x,
          this.player.y,
          dt,
        );
      }
      this.weaponSystem.updateWeapon(weapon, this.player, this.enemies, dt);
    }

    const newBullets = this.weaponSystem.getNewBullets();
    const newLightnings = this.weaponSystem.getNewLightnings();
    const newSpikes = this.weaponSystem.getNewSpikes();
    const newGravityEffects = this.weaponSystem.getNewGravityEffects();

    this.bullets.push(...newBullets);
    this.lightnings.push(...newLightnings);
    this.spikes.push(...newSpikes);
    this.gravityEffects.push(...newGravityEffects);

    const { newEnemies, newExpGems } = this.enemySystem.update(
      this.enemies,
      this.player.x,
      this.player.y,
      this.camera.width,
      this.camera.height,
      this.gameState.time,
      dt,
    );

    this.enemies.push(...newEnemies);
    this.expGems.push(...newExpGems);

    this.updateGravityEffects(dt);

    const orbitBalls = new Map<string, OrbitBall[]>();
    for (const weapon of this.player.weapons) {
      if (weapon.currentStats.type === "orb") {
        orbitBalls.set(
          weapon.configId,
          this.weaponSystem.getOrbitBalls(weapon.configId),
        );
      }
    }

    const {
      newDamageNumbers,
      newExpGems: killedExpGems,
      kills,
    } = this.collisionSystem.update(
      this.player,
      this.enemies,
      this.bullets,
      this.expGems,
      this.spikes,
      orbitBalls,
      dt,
    );

    this.damageNumbers.push(...newDamageNumbers);
    this.expGems.push(...killedExpGems);
    this.gameState.kills += kills;

    for (const lightning of this.lightnings) {
      lightning.lifeTime -= dt;
    }

    for (const spike of this.spikes) {
      spike.lifeTime -= dt;
    }

    for (const num of this.damageNumbers) {
      num.lifeTime -= dt;
      num.y -= 30 * dt;
    }

    this.cleanupEntities();

    this.camera.setTarget(this.player.x, this.player.y);
    this.camera.update();

    if (this.upgradeSystem.checkLevelUp(this.player)) {
      this.upgradeSystem.processLevelUp(this.player);
      this.gameState.levelUp = true;
      this.gameState.paused = true;
      this.gameState.upgradeOptions = this.upgradeSystem.generateUpgradeOptions(
        this.player,
      );
    }
  }

  private handleUpgradeSelection(): void {
    const options = this.gameState.upgradeOptions;

    for (let i = 0; i < options.length; i++) {
      if (this.input.wasPressed((i + 1).toString())) {
        this.upgradeSystem.applyUpgrade(this.player, options[i]);
        this.gameState.levelUp = false;
        this.gameState.paused = false;
        this.gameState.upgradeOptions = [];
        break;
      }
    }
  }

  private updateGravityEffects(dt: number): void {
    const damageMultiplier = 1 + this.player.damageBonus;

    for (const gravity of this.gravityEffects) {
      if (!gravity.exploded) {
        gravity.pullTimer -= dt;

        for (const enemy of this.enemies) {
          if (enemy.dead) continue;

          const distSq =
            (enemy.x - gravity.x) ** 2 + (enemy.y - gravity.y) ** 2;
          if (distSq < gravity.pullRadius * gravity.pullRadius) {
            const dist = Math.sqrt(distSq);
            const pullStrength =
              gravity.pullForce * (1 - dist / gravity.pullRadius);
            const dx = gravity.x - enemy.x;
            const dy = gravity.y - enemy.y;
            const nx = dx / dist;
            const ny = dy / dist;
            enemy.vx += nx * pullStrength * dt;
            enemy.vy += ny * pullStrength * dt;
            enemy.x += enemy.vx * dt;
            enemy.y += enemy.vy * dt;
          }
        }

        if (gravity.pullTimer <= 0) {
          gravity.exploded = true;
          const effectiveDamage = Math.floor(gravity.damage * damageMultiplier);

          for (const enemy of this.enemies) {
            if (enemy.dead) continue;
            if (gravity.hitEnemies.has(enemy.id)) continue;

            const distSq =
              (enemy.x - gravity.x) ** 2 + (enemy.y - gravity.y) ** 2;
            if (distSq < gravity.explosionRadius * gravity.explosionRadius) {
              enemy.health -= effectiveDamage;
              gravity.hitEnemies.add(enemy.id);
              this.damageNumbers.push({
                id: Date.now() + Math.random(),
                x: enemy.x,
                y: enemy.y,
                value: effectiveDamage,
                lifeTime: 1,
                maxLifeTime: 1,
                color: "#ff8844",
              });
            }
          }
        }
      }
    }

    this.gravityEffects = this.gravityEffects.filter(
      (g) => g.exploded === false || g.pullTimer > -0.3,
    );
  }

  private cleanupEntities(): void {
    const totalEntities =
      this.enemies.length + this.bullets.length + this.expGems.length;
    if (totalEntities > this.maxEntities) {
      const sortedEnemies = [...this.enemies].sort((a, b) => {
        const distA = (a.x - this.player.x) ** 2 + (a.y - this.player.y) ** 2;
        const distB = (b.x - this.player.x) ** 2 + (b.y - this.player.y) ** 2;
        return distB - distA;
      });

      const toRemove = sortedEnemies.slice(0, totalEntities - this.maxEntities);
      const toRemoveSet = new Set(toRemove.map((e) => e.id));
      this.enemies = this.enemies.filter((e) => !toRemoveSet.has(e.id));
    }

    this.enemies = this.enemies.filter((e) => !e.dead);
    this.bullets = this.bullets.filter((b) => !b.dead);
    this.expGems = this.expGems.filter((g) => !g.dead);
    this.damageNumbers = this.damageNumbers.filter((n) => n.lifeTime > 0);
    this.lightnings = this.lightnings.filter((l) => l.lifeTime > 0);
    this.spikes = this.spikes.filter((s) => s.lifeTime > 0);
    this.gravityEffects = this.gravityEffects.filter((g) => g.pullTimer > -0.5);
  }

  private render(): void {
    this.renderer.clear();
    this.renderer.drawGrid();

    this.renderer.drawSpikes(this.spikes);
    this.renderer.drawGravityEffects(this.gravityEffects);
    this.renderer.drawExpGems(this.expGems);
    this.renderer.drawBullets(this.bullets);
    this.renderer.drawEnemies(this.enemies);

    const orbitBalls = new Map<string, OrbitBall[]>();
    for (const weapon of this.player.weapons) {
      if (weapon.currentStats.type === "orb") {
        orbitBalls.set(
          weapon.configId,
          this.weaponSystem.getOrbitBalls(weapon.configId),
        );
      }
    }
    this.renderer.drawOrbitBalls(this.player, orbitBalls);

    this.renderer.drawPickupRange(this.player);
    this.renderer.drawPlayer(this.player);

    this.renderer.drawLightnings(this.lightnings);
    this.renderer.drawDamageNumbers(this.damageNumbers);

    this.renderer.drawHUD(this.player, this.gameState);

    if (this.gameState.levelUp) {
      this.renderer.drawUpgradeUI(
        this.gameState.upgradeOptions,
        this.player.level,
      );
    } else if (this.gameState.paused) {
      this.renderer.drawPauseScreen();
    }

    if (this.gameState.gameOver) {
      this.renderer.drawGameOverScreen(
        this.gameState.time,
        this.gameState.kills,
      );
    }
  }

  private restart(): void {
    resetEntityIdCounter();
    this.player = createPlayer();
    this.enemies = [];
    this.bullets = [];
    this.expGems = [];
    this.damageNumbers = [];
    this.lightnings = [];
    this.spikes = [];
    this.gravityEffects = [];
    this.gameState = {
      paused: false,
      gameOver: false,
      levelUp: false,
      time: 0,
      kills: 0,
      upgradeOptions: [],
    };
    this.weaponSystem.reset();
    this.enemySystem.reset();
    this.camera.x = 0;
    this.camera.y = 0;
    this.camera.targetX = 0;
    this.camera.targetY = 0;
  }
}
