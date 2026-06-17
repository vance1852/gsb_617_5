export class Camera {
  public x: number = 0;
  public y: number = 0;
  public targetX: number = 0;
  public targetY: number = 0;
  public width: number;
  public height: number;
  public smoothing: number = 0.1;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  setTarget(x: number, y: number): void {
    this.targetX = x;
    this.targetY = y;
  }

  update(): void {
    this.x += (this.targetX - this.x) * this.smoothing;
    this.y += (this.targetY - this.y) * this.smoothing;
  }

  worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
    return {
      x: worldX - this.x + this.width / 2,
      y: worldY - this.y + this.height / 2
    };
  }

  screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    return {
      x: screenX + this.x - this.width / 2,
      y: screenY + this.y - this.height / 2
    };
  }

  isVisible(worldX: number, worldY: number, margin: number = 100): boolean {
    const screen = this.worldToScreen(worldX, worldY);
    return (
      screen.x >= -margin &&
      screen.x <= this.width + margin &&
      screen.y >= -margin &&
      screen.y <= this.height + margin
    );
  }
}
