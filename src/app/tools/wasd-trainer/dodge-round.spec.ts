import { advance, makeRound, ROUND_SECONDS, STEP } from './dodge-round';

describe('WASD parcours', () => {
  it('replays the same obstacle sequence on the same difficulty', () => {
    const original = makeRound('medium', 123);
    expect(makeRound('medium', 123)).toEqual(original);
    expect(makeRound('medium', 456).hazards).not.toEqual(original.hazards);
  });

  it('moves diagonally at the same speed as along one axis', () => {
    const straight = makeRound('medium', 123);
    const diagonal = makeRound('medium', 123);
    const start = { ...straight.player };
    advance(straight, { x: 1, y: 0 });
    advance(diagonal, { x: 1, y: 1 });
    const distance = (round: typeof straight) => Math.hypot(round.player.x - start.x, round.player.y - start.y);
    expect(distance(diagonal)).toBeCloseTo(distance(straight), 8);
  });

  it('ends on collision and freezes the survival time', () => {
    const round = makeRound('easy', 123);
    while (!round.outcome && round.elapsed < 4) advance(round, { x: 0, y: 0 });
    expect(round.outcome).toBe('hit');
    const time = round.elapsed;
    advance(round, { x: 1, y: 0 });
    expect(round.elapsed).toBe(time);
  });

  it('finishes at exactly the round limit when no obstacle hits', () => {
    const round = makeRound('easy', 123);
    round.hazards = [];
    for (let step = 0; step < ROUND_SECONDS / STEP; step++) advance(round, { x: 0, y: 0 });
    expect(round.outcome).toBe('complete');
    expect(round.elapsed).toBe(ROUND_SECONDS);
  });
});
