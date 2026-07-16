export function roundValue(value: number, maxDecimals = 1) {
  return Number(value.toFixed(maxDecimals));
}

export function formatNumber(value: number | null | undefined, maxDecimals = 1) {
  if (value == null || Number.isNaN(value)) {
    return '—';
  }

  const rounded = roundValue(value, maxDecimals);
  return Number.isInteger(rounded)
    ? `${rounded}`
    : rounded.toFixed(maxDecimals).replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1');
}

export function formatWithUnit(value: number | null | undefined, unit: string, maxDecimals = 1) {
  if (value == null || Number.isNaN(value)) {
    return '—';
  }

  if (unit === '$') {
    return `$${Number(value).toFixed(maxDecimals)}`;
  }

  const formatted = formatNumber(value, maxDecimals);
  return formatted === '—' ? formatted : `${formatted} ${unit}`;
}

export function formatPercent(value: number | null | undefined, maxDecimals = 1) {
  const formatted = formatNumber(value, maxDecimals);
  return formatted === '—' ? formatted : `${formatted}%`;
}
