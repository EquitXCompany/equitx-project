import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { useStakers, useStakerByAssetAndAddress } from '../useStakers';
import { apiClient } from '../../../utils/apiClient';
import BigNumber from 'bignumber.js';

jest.mock('../../../utils/apiClient');
const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

const mockStaker = {
  address: '0x123',
  asset_symbol: 'XLM',
  staked_amount: '1000',
  rewards_earned: '100',
  last_claim_timestamp: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-01T00:00:00Z',
};

describe('Staker Hooks', () => {
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

  describe('useStakers', () => {
    it('should fetch all stakers successfully', async () => {
      mockedApiClient.get.mockResolvedValueOnce({ data: [mockStaker] });

      const { result } = renderHook(() => useStakers(), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.[0]).toEqual(expect.objectContaining({
        address: '0x123',
        staked_amount: new BigNumber('1000'),
        rewards_earned: new BigNumber('100'),
      }));
    });
  });

  describe('useStakerByAssetAndAddress', () => {
    it('should fetch single staker successfully', async () => {
      mockedApiClient.get.mockResolvedValueOnce({ data: mockStaker });

      const { result } = renderHook(
        () => useStakerByAssetAndAddress('XLM', '0x123'),
        { wrapper }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(expect.objectContaining({
        address: '0x123',
        staked_amount: new BigNumber('1000'),
        rewards_earned: new BigNumber('100'),
      }));
    });
  });
});
