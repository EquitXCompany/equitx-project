import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "react-query";
import { useContractStates, useContractStateByKey } from "../useContractState";
import { apiClient } from "../../../utils/apiClient";

jest.mock("../../../utils/apiClient");
const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

const mockContractState = {
  key: "testKey",
  asset_symbol: "XLM",
  value: "testValue",
  updatedAt: "2023-01-01T00:00:00Z",
};

describe("Contract State Hooks", () => {
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

  describe("useContractStates", () => {
    it("should fetch all contract states successfully", async () => {
      mockedApiClient.get.mockResolvedValueOnce({ data: [mockContractState] });

      const { result } = renderHook(() => useContractStates("XLM"), {
        wrapper,
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.[0]).toEqual(
        expect.objectContaining({
          key: "testKey",
          asset_symbol: "XLM",
          value: "testValue",
        })
      );
    });
  });

  describe("useContractStateByKey", () => {
    it("should fetch single contract state successfully", async () => {
      mockedApiClient.get.mockResolvedValueOnce({ data: mockContractState });

      const { result } = renderHook(
        () => useContractStateByKey("XLM", "testKey"),
        { wrapper }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(
        expect.objectContaining({
          key: "testKey",
          asset_symbol: "XLM",
          value: "testValue",
        })
      );
    });

    it("should handle error when fetching single contract state", async () => {
      const error = new Error("Failed to fetch");
      mockedApiClient.get.mockRejectedValueOnce(error);

      const { result } = renderHook(
        () => useContractStateByKey("XLM", "testKey", {retry: false}),
        { wrapper }
      );
      console.log(result)

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error).toBe(error);
    });
  });
});
