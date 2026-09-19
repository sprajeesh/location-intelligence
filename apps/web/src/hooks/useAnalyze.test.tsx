import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useAnalyze } from './useAnalyze';
import { useLocationStore } from '@/store';
import { analyzeLocation } from '@/services/api';
import type { AnalyzeResponse } from '@/types/api';

jest.mock('@/services/api', () => ({
  ...jest.requireActual('@/services/api'),
  analyzeLocation: jest.fn(),
}));

const mockAnalyzeLocation = analyzeLocation as jest.MockedFunction<
  typeof analyzeLocation
>;

const addressA = { displayName: 'A', lat: -36.85, lon: 174.76 };
const addressB = { displayName: 'B', lat: -37.0, lon: 175.0 };

const mockResponse: AnalyzeResponse = {
  location: { lat: addressA.lat, lon: addressA.lon, displayName: addressA.displayName },
  features: [],
  score: { overall: 0, coverage: '0/0', categories: [] } as unknown as AnalyzeResponse['score'],
  warnings: [],
};

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useAnalyze', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useLocationStore.setState({
      selectedAddress: null,
      analysisResult: null,
      isAnalyzing: false,
      toasts: [],
    });
  });

  it('applies the result when the response still matches the currently selected address', async () => {
    useLocationStore.setState({ selectedAddress: addressA });
    mockAnalyzeLocation.mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useAnalyze(), { wrapper });
    act(() => {
      result.current.mutate({
        address: addressA.displayName,
        lat: addressA.lat,
        lon: addressA.lon,
        radiusKm: 5,
        distanceMode: 'driving',
      });
    });

    await waitFor(() =>
      expect(useLocationStore.getState().analysisResult).toBe(mockResponse),
    );
    expect(useLocationStore.getState().isAnalyzing).toBe(false);
  });

  it('ignores a stale response for an address that was cleared before it resolved', async () => {
    useLocationStore.setState({ selectedAddress: addressA });
    let resolveRequest!: (value: AnalyzeResponse) => void;
    mockAnalyzeLocation.mockReturnValue(
      new Promise((resolve) => {
        resolveRequest = resolve;
      }),
    );

    const { result } = renderHook(() => useAnalyze(), { wrapper });
    act(() => {
      result.current.mutate({
        address: addressA.displayName,
        lat: addressA.lat,
        lon: addressA.lon,
        radiusKm: 5,
        distanceMode: 'driving',
      });
    });

    // Address cleared while the request is still in flight.
    act(() => {
      useLocationStore.setState({ selectedAddress: null });
    });
    resolveRequest(mockResponse);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(useLocationStore.getState().analysisResult).toBeNull();
  });

  it('ignores a stale response for an address that was replaced before it resolved', async () => {
    useLocationStore.setState({ selectedAddress: addressA });
    let resolveRequest!: (value: AnalyzeResponse) => void;
    mockAnalyzeLocation.mockReturnValue(
      new Promise((resolve) => {
        resolveRequest = resolve;
      }),
    );

    const { result } = renderHook(() => useAnalyze(), { wrapper });
    act(() => {
      result.current.mutate({
        address: addressA.displayName,
        lat: addressA.lat,
        lon: addressA.lon,
        radiusKm: 5,
        distanceMode: 'driving',
      });
    });

    // A different address is selected before the first request resolves.
    act(() => {
      useLocationStore.setState({ selectedAddress: addressB });
    });
    resolveRequest(mockResponse);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(useLocationStore.getState().analysisResult).toBeNull();
  });

  it('ignores a stale error for an address that was cleared before it rejected', async () => {
    useLocationStore.setState({ selectedAddress: addressA, analysisResult: mockResponse });
    let rejectRequest!: (reason: Error) => void;
    mockAnalyzeLocation.mockReturnValue(
      new Promise((_resolve, reject) => {
        rejectRequest = reject;
      }),
    );

    const { result } = renderHook(() => useAnalyze(), { wrapper });
    act(() => {
      result.current.mutate({
        address: addressA.displayName,
        lat: addressA.lat,
        lon: addressA.lon,
        radiusKm: 5,
        distanceMode: 'driving',
      });
    });

    act(() => {
      useLocationStore.setState({ selectedAddress: null });
    });
    rejectRequest(new Error('boom'));

    await waitFor(() => expect(result.current.isError).toBe(true));
    // The stale error must not clear a result belonging to whatever is
    // (or isn't) selected now, nor surface a toast for an abandoned request.
    expect(useLocationStore.getState().analysisResult).toBe(mockResponse);
    expect(useLocationStore.getState().toasts).toHaveLength(0);
  });
});
