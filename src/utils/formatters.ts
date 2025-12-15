import BigNumber from "bignumber.js";

export const formatCurrency = (
  value: BigNumber | number | string,
  magnitude: number,
  decimals = 2,
  currency = "",
): string => {
  const bn = new BigNumber(value).dividedBy(new BigNumber(10).pow(magnitude));
  if (bn.isEqualTo(0)) {
    return `${bn.toFormat(decimals)} ${currency}`;
  }
  if (bn.isNaN()) return "N/A";

  // For values >= 1M, use 2 decimals with M/B suffix
  if (bn.isGreaterThanOrEqualTo(1e9)) {
    return `${bn.div(1e9).toFormat(decimals)}B ${currency}`;
  }
  if (bn.isGreaterThanOrEqualTo(1e6)) {
    return `${bn.div(1e6).toFormat(decimals)}M ${currency}`;
  }
  if (bn.isGreaterThanOrEqualTo(1e3)) {
    return `${bn.div(1e3).toFormat(decimals)}K ${currency}`;
  }

  // For values >= 1, use 2 decimals
  if (bn.isGreaterThanOrEqualTo(1)) {
    return `${bn.toFormat(decimals)} ${currency}`;
  }

  // For values between 0.1 and 1, use 3 decimals
  if (bn.isGreaterThanOrEqualTo(0.1)) {
    return `${bn.toFormat(decimals)} ${currency}`;
  }

  // For values between 0.01 and 0.1, use 4 decimals
  if (bn.isGreaterThanOrEqualTo(0.01)) {
    return `${bn.toFormat(decimals)} ${currency}`;
  }

  // For very small values, use scientific notation
  if (bn.isLessThan(0.01)) {
    return `${bn.toExponential(decimals)} ${currency}`;
  }

  return `${bn.toFormat(decimals)} ${currency}`;
};

export const formatPercentage = (
  value: BigNumber | number | string,
  decimals = 2,
): string => {
  const bn = new BigNumber(value);
  return bn.isNaN() ? "N/A" : `${bn.multipliedBy(100).toFormat(decimals)}%`;
};

export const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const colorPalette = [
  "var(--color-primary-light)", // Blue
  "var(--color-secondary-light)", // Purple
  "var(--color-accent)", // Teal
  "var(--color-primary-dark)", // Blue
  "var(--color-secondary-dark)", // Purple
  "var(--color-accent-dark)", // Teal
] as const;

export function generateAssetColors(assets: string[]): Record<string, string> {
  return assets.reduce(
    (acc, asset, index) => ({
      ...acc,
      [asset]: colorPalette[index % colorPalette.length],
    }),
    {},
  );
}
