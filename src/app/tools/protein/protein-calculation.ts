export type Goal = 'maintain' | 'muscle' | 'fat-loss';
export type Sport = 'strength' | 'endurance' | 'mixed';

export interface ProteinInput {
  weight: number | null;
  height: number | null;
  age: number | null;
  hours: number | null;
  goal: Goal;
  sport: Sport;
  bodyFat: number | null;
  meals: number;
  useActualWeight: boolean;
}

/** DGE adult reference values and the broad DGE sports range.
 * The point within the sports range is an explicitly labelled planning choice,
 * not a clinical requirement or a separate goal-specific DGE recommendation.
 */
export function calculateProtein(input: ProteinInput) {
  const errors: string[] = [];
  const valid = (value: number | null, min: number, max: number) =>
    value !== null && Number.isFinite(value) && value >= min && value <= max;
  if (!valid(input.weight, 35, 300)) errors.push('Bitte ein Gewicht zwischen 35 und 300 kg eingeben.');
  if (!valid(input.height, 120, 230)) errors.push('Bitte eine Größe zwischen 120 und 230 cm eingeben.');
  if (!valid(input.age, 19, 100) || !Number.isInteger(input.age)) errors.push('Der Rechner ist für Erwachsene von 19 bis 100 Jahren ausgelegt.');
  if (!valid(input.hours, 0, 40)) errors.push('Bitte einen Trainingsumfang zwischen 0 und 40 Stunden pro Woche eingeben.');
  if (input.bodyFat !== null && !valid(input.bodyFat, 3, 65)) errors.push('Körperfettanteil bitte leer lassen oder zwischen 3 und 65 % angeben.');
  if (![1, 2, 3, 4, 5].includes(input.meals)) errors.push('Bitte eine bis fünf Mahlzeiten auswählen.');
  if (!['maintain', 'muscle', 'fat-loss'].includes(input.goal) || !['strength', 'endurance', 'mixed'].includes(input.sport)) errors.push('Bitte ein Ziel und eine Sportart auswählen.');
  if (errors.length) return { errors, result: null };

  const weight = input.weight!;
  const height = input.height! / 100;
  const bmi = weight / (height * height);
  if (bmi < 18.5) return { errors: ['Bei einem BMI unter 18,5 gibt dieser Rechner keinen persönlichen Richtwert aus. Lass deinen Bedarf individuell einordnen.'], result: null };
  const adjusted = bmi > 25 && !input.useActualWeight;
  const referenceWeight = adjusted ? 24.9 * height * height : weight;
  const sports = input.hours! >= 5;
  const base = input.age! >= 65 ? 1 : 0.8;
  const factor = !sports ? base : input.goal === 'fat-loss' ? 1.8
    : input.goal === 'muscle' ? 1.6 : input.sport === 'endurance' ? 1.4 : 1.6;
  const lowFactor = sports ? 1.2 : base;
  const highFactor = sports ? 2 : base;
  return {
    errors,
    result: {
      bmi, adjusted, referenceWeight, sports, factor, lowFactor, highFactor,
      target: Math.round(referenceWeight * factor),
      low: Math.round(referenceWeight * lowFactor),
      high: Math.round(referenceWeight * highFactor),
      perMeal: Math.round(referenceWeight * factor / input.meals),
      leanMass: input.bodyFat === null ? null : weight * (1 - input.bodyFat / 100),
    },
  };
}
