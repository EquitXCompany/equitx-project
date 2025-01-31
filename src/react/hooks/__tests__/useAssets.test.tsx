import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { useAssets, useAssetBySymbol } from '../useAssets';
import { apiClient } from '../../../utils/apiClient';
import BigNumber from 'bignumber.js';

jest.mock('../../../utils/apiClient');
const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

const mockAsset = {
  symbol: 'XLM',
  name: 'Stellar',
  total_supply: '1000000',
  price: '0.5',
  contract_id: 'contract123',
};

describe('Asset Hooks', () => {
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

  describe('useAssets', () => {
    it('should fetch all assets successfully', async () => {
      mockedApiClient.get.mockResolvedValueOnce({ data: [mockAsset] });

      const { result } = renderHook(() => useAssets(), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.[0]).toEqual(expect.objectContaining({
        symbol: 'XLM',
        total_supply: new BigNumber('1000000'),
        price: new BigNumber('0.5'),
      }));
    });
  });

  describe('useAssetBySymbol', () => {
    it('should fetch single asset successfully', async () => {
      mockedApiClient.get.mockResolvedValueOnce({ data: mockAsset });

      const { result } = renderHook(() => useAssetBySymbol('XLM'), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(expect.objectContaining({
        symbol: 'XLM',
        total_supply: new BigNumber('1000000'),
        price: new BigNumber('0.5'),
      }));
    });
  });
});
