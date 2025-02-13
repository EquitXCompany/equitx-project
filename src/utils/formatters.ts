import BigNumber from 'bignumber.js';

export const formatCurrency = (
  value: BigNumber | number | string,
  magnitude: number,
  decimals = 2,
  currency = ''
): string => {
  const bn = new BigNumber(value).dividedBy(new BigNumber(10).pow(magnitude));
  if (bn.isNaN()) return 'N/A';
  
  // Format large numbers with K, M, B suffixes
  if (bn.isGreaterThan(1e9)) {
    return `${bn.div(1e9).toFormat(decimals)}B ${currency}`;
  }
  if (bn.isGreaterThan(1e6)) {
    return `${bn.div(1e6).toFormat(decimals)}M ${currency}`;
  }
  if (bn.isGreaterThan(1e3)) {
    return `${bn.div(1e3).toFormat(decimals)}K ${currency}`;
  }
  
  return `${bn.toFormat(decimals)} ${currency}`;
};

export const formatPercentage = (
  value: BigNumber | number | string,
  decimals = 2
): string => {
  const bn = new BigNumber(value);
  return bn.isNaN() ? 'N/A' : `${bn.multipliedBy(100).toFormat(decimals)}%`;
};

export const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

const colorPalette = [
  '#2E86AB', // Blue
  '#A23B72', // Purple
  '#F18F01', // Orange
  '#C73E1D', // Red
  '#3B7A57', // Green
  '#7768AE', // Light Purple
  '#1B998B', // Teal
  '#ED217C', // Pink
  '#2F4858', // Dark Blue
  '#D4B483', // Tan
] as const;

export function generateAssetColors(assets: string[]): Record<string, string> {
  return assets.reduce((acc, asset, index) => ({
    ...acc,
    [asset]: colorPalette[index % colorPalette.length]
  }), {});
}