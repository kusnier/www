export type AimMode = 'random' | 'horizontal' | 'vertical';
export interface Point { x: number; y: number; }

export function targetPosition(width: number, height: number, size: number, spread: number,
  mode: AimMode, index: number, previous: Point | null, random = Math.random): Point {
  const padding = 12;
  const roomX = Math.max(0, width - size - padding * 2);
  const roomY = Math.max(0, height - size - padding * 2);
  const centerX = (width - size) / 2, centerY = (height - size) / 2;
  const halfX = roomX * spread / 2, halfY = roomY * spread / 2;
  const side = index % 2 === 0 ? -1 : 1;
  if (mode === 'horizontal') return { x: centerX + side * halfX, y: centerY };
  if (mode === 'vertical') return { x: centerX, y: centerY + side * halfY };
  const minimumDistance = Math.max(size * 1.25, Math.min(width, height) * 0.18);
  for (let attempt = 0; attempt < 12; attempt++) {
    const candidate = { x: centerX + (random() * 2 - 1) * halfX, y: centerY + (random() * 2 - 1) * halfY };
    if (!previous || Math.hypot(candidate.x - previous.x, candidate.y - previous.y) >= minimumDistance) return candidate;
  }
  const corners = [
    { x: centerX - halfX, y: centerY - halfY }, { x: centerX + halfX, y: centerY - halfY },
    { x: centerX - halfX, y: centerY + halfY }, { x: centerX + halfX, y: centerY + halfY },
  ];
  return corners.reduce((best, point) => !previous || Math.hypot(point.x - previous.x, point.y - previous.y) > Math.hypot(best.x - previous.x, best.y - previous.y) ? point : best);
}

export function aimStatistics(reactions: number[], misses: number, elapsedMs: number) {
  const hits = reactions.length;
  const sorted = [...reactions].sort((a, b) => a - b);
  const middle = Math.floor(hits / 2);
  return {
    hits,
    accuracy: hits + misses ? Math.round(hits / (hits + misses) * 100) : 0,
    average: hits ? Math.round(reactions.reduce((sum, value) => sum + value, 0) / hits) : 0,
    median: hits ? Math.round(hits % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2) : 0,
    fastest: hits ? Math.round(sorted[0]) : 0,
    perSecond: elapsedMs > 0 ? hits / (elapsedMs / 1000) : 0,
  };
}
