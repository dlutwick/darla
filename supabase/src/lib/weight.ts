export function kgToLb(kg: number) {
  return Number((kg * 2.20462).toFixed(1));
}

export function lbToKg(lb: number) {
  return Number((lb / 2.20462).toFixed(1));
}

export function formatLbFromKg(kg: number | null | undefined) {
  if (kg == null) return 'Not saved yet';
  return `${kgToLb(kg)} lbs`;
}
