import { http, HttpResponse } from "msw";
import { faker } from "@faker-js/faker";

// Get the base URL from environment, same as apiClient
const getBaseURL = () => {
  if (typeof import.meta !== "undefined" && import.meta.env) {
    return import.meta.env.PUBLIC_API_URL ?? "http://localhost:3000";
  }
  return "http://localhost:3000";
};

const BASE_URL = getBaseURL();

// Mock data generators matching actual entity structures
const generateProtocolStats = () => ({
  timestamp: new Date().toISOString(),
  globalMetrics: {
    totalValueLocked: faker.number
      .int({ min: 1000000, max: 10000000 })
      .toString(),
    totalDebt: faker.number.int({ min: 500000, max: 5000000 }).toString(),
    totalOutstandingInterest: faker.number
      .int({ min: 10000, max: 100000 })
      .toString(),
    totalPaidInterest: faker.number.int({ min: 5000, max: 50000 }).toString(),
    uniqueUsers: faker.number.int({ min: 1000, max: 50000 }),
    activeCDPs: faker.number.int({ min: 100, max: 1000 }),
    totalStaked: faker.number.int({ min: 100000, max: 1000000 }).toString(),
  },
  riskMetrics: {
    systemCollateralization: faker.number
      .float({ min: 1.5, max: 3.0, fractionDigits: 5 })
      .toString(),
    liquidationEvents24h: faker.number.int({ min: 0, max: 10 }),
    averageHealthFactor: faker.number
      .float({ min: 1.2, max: 2.5, fractionDigits: 5 })
      .toString(),
  },
  volumeMetrics: {
    dailyVolume: faker.number.int({ min: 10000, max: 100000 }).toString(),
  },
  growthMetrics: {
    userGrowth24h: faker.number
      .float({ min: -5, max: 15, fractionDigits: 5 })
      .toString(),
    tvlGrowth24h: faker.number
      .float({ min: -10, max: 20, fractionDigits: 5 })
      .toString(),
    volumeGrowth24h: faker.number
      .float({ min: -15, max: 25, fractionDigits: 5 })
      .toString(),
  },
});

const generateCDPMetrics = (asset: string) => ({
  asset,
  totalCDPs: faker.number.int({ min: 10, max: 100 }),
  totalXLMLocked: faker.number.int({ min: 10000, max: 100000 }).toString(),
  interestMetrics: {
    totalOutstandingInterest: faker.number
      .int({ min: 1000, max: 10000 })
      .toString(),
    totalPaidInterest: faker.number.int({ min: 500, max: 5000 }).toString(),
  },
  collateralRatio: faker.number
    .float({ min: 1.5, max: 3.0, fractionDigits: 5 })
    .toString(),
  riskMetrics: {
    nearLiquidation: faker.number.int({ min: 0, max: 5 }),
    recentLiquidations: faker.number.int({ min: 0, max: 3 }),
    healthScore: faker.number.int({ min: 50, max: 100 }),
  },
  volumeMetrics: {
    dailyVolume: faker.number.int({ min: 1000, max: 10000 }).toString(),
    weeklyVolume: faker.number.int({ min: 5000, max: 50000 }).toString(),
    monthlyVolume: faker.number.int({ min: 20000, max: 200000 }).toString(),
  },
  collateralRatioHistogram: {
    bucketSize: 25,
    min: 0,
    max: 200,
    buckets: Array.from({ length: 10 }, () =>
      faker.number.int({ min: 0, max: 100000 }).toString(),
    ),
  },
  timestamp: new Date().toISOString(),
});

const generateTVLMetrics = (asset: string) => ({
  asset,
  totalXlmLocked: faker.number.int({ min: 10000, max: 100000 }).toString(),
  totalXassetsMinted: faker.number.int({ min: 5000, max: 50000 }).toString(),
  totalXassetsStaked: faker.number.int({ min: 1000, max: 10000 }).toString(),
  activeCDPsCount: faker.number.int({ min: 10, max: 100 }),
  tvlUSD: faker.number.int({ min: 50000, max: 500000 }).toString(),
  totalXassetsMintedUSD: faker.number
    .int({ min: 25000, max: 250000 })
    .toString(),
  totalXassetsStakedUSD: faker.number.int({ min: 5000, max: 50000 }).toString(),
  openAccounts: faker.number.int({ min: 50, max: 500 }),
  stakedShareHistogram: {
    bucketSize: 0.5,
    min: 0,
    max: 50,
    buckets: Array.from({ length: 10 }, () =>
      faker.number.int({ min: 0, max: 50000 }).toString(),
    ),
  },
  timestamp: new Date().toISOString(),
});

const generateLiquidationData = () => ({
  cdpId: faker.string.uuid(),
  asset: faker.helpers.arrayElement(MOCK_ASSETS),
  collateralLiquidated: faker.number.int({ min: 1000, max: 10000 }).toString(),
  collateralLiquidatedUsd: faker.number.int({ min: 500, max: 5000 }).toString(),
  principalRepaid: faker.number.int({ min: 500, max: 5000 }).toString(),
  accruedInterestRepaid: faker.number.int({ min: 10, max: 100 }).toString(),
  collateralAppliedToInterest: faker.number
    .int({ min: 10, max: 100 })
    .toString(),
  timestamp: new Date().toISOString(),
  collateralizationRatio: faker.number
    .int({ min: 100000, max: 150000 })
    .toString(),
  xlmPrice: faker.number.int({ min: 1000, max: 5000 }).toString(),
  xassetPrice: faker.number.int({ min: 8000, max: 12000 }).toString(),
});

const generateUserMetrics = (address: string) => ({
  address,
  totalCDPs: faker.number.int({ min: 1, max: 10 }),
  activePositions: {
    totalValueLocked: faker.number.int({ min: 10000, max: 100000 }).toString(),
    totalDebt: faker.number.int({ min: 5000, max: 50000 }).toString(),
    totalAccruedInterest: faker.number.int({ min: 100, max: 1000 }).toString(),
    totalInterestPaid: faker.number.int({ min: 50, max: 500 }).toString(),
    averageCollateralizationRatio: faker.number
      .float({ min: 1.5, max: 3.0, fractionDigits: 5 })
      .toString(),
  },
  historicalMetrics: {
    totalVolume: faker.number.int({ min: 50000, max: 500000 }).toString(),
    liquidationsReceived: faker.number.int({ min: 0, max: 5 }),
    liquidationsExecuted: faker.number.int({ min: 0, max: 3 }),
  },
  riskProfile: {
    riskScore: faker.number.int({ min: 10, max: 100 }),
    lastActivity: faker.date.recent({ days: 30 }).toISOString(),
    averagePositionDuration: faker.number.int({ min: 86400, max: 31536000 }), // seconds
  },
});

const generateContractMapping = () => ({
  USDC: "CBND6DVQMJYHE6DGXQVWAGXDTZ6XHJTM5PJQF7PQGTTQ2VDNRDMWKNR7",
  USDT: "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQAHHAGSDTQF",
  BTC: "CA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA74P7UJVSGZ",
  ETH: "CDBND6DVQMJYHE6DGXQVWAGXDTZ6XHJTM5PJQF7PQGTTQ2VDNRDMWKNR7",
  XLM: "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQAHHAGSDTQF",
});

const generateAsset = (symbol: string) => ({
  id: faker.string.uuid(),
  symbol,
  feed_address: faker.string.alphanumeric(56),
  price: faker.number.int({ min: 1000, max: 100000 }).toString(), // Price with 14 decimal places as integer
  last_xlm_price: faker.number.int({ min: 1000, max: 5000 }).toString(),
  created_at: faker.date.past({ years: 1 }).toISOString(),
  updated_at: faker.date.recent({ days: 7 }).toISOString(),
  is_deleted: false,
});

const generateCDP = (asset: string) => ({
  id: faker.string.uuid(),
  lender: faker.string.alphanumeric(56),
  xlm_deposited: faker.number.int({ min: 1000, max: 10000 }).toString(),
  asset_lent: faker.number.int({ min: 500, max: 5000 }).toString(),
  accrued_interest: faker.number.int({ min: 10, max: 100 }).toString(),
  interest_paid: faker.number.int({ min: 0, max: 50 }).toString(),
  last_interest_time: faker.date.recent({ days: 30 }).getTime().toString(),
  status: faker.number.int({ min: 0, max: 3 }), // CDPStatus enum
  asset: generateAsset(asset),
  created_at: faker.date.past({ years: 1 }).toISOString(),
  updated_at: faker.date.recent({ days: 7 }).toISOString(),
  is_deleted: false,
});

const generateStaker = (address: string, asset: string) => ({
  id: faker.string.uuid(),
  address,
  xasset_deposit: faker.number.int({ min: 1000, max: 10000 }).toString(),
  product_constant: faker.number
    .int({ min: 1000000, max: 10000000 })
    .toString(),
  compounded_constant: faker.number
    .int({ min: 1000000, max: 10000000 })
    .toString(),
  epoch: faker.number.int({ min: 1, max: 100 }).toString(),
  total_rewards_claimed: faker.number.int({ min: 0, max: 5000 }).toString(),
  asset: generateAsset(asset),
  created_at: faker.date.past({ years: 1 }).toISOString(),
  updated_at: faker.date.recent({ days: 7 }).toISOString(),
  is_deleted: false,
});

const generateHistoryData = (generator: () => any, days: number = 30) => {
  return Array.from({ length: days }, (_, i) => {
    const data = generator();
    const date = new Date();
    date.setDate(date.getDate() - (days - i));
    return {
      ...data,
      timestamp: date.toISOString(),
    };
  });
};

// Common assets used in the application
const MOCK_ASSETS = ["USDC", "USDT", "BTC", "ETH", "XLM"];

export const handlers = [
  // Assets mapping endpoint
  http.get(`${BASE_URL}/api/assets/mapping`, () => {
    return HttpResponse.json(generateContractMapping());
  }),

  // Assets endpoints
  http.get(`${BASE_URL}/api/assets`, () => {
    const assets = MOCK_ASSETS.map((symbol) => generateAsset(symbol));
    return HttpResponse.json(assets);
  }),

  http.get(`${BASE_URL}/api/assets/:symbol`, ({ params }) => {
    const { symbol } = params;
    return HttpResponse.json(generateAsset(symbol as string));
  }),

  // CDP endpoints
  http.get(`${BASE_URL}/api/cdps`, () => {
    const cdps = Array.from(
      { length: faker.number.int({ min: 10, max: 50 }) },
      () => generateCDP(faker.helpers.arrayElement(MOCK_ASSETS)),
    );
    return HttpResponse.json(cdps);
  }),

  http.get(`${BASE_URL}/api/cdps/:asset_symbol`, ({ params }) => {
    const { asset_symbol } = params;
    const cdps = Array.from(
      { length: faker.number.int({ min: 5, max: 20 }) },
      () => generateCDP(asset_symbol as string),
    );
    return HttpResponse.json(cdps);
  }),

  http.get(
    `${BASE_URL}/api/cdps/:asset_symbol/lender/:lender`,
    ({ params }) => {
      const { asset_symbol, lender } = params;
      const cdp = {
        ...generateCDP(asset_symbol as string),
        lender: lender as string,
      };
      return HttpResponse.json(cdp);
    },
  ),

  // Protocol stats endpoints
  http.get(`${BASE_URL}/api/protocol-stats/latest`, () => {
    return HttpResponse.json(generateProtocolStats());
  }),

  http.get(`${BASE_URL}/api/protocol-stats/history`, ({ request }) => {
    const url = new URL(request.url);
    const startTime = url.searchParams.get("start_time");
    const endTime = url.searchParams.get("end_time");

    const historyData = generateHistoryData(generateProtocolStats);
    return HttpResponse.json(historyData);
  }),

  // CDP metrics endpoints
  http.get(`${BASE_URL}/api/cdp-metrics/:asset_symbol/latest`, ({ params }) => {
    const { asset_symbol } = params;
    return HttpResponse.json(generateCDPMetrics(asset_symbol as string));
  }),

  http.get(
    `${BASE_URL}/api/cdp-metrics/:asset_symbol/history`,
    ({ request, params }) => {
      const { asset_symbol } = params;
      const url = new URL(request.url);
      const startTime = url.searchParams.get("start_time");
      const endTime = url.searchParams.get("end_time");

      const historyData = generateHistoryData(() =>
        generateCDPMetrics(asset_symbol as string),
      );
      return HttpResponse.json(historyData);
    },
  ),

  // TVL metrics endpoints
  http.get(`${BASE_URL}/api/tvl/:asset_symbol/latest`, ({ params }) => {
    const { asset_symbol } = params;
    return HttpResponse.json(generateTVLMetrics(asset_symbol as string));
  }),

  http.get(
    `${BASE_URL}/api/tvl/:asset_symbol/history`,
    ({ request, params }) => {
      const { asset_symbol } = params;
      const url = new URL(request.url);
      const startTime = url.searchParams.get("start_time");
      const endTime = url.searchParams.get("end_time");

      const historyData = generateHistoryData(() =>
        generateTVLMetrics(asset_symbol as string),
      );
      return HttpResponse.json(historyData);
    },
  ),

  // Liquidations endpoints
  http.get(`${BASE_URL}/api/liquidations`, () => {
    const liquidations = Array.from(
      { length: faker.number.int({ min: 5, max: 20 }) },
      () => generateLiquidationData(),
    );
    return HttpResponse.json(liquidations);
  }),

  http.get(`${BASE_URL}/api/liquidations/asset/:asset_symbol`, ({ params }) => {
    const { asset_symbol } = params;
    const liquidations = Array.from(
      { length: faker.number.int({ min: 2, max: 10 }) },
      () => ({
        ...generateLiquidationData(),
        asset: asset_symbol as string,
      }),
    );
    return HttpResponse.json(liquidations);
  }),

  http.get(`${BASE_URL}/api/liquidations/cdp/:cdp_id`, ({ params }) => {
    const { cdp_id } = params;
    const liquidations = Array.from(
      { length: faker.number.int({ min: 1, max: 5 }) },
      () => ({
        ...generateLiquidationData(),
        cdpId: cdp_id as string,
      }),
    );
    return HttpResponse.json(liquidations);
  }),

  // User metrics endpoints
  http.get(`${BASE_URL}/api/user-metrics/:address`, ({ params }) => {
    const { address } = params;
    return HttpResponse.json(generateUserMetrics(address as string));
  }),

  http.get(
    `${BASE_URL}/api/user-metrics/:address/history`,
    ({ request, params }) => {
      const { address } = params;
      const url = new URL(request.url);
      const startTime = url.searchParams.get("start_time");
      const endTime = url.searchParams.get("end_time");

      const historyData = generateHistoryData(() =>
        generateUserMetrics(address as string),
      );
      return HttpResponse.json(historyData);
    },
  ),

  // Stakers endpoints
  http.get(`${BASE_URL}/api/stakers`, () => {
    const stakers = Array.from(
      { length: faker.number.int({ min: 10, max: 50 }) },
      () =>
        generateStaker(
          faker.string.alphanumeric(56),
          faker.helpers.arrayElement(MOCK_ASSETS),
        ),
    );
    return HttpResponse.json(stakers);
  }),

  http.get(`${BASE_URL}/api/stakers/address/:address`, ({ params }) => {
    const { address } = params;
    const stakers = Array.from(
      { length: faker.number.int({ min: 1, max: 10 }) },
      () =>
        generateStaker(
          address as string,
          faker.helpers.arrayElement(MOCK_ASSETS),
        ),
    );
    return HttpResponse.json(stakers);
  }),

  http.get(
    `${BASE_URL}/api/stakers/asset/:asset_symbol/address/:address`,
    ({ params }) => {
      const { asset_symbol, address } = params;
      const staker = generateStaker(address as string, asset_symbol as string);
      return HttpResponse.json(staker);
    },
  ),
];
