export class InputSystem {
  private keys: Set<string> = new Set();
  private keysPressed: Set<string> = new Set();

  constructor() {
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => this.onKeyUp(e));
    window.addEventListener('blur', () => this.onBlur());
  }

  private onKeyDown(e: KeyboardEvent): void {
    const key = e.key.toLowerCase();
    if (!this.keys.has(key)) {
      this.keysPressed.add(key);
    }
    this.keys.add(key);
    
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) {
      e.preventDefault();
    }
  }

  private onKeyUp(e: KeyboardEvent): void {
    const key = e.key.toLowerCase();
    this.keys.delete(key);
  }

  private onBlur(): void {
    this.keys.clear();
    this.keysPressed.clear();
  }

  isDown(key: string): boolean {
    return this.keys.has(key.toLowerCase());
  }

  wasPressed(key: string): boolean {
    return this.keysPressed.has(key.toLowerCase());
  }

  getMovement(): { x: number; y: number } {
    let x = 0;
    let y = 0;

    if (this.isDown('w') || this.isDown('arrowup')) y -= 1;
    if (this.isDown('s') || this.isDown('arrowdown')) y += 1;
    if (this.isDown('a') || this.isDown('arrowleft')) x -= 1;
    if (this.isDown('d') || this.isDown('arrowright')) x += 1;

    if (x !== 0 && y !== 0) {
      const invLen = 1 / Math.sqrt(2);
      x *= invLen;
      y *= invLen;
    }

    return { x, y };
  }

  endFrame(): void {
    this.keysPressed.clear();
  }
}
