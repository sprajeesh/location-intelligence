import { renderHook, act } from '@testing-library/react';
import { useReportAction } from './useReportAction';
import { useLocationStore } from '@/store';
import { useReportGeneration } from '@/hooks/useReportGeneration';

jest.mock('@/hooks/useReportGeneration');
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) =>
    ({
      'results.report.readyToast': 'Your report is ready.',
      'results.report.downloadAction': 'Download',
      'results.report.failedToast': "Couldn't generate the report.",
      'results.report.retryAction': 'Retry',
      'results.report.downloadFailedToast': "Couldn't download the report. Please try again.",
    })[key] ?? key,
}));

const mockHook = useReportGeneration as jest.MockedFunction<typeof useReportGeneration>;
const request = {
  address: '1 Queen St',
  lat: -36.85,
  lon: 174.76,
  radiusKm: 5,
  distanceMode: 'driving' as const,
};

const hookState = (over: Partial<ReturnType<typeof useReportGeneration>> = {}) => ({
  state: 'idle' as const,
  error: null,
  jobId: null,
  start: jest.fn().mockResolvedValue(undefined),
  download: jest.fn().mockResolvedValue(undefined),
  reset: jest.fn(),
  ...over,
});

describe('useReportAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useLocationStore.setState({ toasts: [] });
  });

  it('returns generating=false and ready=false when idle', () => {
    mockHook.mockReturnValue(hookState());
    const { result } = renderHook(() => useReportAction(request));
    expect(result.current.generating).toBe(false);
    expect(result.current.ready).toBe(false);
    expect(result.current.disabled).toBe(false);
  });

  it('returns generating=true and disabled=true when generating', () => {
    mockHook.mockReturnValue(hookState({ state: 'generating' }));
    const { result } = renderHook(() => useReportAction(request));
    expect(result.current.generating).toBe(true);
    expect(result.current.disabled).toBe(true);
  });

  it('returns ready=true when report is ready', () => {
    mockHook.mockReturnValue(hookState({ state: 'ready' }));
    const { result } = renderHook(() => useReportAction(request));
    expect(result.current.ready).toBe(true);
    expect(result.current.disabled).toBe(false);
  });

  it('is disabled without a request', () => {
    mockHook.mockReturnValue(hookState());
    const { result } = renderHook(() => useReportAction(null));
    expect(result.current.disabled).toBe(true);
  });

  it('calls start() when onClick is invoked and not ready', () => {
    const hook = hookState();
    mockHook.mockReturnValue(hook);
    const { result } = renderHook(() => useReportAction(request));
    act(() => result.current.onClick());
    expect(hook.start).toHaveBeenCalledTimes(1);
  });

  it('calls download() when onClick is invoked and ready', () => {
    const hook = hookState({ state: 'ready' });
    mockHook.mockReturnValue(hook);
    const { result } = renderHook(() => useReportAction(request));
    act(() => result.current.onClick());
    expect(hook.download).toHaveBeenCalledTimes(1);
  });

  it('shows a success toast with a Download action when generation finishes', () => {
    const hook = hookState({ state: 'generating' });
    mockHook.mockReturnValue(hook);
    const { rerender } = renderHook(() => useReportAction(request));
    expect(useLocationStore.getState().toasts).toHaveLength(0);

    mockHook.mockReturnValue({ ...hook, state: 'ready' });
    rerender();

    const [toast] = useLocationStore.getState().toasts;
    expect(toast).toMatchObject({ type: 'success', message: 'Your report is ready.' });
    act(() => toast!.action!.onClick());
    expect(hook.download).toHaveBeenCalledTimes(1);

    // Re-rendering in the same state must not toast again.
    rerender();
    expect(useLocationStore.getState().toasts).toHaveLength(1);
  });

  it('shows an error toast with Retry when generation fails', () => {
    const hook = hookState({ state: 'generating' });
    mockHook.mockReturnValue(hook);
    const { rerender } = renderHook(() => useReportAction(request));

    mockHook.mockReturnValue({ ...hook, state: 'failed', error: 'Address not found' });
    rerender();

    const [toast] = useLocationStore.getState().toasts;
    expect(toast!.type).toBe('error');
    expect(toast!.message).toContain('Address not found');
    act(() => toast!.action!.onClick());
    expect(hook.start).toHaveBeenCalledTimes(1);
  });

  it('toasts an error when the download itself fails', async () => {
    const hook = hookState({
      state: 'ready',
      download: jest.fn().mockRejectedValue(new Error('boom')),
    });
    mockHook.mockReturnValue(hook);
    const { result } = renderHook(() => useReportAction(request));
    await act(async () => {
      await result.current.onClick();
    });
    const lastToast = useLocationStore.getState().toasts.at(-1);
    expect(lastToast?.message).toMatch(/download/i);
    expect(lastToast?.type).toBe('error');
  });
});
