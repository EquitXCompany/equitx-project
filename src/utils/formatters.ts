import BigNumber from 'bignumber.js';

export const formatCurrency = (
  value: BigNumber | number | string,
  decimals = 2,
  currency = ''
): string => {
  const bn = new BigNumber(value);
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
