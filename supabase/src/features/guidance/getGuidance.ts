import { DailySummary } from '../meals/types';

type Targets = {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

export function getGuidance(summary: DailySummary, targets: Targets) {
  const remainingCalories = round(targets.calories - summary.calories);
  const remainingProtein = round(targets.protein_g - summary.protein_g);
  const remainingCarbs = round(targets.carbs_g - summary.carbs_g);
  const remainingFat = round(targets.fat_g - summary.fat_g);

  if (summary.calories === 0) {
    return {
      title: 'Start simple',
      body: 'Begin with one easy meal or snack so the day has a gentle starting point.',
    };
  }

  if (remainingProtein > 25) {
    return {
      title: 'Protein still needs some love',
      body: `You still have about ${remainingProtein} g of protein to work in today, so a protein-first next choice would help.`,
    };
  }

  if (remainingCalories < 200 && remainingCalories >= 0) {
    return {
      title: 'A lighter next choice fits best',
      body: `You have about ${remainingCalories} calories left, so keeping the next meal light would make sense.`,
    };
  }

  if (remainingCarbs < 0) {
    return {
      title: 'Carbs are already a bit ahead',
      body: 'A protein-forward next choice would help bring the day back into balance.',
    };
  }

  if (remainingFat < 0) {
    return {
      title: 'Fat is already a bit ahead',
      body: 'Lean protein or lighter foods would fit the rest of the day better now.',
    };
  }

  return {
    title: 'You are still in a good range',
    body: 'Keep building the day with simple meals and one steady choice at a time.',
  };
}

function round(value: number) {
  return Math.round(value * 10) / 10;
}
