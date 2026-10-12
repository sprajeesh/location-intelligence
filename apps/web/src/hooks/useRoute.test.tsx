import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useRoute } from './useRoute';
import { fetchRoute } from '@/services/api';

jest.mock('@/services/api', () => ({
  fetchRoute: jest.fn(),
}));

const mockFetchRoute = fetchRoute as jest.MockedFunction<typeof fetchRoute>;

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { gcTime: 0 } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useRoute', () => {
  it('reuses one correlation ID across a retry of the same route', async () => {
    mockFetchRoute
      .mockRejectedValueOnce(new Error('transient'))
      .mockResolvedValueOnce({ routes: [], fallback: false } as never);

    const { result } = renderHook(() => useRoute(1, 2, 3, 4, 'driving', true), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true), { timeout: 4000 });

    expect(mockFetchRoute).toHaveBeenCalledTimes(2);
    const [first, second] = mockFetchRoute.mock.calls.map((call) => call[5]);
    expect(first).toEqual(expect.any(String));
    expect(second).toBe(first);
  });
});
