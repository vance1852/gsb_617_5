import type {
  Player,
  Enemy,
  Bullet,
  ExpGem,
  DamageNumber,
  LightningEffect,
  SpikeEffect,
  GravityEffect,
  OrbitBall,
  GameState,
  UpgradeOption
} from './types';
import { Camera } from './camera';
import { formatTime } from './utils';

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private camera: Camera;
  private gridSize: number = 50;

  constructor(canvas: HTMLCanvasElement, camera: Camera) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.camera = camera;
  }

  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    this.camera.width = width;
    this.camera.height = height;
  }

  clear(): void {
    this.ctx.fillStyle = '#0a0a0f';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  drawGrid(): void {
    const startX = Math.floor((this.camera.x - this.camera.width / 2) / this.gridSize) * this.gridSize;
    const startY = Math.floor((this.camera.y - this.camera.height / 2) / this.gridSize) * this.gridSize;

    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    this.ctx.lineWidth = 1;

    for (let x = startX; x < this.camera.x + this.camera.width / 2 + this.gridSize; x += this.gridSize) {
      const screenX = x - this.camera.x + this.camera.width / 2;
      this.ctx.beginPath();
      this.ctx.moveTo(screenX, 0);
      this.ctx.lineTo(screenX, this.canvas.height);
      this.ctx.stroke();
    }

    for (let y = startY; y < this.camera.y + this.camera.height / 2 + this.gridSize; y += this.gridSize) {
      const screenY = y - this.camera.y + this.camera.height / 2;
      this.ctx.beginPath();
      this.ctx.moveTo(0, screenY);
      this.ctx.lineTo(this.canvas.width, screenY);
      this.ctx.stroke();
    }
  }

  drawPlayer(player: Player): void {
    const screen = this.camera.worldToScreen(player.x, player.y);

    if (player.invincibleTimer > 0 && Math.floor(player.invincibleTimer * 20) % 2 === 0) {
      return;
    }

    this.ctx.save();
    this.ctx.shadowColor = '#44aaff';
    this.ctx.shadowBlur = 20;

    this.ctx.fillStyle = '#44aaff';
    this.ctx.beginPath();
    this.ctx.arc(screen.x, screen.y, player.radius, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.shadowBlur = 0;
    this.ctx.fillStyle = '#ffffff';
    this.ctx.beginPath();
    this.ctx.arc(screen.x, screen.y, player.radius * 0.6, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = '#44aaff';
    this.ctx.beginPath();
    this.ctx.arc(screen.x, screen.y, player.radius * 0.3, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.restore();
  }

  drawPickupRange(player: Player): void {
    const screen = this.camera.worldToScreen(player.x, player.y);
    this.ctx.strokeStyle = 'rgba(100, 200, 255, 0.2)';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([5, 5]);
    this.ctx.beginPath();
    this.ctx.arc(screen.x, screen.y, player.pickupRange, 0, Math.PI * 2);
    this.ctx.stroke();
    this.ctx.setLineDash([]);
  }

  drawEnemies(enemies: Enemy[]): void {
    for (const enemy of enemies) {
      if (enemy.dead) continue;
      if (!this.camera.isVisible(enemy.x, enemy.y, enemy.radius + 50)) continue;

      const screen = this.camera.worldToScreen(enemy.x, enemy.y);

      this.ctx.save();

      if (enemy.isDashing) {
        this.ctx.shadowColor = enemy.color;
        this.ctx.shadowBlur = 20;
      }

      this.ctx.fillStyle = enemy.color;
      this.ctx.beginPath();
      this.ctx.arc(screen.x, screen.y, enemy.radius, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.shadowBlur = 0;
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      this.ctx.beginPath();
      this.ctx.arc(screen.x, screen.y, enemy.radius * 0.6, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.fillStyle = '#ffffff';
      this.ctx.beginPath();
      this.ctx.arc(screen.x - enemy.radius * 0.25, screen.y - enemy.radius * 0.15, enemy.radius * 0.15, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.beginPath();
      this.ctx.arc(screen.x + enemy.radius * 0.25, screen.y - enemy.radius * 0.15, enemy.radius * 0.15, 0, Math.PI * 2);
      this.ctx.fill();

      const healthPercent = enemy.health / enemy.maxHealth;
      if (healthPercent < 1) {
        const barWidth = enemy.radius * 2;
        const barHeight = 4;
        const barX = screen.x - barWidth / 2;
        const barY = screen.y - enemy.radius - 10;

        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(barX, barY, barWidth, barHeight);

        this.ctx.fillStyle = healthPercent > 0.5 ? '#44ff44' : healthPercent > 0.25 ? '#ffaa00' : '#ff4444';
        this.ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
      }

      this.ctx.restore();
    }
  }

  drawBullets(bullets: Bullet[]): void {
    for (const bullet of bullets) {
      if (bullet.dead) continue;
      if (!this.camera.isVisible(bullet.x, bullet.y, 50)) continue;

      const screen = this.camera.worldToScreen(bullet.x, bullet.y);

      for (let i = 0; i < bullet.trail.length; i++) {
        const trail = bullet.trail[i];
        const trailScreen = this.camera.worldToScreen(trail.x, trail.y);
        const alpha = (1 - i / bullet.trail.length) * 0.5;
        const size = bullet.radius * (1 - i / bullet.trail.length);

        this.ctx.fillStyle = bullet.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
        this.ctx.beginPath();
        this.ctx.arc(trailScreen.x, trailScreen.y, size, 0, Math.PI * 2);
        this.ctx.fill();
      }

      this.ctx.save();
      this.ctx.shadowColor = bullet.color;
      this.ctx.shadowBlur = 10;
      this.ctx.fillStyle = bullet.color;
      this.ctx.beginPath();
      this.ctx.arc(screen.x, screen.y, bullet.radius, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }
  }

  drawExpGems(gems: ExpGem[]): void {
    for (const gem of gems) {
      if (gem.dead) continue;
      if (!this.camera.isVisible(gem.x, gem.y, 50)) continue;

      const screen = this.camera.worldToScreen(gem.x, gem.y);
      const pulse = 1 + Math.sin(gem.pulsePhase) * 0.3;

      this.ctx.save();
      this.ctx.shadowColor = '#44ff44';
      this.ctx.shadowBlur = 15;

      const size = gem.radius * pulse;

      this.ctx.fillStyle = '#44ff44';
      this.ctx.beginPath();
      this.ctx.arc(screen.x, screen.y, size, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.fillStyle = '#aaffaa';
      this.ctx.beginPath();
      this.ctx.arc(screen.x - size * 0.3, screen.y - size * 0.3, size * 0.4, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.restore();
    }
  }

  drawOrbitBalls(player: Player, orbitBalls: Map<string, OrbitBall[]>): void {
    const playerScreen = this.camera.worldToScreen(player.x, player.y);

    for (const [_weaponId, balls] of orbitBalls.entries()) {
      for (const ball of balls) {
        const ballX = player.x + Math.cos(ball.angle) * ball.radius;
        const ballY = player.y + Math.sin(ball.angle) * ball.radius;
        const screen = this.camera.worldToScreen(ballX, ballY);

        this.ctx.save();
        this.ctx.shadowColor = '#44ff88';
        this.ctx.shadowBlur = 15;

        this.ctx.fillStyle = '#44ff88';
        this.ctx.beginPath();
        this.ctx.arc(screen.x, screen.y, 12, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.strokeStyle = 'rgba(68, 255, 136, 0.3)';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(playerScreen.x, playerScreen.y, ball.radius, 0, Math.PI * 2);
        this.ctx.stroke();

        this.ctx.restore();
      }
    }
  }

  drawLightnings(lightnings: LightningEffect[]): void {
    for (const lightning of lightnings) {
      const alpha = lightning.lifeTime / lightning.maxLifeTime;

      this.ctx.save();
      this.ctx.strokeStyle = `rgba(255, 255, 100, ${alpha})`;
      this.ctx.lineWidth = 4;
      this.ctx.shadowColor = '#ffff44';
      this.ctx.shadowBlur = 20;

      for (let i = 0; i < lightning.points.length - 1; i++) {
        const from = this.camera.worldToScreen(
          lightning.points[i].x,
          lightning.points[i].y
        );
        const to = this.camera.worldToScreen(
          lightning.points[i + 1].x,
          lightning.points[i + 1].y
        );

        this.ctx.beginPath();
        this.ctx.moveTo(from.x, from.y);

        const segments = 5;
        for (let j = 1; j <= segments; j++) {
          const t = j / segments;
          const x = from.x + (to.x - from.x) * t + (Math.random() - 0.5) * 20;
          const y = from.y + (to.y - from.y) * t + (Math.random() - 0.5) * 20;
          this.ctx.lineTo(x, y);
        }

        this.ctx.stroke();
      }

      this.ctx.restore();
    }
  }

  drawSpikes(spikes: SpikeEffect[]): void {
    for (const spike of spikes) {
      const screen = this.camera.worldToScreen(spike.x, spike.y);
      const progress = 1 - spike.lifeTime / spike.maxLifeTime;
      const alpha = 1 - progress;
      const size = spike.radius * (0.5 + progress * 0.5);

      this.ctx.save();
      this.ctx.fillStyle = `rgba(255, 100, 255, ${alpha * 0.3})`;
      this.ctx.beginPath();
      this.ctx.arc(screen.x, screen.y, size, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.strokeStyle = `rgba(255, 100, 255, ${alpha})`;
      this.ctx.lineWidth = 3;

      const spikes = 12;
      for (let i = 0; i < spikes; i++) {
        const angle = (i / spikes) * Math.PI * 2;
        const innerR = size * 0.5;
        const outerR = size;

        const x1 = screen.x + Math.cos(angle) * innerR;
        const y1 = screen.y + Math.sin(angle) * innerR;
        const x2 = screen.x + Math.cos(angle) * outerR;
        const y2 = screen.y + Math.sin(angle) * outerR;

        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.stroke();
      }

      this.ctx.restore();
    }
  }

  drawGravityEffects(gravityEffects: GravityEffect[]): void {
    for (const gravity of gravityEffects) {
      const screen = this.camera.worldToScreen(gravity.x, gravity.y);
      const time = Date.now() / 1000;

      if (!gravity.exploded) {
        const pullProgress = 1 - gravity.pullTimer / gravity.pullDuration;

        this.ctx.save();
        this.ctx.strokeStyle = `rgba(136, 85, 255, ${0.5 + Math.sin(time * 8) * 0.2})`;
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        this.ctx.beginPath();
        this.ctx.arc(screen.x, screen.y, gravity.pullRadius, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.setLineDash([]);

        const gradient = this.ctx.createRadialGradient(
          screen.x, screen.y, 0,
          screen.x, screen.y, gravity.pullRadius
        );
        gradient.addColorStop(0, `rgba(136, 85, 255, ${0.3 * pullProgress})`);
        gradient.addColorStop(0.5, `rgba(136, 85, 255, ${0.1 * pullProgress})`);
        gradient.addColorStop(1, 'rgba(136, 85, 255, 0)');
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(screen.x, screen.y, gravity.pullRadius, 0, Math.PI * 2);
        this.ctx.fill();

        for (let i = 0; i < 6; i++) {
          const angle = (i / 6) * Math.PI * 2 + time * 2;
          const r = gravity.pullRadius * (0.3 + Math.sin(time * 3 + i) * 0.2);
          const x = screen.x + Math.cos(angle) * r;
          const y = screen.y + Math.sin(angle) * r;

          this.ctx.fillStyle = '#8855ff';
          this.ctx.shadowColor = '#8855ff';
          this.ctx.shadowBlur = 10;
          this.ctx.beginPath();
          this.ctx.arc(x, y, 4, 0, Math.PI * 2);
          this.ctx.fill();
          this.ctx.shadowBlur = 0;
        }

        this.ctx.restore();
      } else {
        const explosionProgress = Math.abs(gravity.pullTimer) / 0.3;
        const alpha = Math.max(0, 1 - explosionProgress);
        const size = gravity.explosionRadius * (0.5 + explosionProgress * 0.8);

        this.ctx.save();
        const gradient = this.ctx.createRadialGradient(
          screen.x, screen.y, 0,
          screen.x, screen.y, size
        );
        gradient.addColorStop(0, `rgba(255, 136, 68, ${alpha * 0.6})`);
        gradient.addColorStop(0.5, `rgba(255, 85, 34, ${alpha * 0.3})`);
        gradient.addColorStop(1, 'rgba(255, 68, 0, 0)');
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(screen.x, screen.y, size, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.strokeStyle = `rgba(255, 136, 68, ${alpha})`;
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.arc(screen.x, screen.y, size, 0, Math.PI * 2);
        this.ctx.stroke();

        this.ctx.restore();
      }
    }
  }

  drawDamageNumbers(numbers: DamageNumber[]): void {
    for (const num of numbers) {
      const screen = this.camera.worldToScreen(num.x, num.y);
      const alpha = num.lifeTime / num.maxLifeTime;
      const offsetY = (1 - alpha) * 30;

      this.ctx.save();
      this.ctx.font = 'bold 16px "Courier New"';
      this.ctx.textAlign = 'center';
      this.ctx.fillStyle = num.color;
      this.ctx.globalAlpha = alpha;
      this.ctx.fillText(num.value.toString(), screen.x, screen.y - offsetY);
      this.ctx.restore();
    }
  }

  drawHUD(player: Player, gameState: GameState): void {
    this.ctx.save();

    const healthBarWidth = 300;
    const healthBarHeight = 20;
    const healthBarX = 20;
    const healthBarY = 20;

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.fillRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);

    const healthPercent = player.health / player.maxHealth;
    this.ctx.fillStyle = healthPercent > 0.5 ? '#44ff44' : healthPercent > 0.25 ? '#ffaa00' : '#ff4444';
    this.ctx.fillRect(healthBarX, healthBarY, healthBarWidth * healthPercent, healthBarHeight);

    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 14px "Courier New"';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(
      `HP: ${Math.ceil(player.health)} / ${player.maxHealth}`,
      healthBarX + 10,
      healthBarY + 15
    );

    const expBarWidth = 300;
    const expBarHeight = 10;
    const expBarX = 20;
    const expBarY = 50;

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.fillRect(expBarX, expBarY, expBarWidth, expBarHeight);

    const expPercent = player.exp / player.expToNext;
    this.ctx.fillStyle = '#44aaff';
    this.ctx.fillRect(expBarX, expBarY, expBarWidth * expPercent, expBarHeight);

    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(expBarX, expBarY, expBarWidth, expBarHeight);

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '12px "Courier New"';
    this.ctx.fillText(
      `Lv.${player.level}  EXP: ${player.exp} / ${player.expToNext}`,
      expBarX + 5,
      expBarY + 9
    );

    this.ctx.font = 'bold 20px "Courier New"';
    this.ctx.textAlign = 'right';
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillText(
      `时间: ${formatTime(gameState.time)}`,
      this.canvas.width - 20,
      40
    );
    this.ctx.font = '16px "Courier New"';
    this.ctx.fillText(
      `击杀: ${gameState.kills}`,
      this.canvas.width - 20,
      65
    );

    this.ctx.textAlign = 'left';
    this.ctx.font = '12px "Courier New"';
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    this.ctx.fillText(
      'WASD / 方向键移动 | 1 2 3 选择升级 | 空格 暂停',
      20,
      this.canvas.height - 20
    );

    this.ctx.restore();
  }

  drawUpgradeUI(options: UpgradeOption[], playerLevel: number): void {
    const overlayAlpha = 0.85;
    this.ctx.fillStyle = `rgba(0, 0, 0, ${overlayAlpha})`;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.save();
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 36px "Courier New"';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(
      `升级! 等级 ${playerLevel}`,
      this.canvas.width / 2,
      this.canvas.height / 2 - 150
    );

    this.ctx.font = '18px "Courier New"';
    this.ctx.fillStyle = '#aaaaaa';
    this.ctx.fillText(
      '选择一项强化',
      this.canvas.width / 2,
      this.canvas.height / 2 - 110
    );

    const cardWidth = 220;
    const cardHeight = 200;
    const spacing = 40;
    const totalWidth = cardWidth * options.length + spacing * (options.length - 1);
    const startX = (this.canvas.width - totalWidth) / 2;
    const cardY = this.canvas.height / 2 - cardHeight / 2;

    for (let i = 0; i < options.length; i++) {
      const option = options[i];
      const cardX = startX + i * (cardWidth + spacing);

      if (option.isEvolution) {
        this.ctx.shadowColor = '#ffdd44';
        this.ctx.shadowBlur = 20;
        this.ctx.fillStyle = 'rgba(255, 221, 68, 0.25)';
      } else if (option.type === 'weapon') {
        this.ctx.fillStyle = 'rgba(68, 170, 255, 0.2)';
      } else {
        this.ctx.fillStyle = 'rgba(68, 255, 136, 0.2)';
      }
      this.ctx.fillRect(cardX, cardY, cardWidth, cardHeight);

      if (option.isEvolution) {
        this.ctx.shadowBlur = 15;
        this.ctx.strokeStyle = '#ffdd44';
      } else if (option.type === 'weapon') {
        this.ctx.strokeStyle = '#44aaff';
      } else {
        this.ctx.strokeStyle = '#44ff88';
      }
      this.ctx.lineWidth = 3;
      this.ctx.strokeRect(cardX, cardY, cardWidth, cardHeight);
      this.ctx.shadowBlur = 0;

      if (option.isEvolution) {
        this.ctx.fillStyle = '#ffdd44';
        this.ctx.shadowColor = '#ffdd44';
        this.ctx.shadowBlur = 10;
      } else {
        this.ctx.fillStyle = '#ffffff';
      }
      this.ctx.font = 'bold 18px "Courier New"';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(option.name, cardX + cardWidth / 2, cardY + 40);
      this.ctx.shadowBlur = 0;

      this.ctx.font = '12px "Courier New"';
      this.ctx.fillStyle = option.isEvolution ? '#ffdd44' : '#aaaaaa';
      this.ctx.fillText(
        option.isEvolution ? '[进化]' : option.isNew ? '[新]' : `Lv.${option.level} / ${option.maxLevel}`,
        cardX + cardWidth / 2,
        cardY + 65
      );

      this.ctx.font = '13px "Courier New"';
      this.ctx.fillStyle = '#ffffff';
      this.ctx.textAlign = 'center';

      const chars = option.description.split('');
      let line = '';
      let lineY = cardY + 100;

      for (let j = 0; j < chars.length; j++) {
        const testLine = line + chars[j];
        const metrics = this.ctx.measureText(testLine);
        if (metrics.width > cardWidth - 30 && j > 0) {
          this.ctx.fillText(line, cardX + cardWidth / 2, lineY);
          line = chars[j];
          lineY += 20;
        } else {
          line = testLine;
        }
      }
      this.ctx.fillText(line, cardX + cardWidth / 2, lineY);

      this.ctx.fillStyle = option.isEvolution ? '#ffdd44' : '#ffdd44';
      this.ctx.font = 'bold 16px "Courier New"';
      this.ctx.fillText(
        `按 ${i + 1}`,
        cardX + cardWidth / 2,
        cardY + cardHeight - 25
      );
    }

    this.ctx.restore();
  }

  drawPauseScreen(): void {
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.save();
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 48px "Courier New"';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('暂停', this.canvas.width / 2, this.canvas.height / 2 - 20);

    this.ctx.font = '18px "Courier New"';
    this.ctx.fillStyle = '#aaaaaa';
    this.ctx.fillText('按 空格 继续游戏', this.canvas.width / 2, this.canvas.height / 2 + 20);
    this.ctx.restore();
  }

  drawGameOverScreen(time: number, kills: number): void {
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.save();
    this.ctx.fillStyle = '#ff4444';
    this.ctx.font = 'bold 56px "Courier New"';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('游戏结束', this.canvas.width / 2, this.canvas.height / 2 - 80);

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 28px "Courier New"';
    this.ctx.fillText(
      `存活时间: ${formatTime(time)}`,
      this.canvas.width / 2,
      this.canvas.height / 2 - 20
    );
    this.ctx.fillText(
      `击杀数: ${kills}`,
      this.canvas.width / 2,
      this.canvas.height / 2 + 20
    );

    this.ctx.fillStyle = '#44aaff';
    this.ctx.font = '20px "Courier New"';
    this.ctx.fillText(
      '按 R 重新开始',
      this.canvas.width / 2,
      this.canvas.height / 2 + 80
    );
    this.ctx.restore();
  }
}
