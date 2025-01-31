import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { useCdps, useCdpByAssetAndAddress } from '../useCdps';
import { apiClient } from '../../../utils/apiClient';
import BigNumber from 'bignumber.js';

jest.mock('../../../utils/apiClient');
const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

const mockCdp = {
  lender: '0x123',
  contract_id: 'contract123',
  xlm_deposited: '100',
  asset_lent: '50',
  status: 'active',
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-01T00:00:00Z',
};

describe('CDP Hooks', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          cacheTime: 0,
          refetchOnWindowFocus: false,
        },
      },
    });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe('useCdps', () => {
    it('should fetch all CDPs successfully', async () => {
      mockedApiClient.get.mockResolvedValueOnce({ data: [mockCdp] });

      const { result } = renderHook(() => useCdps(), { wrapper });

      // Wait for the query to complete
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockedApiClient.get).toHaveBeenCalledWith('/api/cdp');
      expect(result.current.data).toHaveLength(1);
      expect(result.current.data?.[0]).toEqual({
        ...mockCdp,
        xlm_deposited: new BigNumber('100'),
        asset_lent: new BigNumber('50'),
        createdAt: new Date(mockCdp.createdAt),
        updatedAt: new Date(mockCdp.updatedAt),
      });
    });

    it('should handle fetch errors', async () => {
      const error = new Error('Failed to fetch');
      mockedApiClient.get.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useCdps({ retry: false }), { wrapper });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(mockedApiClient.get).toHaveBeenCalledWith('/api/cdp');
      expect(result.current.error).toEqual(error);
      expect(result.current.data).toBeUndefined();
    });
  });

  describe('useCdpByAssetAndAddress', () => {
    it('should fetch single CDP successfully', async () => {
      mockedApiClient.get.mockResolvedValueOnce({ data: mockCdp });

      const { result } = renderHook(
        () => useCdpByAssetAndAddress('XLM', '0x123'),
        { wrapper }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockedApiClient.get).toHaveBeenCalledWith('/api/cdp/XLM/0x123');
      expect(result.current.data).toEqual({
        ...mockCdp,
        xlm_deposited: new BigNumber('100'),
        asset_lent: new BigNumber('50'),
        createdAt: new Date(mockCdp.createdAt),
        updatedAt: new Date(mockCdp.updatedAt),
      });
    });

    it('should handle fetch errors for single CDP', async () => {
      const error = new Error('Failed to fetch');
      mockedApiClient.get.mockRejectedValueOnce(error);

      const { result } = renderHook(
        () => useCdpByAssetAndAddress('XLM', '0x123', { retry: false }),
        { wrapper }
      );

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(mockedApiClient.get).toHaveBeenCalledWith('/api/cdp/XLM/0x123');
      expect(result.current.error).toEqual(error);
      expect(result.current.data).toBeUndefined();
    });
  });
});
