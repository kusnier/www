import { aimStatistics, targetPosition } from './aim-math';

describe('Aim trainer positions and statistics', () => {
  it('keeps targets inside mobile and desktop fields for every mode and size', () => {
    for (const width of [272, 320, 600, 816]) for (const size of [28, 48, 64]) {
      for (const mode of ['random', 'horizontal', 'vertical'] as const) for (let index = 0; index < 30; index++) {
        const point = targetPosition(width, 300, size, 0.9, mode, index, { x: 100, y: 100 });
        expect(point.x).toBeGreaterThanOrEqual(12); expect(point.y).toBeGreaterThanOrEqual(12);
        expect(point.x + size).toBeLessThanOrEqual(width - 12);
        expect(point.y + size).toBeLessThanOrEqual(288);
      }
    }
  });
  it('alternates fixed targets and avoids repeated random positions', () => {
    const first = targetPosition(600, 400, 48, 0.75, 'horizontal', 0, null);
    const next = targetPosition(600, 400, 48, 0.75, 'horizontal', 1, first);
    expect(first.y).toBe(next.y); expect(first.x).toBeLessThan(next.x);
    const random = targetPosition(600, 400, 48, 0.75, 'random', 1, { x: 276, y: 176 }, () => 0.5);
    expect(Math.hypot(random.x - 276, random.y - 176)).toBeGreaterThan(60);
  });
  it('calculates accuracy, mean and median from actual hit timings', () => {
    const stats = aimStatistics([100, 200, 300, 1400], 1, 4000);
    expect(stats).toEqual({ hits: 4, accuracy: 80, average: 500, median: 250, fastest: 100, perSecond: 1 });
    expect(aimStatistics([], 0, 0)).toEqual({ hits: 0, accuracy: 0, average: 0, median: 0, fastest: 0, perSecond: 0 });
  });
});
