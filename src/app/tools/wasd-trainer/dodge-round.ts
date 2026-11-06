export const WIDTH = 640;
export const HEIGHT = 420;
export const ROUND_SECONDS = 30;
export const PLAYER_RADIUS = 12;
export const HAZARD_RADIUS = 18;
export const STEP = 1 / 120;

export const LEVELS = {
  easy: { label: 'Einstieg', interval: 1.5, speed: 190, warning: 0.85 },
  medium: { label: 'Normal', interval: 1, speed: 255, warning: 0.65 },
  hard: { label: 'Schnell', interval: 0.65, speed: 320, warning: 0.5 },
  veryFast: { label: 'Sehr schnell', interval: 0.56, speed: 480, warning: 0.5 },
  extreme: { label: 'Extrem', interval: 0.48, speed: 650, warning: 0.5 },
};
export type Level = keyof typeof LEVELS;
export interface Point { x: number; y: number; }
interface Hazard {
  at: number;
  warning: number;
  origin: Point;
  velocity: Point;
}
export interface Round {
  elapsed: number;
  player: Point;
  hazards: Hazard[];
  outcome: 'hit' | 'complete' | null;
}

export function makeRound(level: Level, seed: number): Round {
  const { speed, interval, warning } = LEVELS[level];
  let state = seed >>> 0;
  const random = () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const hazards: Hazard[] = [];
  // Cover the arena from edge to edge, including corners.
  const horizontalLanes = Array.from({ length: 9 }, (_, i) =>
    PLAYER_RADIUS + i * (HEIGHT - 2 * PLAYER_RADIUS) / 8);
  for (let i = horizontalLanes.length - 1; i > 0; i--) {
    const other = Math.floor(random() * (i + 1));
    [horizontalLanes[i], horizontalLanes[other]] = [horizontalLanes[other], horizontalLanes[i]];
  }
  for (let at = 0.9; at < ROUND_SECONDS; at += interval) {
    const index = hazards.length;
    const vertical = index % 2 === 0;
    const forward = random() < 0.5;
    const extent = vertical ? WIDTH : HEIGHT;
    // Start with a center lane so the first obstacle calls for a deliberate move.
    const lane = index === 0 ? extent / 2 : vertical
      ? PLAYER_RADIUS + random() * (extent - 2 * PLAYER_RADIUS)
      : horizontalLanes[Math.floor(index / 2) % horizontalLanes.length];
    const edge = forward ? -HAZARD_RADIUS : (vertical ? HEIGHT : WIDTH) + HAZARD_RADIUS;
    const velocity = forward ? speed : -speed;
    hazards.push({
      at, warning,
      origin: vertical ? { x: lane, y: edge } : { x: edge, y: lane },
      velocity: vertical ? { x: 0, y: velocity } : { x: velocity, y: 0 },
    });
  }
  return { elapsed: 0, player: { x: WIDTH / 2, y: HEIGHT / 2 }, hazards, outcome: null };
}

export function hazardPosition(hazard: Hazard, elapsed: number): Point {
  const age = elapsed - hazard.at;
  return { x: hazard.origin.x + hazard.velocity.x * age, y: hazard.origin.y + hazard.velocity.y * age };
}

export function visibleHazards(round: Round) {
  return round.hazards.flatMap((hazard, index) => {
    const age = round.elapsed - hazard.at;
    if (age < -hazard.warning) return [];
    const { x, y } = hazardPosition(hazard, round.elapsed);
    if (age >= 0 && (x < -HAZARD_RADIUS || x > WIDTH + HAZARD_RADIUS ||
      y < -HAZARD_RADIUS || y > HEIGHT + HAZARD_RADIUS)) return [];
    return [{ index, x, y, warning: age < 0, lane: hazard.origin, vertical: hazard.velocity.x === 0 }];
  });
}

export function advance(round: Round, direction: Point) {
  if (round.outcome) return;
  round.elapsed += STEP;
  const length = Math.hypot(direction.x, direction.y);
  if (length > 0) {
    const distance = 235 * STEP / length;
    round.player.x = clamp(round.player.x + direction.x * distance, WIDTH);
    round.player.y = clamp(round.player.y + direction.y * distance, HEIGHT);
  }
  const collision = round.hazards.some(hazard => {
    if (round.elapsed < hazard.at) return false;
    const { x, y } = hazardPosition(hazard, round.elapsed);
    return Math.hypot(x - round.player.x, y - round.player.y) < PLAYER_RADIUS + HAZARD_RADIUS;
  });
  if (collision) round.outcome = 'hit';
  else if (round.elapsed + 1e-8 >= ROUND_SECONDS) {
    round.elapsed = ROUND_SECONDS;
    round.outcome = 'complete';
  }
}

function clamp(position: number, extent: number) {
  return Math.max(PLAYER_RADIUS, Math.min(extent - PLAYER_RADIUS, position));
}
