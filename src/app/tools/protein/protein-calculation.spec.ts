import { calculateProtein, ProteinInput } from './protein-calculation';

describe('Protein calculation', () => {
  const base: ProteinInput = { weight: 80, height: 180, age: 35, hours: 6,
    goal: 'muscle', sport: 'strength', bodyFat: null, meals: 4, useActualWeight: false };
  const result = (patch: Partial<ProteinInput> = {}) => calculateProtein({ ...base, ...patch });

  it('calculates the sports range, transparent planning point and meal split', () => {
    expect(result().result).toEqual(jasmine.objectContaining({ low: 96, high: 160, target: 128, perMeal: 32, factor: 1.6 }));
  });
  it('uses the general reference below five hours, regardless of goal', () => {
    expect(result({ hours: 4.5, goal: 'fat-loss' }).result?.target).toBe(64);
    expect(result({ hours: 5 }).result?.sports).toBeTrue();
  });
  it('applies the older-adult reference from age 65', () => {
    expect(result({ age: 64, hours: 0 }).result?.target).toBe(64);
    expect(result({ age: 65, hours: 0 }).result?.target).toBe(80);
  });
  it('changes the sports planning choice for fat loss and endurance', () => {
    expect(result({ goal: 'fat-loss' }).result?.target).toBe(144);
    expect(result({ goal: 'maintain', sport: 'endurance' }).result?.target).toBe(112);
  });
  it('uses a disclosed reference weight above BMI 25, with an explicit override', () => {
    const adjusted = result({ weight: 110 }).result!;
    expect(adjusted.referenceWeight).toBeCloseTo(80.676, 3);
    expect(adjusted.adjusted).toBeTrue();
    expect(result({ weight: 110, useActualWeight: true }).result?.target).toBe(176);
  });
  it('does not turn body fat into an unsupported protein multiplier', () => {
    expect(result({ bodyFat: 20 }).result?.leanMass).toBe(64);
    expect(result({ bodyFat: 20 }).result?.target).toBe(result().result?.target);
  });
  it('distributes the unrounded amount over the selected meals', () => {
    expect(result({ meals: 1 }).result?.perMeal).toBe(128);
    expect(result({ meals: 2 }).result?.perMeal).toBe(64);
    expect(result({ meals: 5 }).result?.perMeal).toBe(26);
  });
  it('rejects missing, nonfinite and out-of-range input without a stale result', () => {
    for (const patch of [{ weight: null }, { weight: NaN }, { height: 0 }, { age: 18 }, { hours: -1 }, { bodyFat: 90 }, { meals: 0 }]) {
      const output = result(patch);
      expect(output.result).toBeNull();
      expect(output.errors.length).toBeGreaterThan(0);
    }
  });
  it('does not extrapolate a personal reference for underweight adults', () => {
    expect(result({ weight: 50 }).result).toBeNull();
  });
});
