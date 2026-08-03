import type { GridItem } from './GridContainer';

export interface GridPosition {
  x: number;
  y: number;
}

// 在网格中找到适合放置新组件的位置
export function findBestPosition(
  items: GridItem[],
  cols: number,
  defaultWidth: number,
  defaultHeight: number,
): GridPosition {
  const occupiedPositions = new Set(
    items.flatMap(item =>
      Array.from({ length: item.h }, (_, y) =>
        Array.from({ length: item.w }, (_, x) => `${item.x + x},${item.y + y}`)
      ).flat()
    )
  );

  let bestPosition: GridPosition = { x: 0, y: 0 };
  for (let y = 0; y < 100; y++) {
    for (let x = 0; x <= cols - defaultWidth; x++) {
      const positions = Array.from({ length: defaultHeight }, (_, dy) =>
        Array.from({ length: defaultWidth }, (_, dx) => `${x + dx},${y + dy}`)
      ).flat();

      if (positions.every(pos => !occupiedPositions.has(pos))) {
        bestPosition = { x, y };
        break;
      }
    }
    if (bestPosition.x !== 0 || bestPosition.y !== 0) break;
  }

  return bestPosition;
}
