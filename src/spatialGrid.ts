import type { Enemy, Bullet, ExpGem } from './types';

type GridEntity = Enemy | Bullet | ExpGem;

export class SpatialGrid {
  private cellSize: number;
  private cells: Map<string, GridEntity[]> = new Map();

  constructor(cellSize: number = 100) {
    this.cellSize = cellSize;
  }

  private getKey(x: number, y: number): string {
    const cellX = Math.floor(x / this.cellSize);
    const cellY = Math.floor(y / this.cellSize);
    return `${cellX},${cellY}`;
  }

  clear(): void {
    this.cells.clear();
  }

  insert(entity: GridEntity): void {
    const key = this.getKey(entity.x, entity.y);
    if (!this.cells.has(key)) {
      this.cells.set(key, []);
    }
    this.cells.get(key)!.push(entity);
  }

  insertAll(entities: GridEntity[]): void {
    for (const entity of entities) {
      this.insert(entity);
    }
  }

  query(x: number, y: number, radius: number): GridEntity[] {
    const result: GridEntity[] = [];
    const minCellX = Math.floor((x - radius) / this.cellSize);
    const maxCellX = Math.floor((x + radius) / this.cellSize);
    const minCellY = Math.floor((y - radius) / this.cellSize);
    const maxCellY = Math.floor((y + radius) / this.cellSize);

    for (let cx = minCellX; cx <= maxCellX; cx++) {
      for (let cy = minCellY; cy <= maxCellY; cy++) {
        const key = `${cx},${cy}`;
        const cell = this.cells.get(key);
        if (cell) {
          result.push(...cell);
        }
      }
    }

    return result;
  }

  queryEnemies(x: number, y: number, radius: number): Enemy[] {
    return this.query(x, y, radius).filter(
      (e): e is Enemy => 'type' in e && 'health' in e
    );
  }

  queryBullets(x: number, y: number, radius: number): Bullet[] {
    return this.query(x, y, radius).filter(
      (e): e is Bullet => 'pierce' in e && 'hitEnemies' in e
    );
  }

  queryExpGems(x: number, y: number, radius: number): ExpGem[] {
    return this.query(x, y, radius).filter(
      (e): e is ExpGem => 'value' in e && 'pulsePhase' in e
    );
  }
}
