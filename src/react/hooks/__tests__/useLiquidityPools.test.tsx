import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { useLiquidityPools, useLiquidityPoolByAsset } from '../useLiquidityPools';
import { apiClient } from '../../../utils/apiClient';
import BigNumber from 'bignumber.js';

jest.mock('../../../utils/apiClient');
const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

const mockLiquidityPool = {
  asset_symbol: 'XLM',
  total_liquidity: '1000000',
  available_liquidity: '500000',
  utilization_rate: '0.5',
  apy: '0.1',
  contract_id: 'contract123',
  updatedAt: '2023-01-01T00:00:00Z',
};

describe('Liquidity Pool Hooks', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useLiquidityPools', () => {
    it('should fetch all liquidity pools successfully', async () => {
      mockedApiClient.get.mockResolvedValueOnce({ data: [mockLiquidityPool] });

      const { result } = renderHook(() => useLiquidityPools(), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.[0]).toEqual(expect.objectContaining({
        asset_symbol: 'XLM',
        total_liquidity: new BigNumber('1000000'),
        available_liquidity: new BigNumber('500000'),
        utilization_rate: new BigNumber('0.5'),
        apy: new BigNumber('0.1'),
      }));
    });
  });

  describe('useLiquidityPoolByAsset', () => {
    it('should fetch single liquidity pool successfully', async () => {
      mockedApiClient.get.mockResolvedValueOnce({ data: mockLiquidityPool });

      const { result } = renderHook(
        () => useLiquidityPoolByAsset('XLM'),
        { wrapper }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(expect.objectContaining({
        asset_symbol: 'XLM',
        total_liquidity: new BigNumber('1000000'),
        available_liquidity: new BigNumber('500000'),
      }));
    });
  });
});
