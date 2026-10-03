import { act, renderHook } from '@testing-library/react';
import { useReportGeneration } from './useReportGeneration';
import { createReport, downloadReport, getReportStatus } from '@/services/api';
import type { ReportRequest } from '@/services/api';

jest.mock('@/services/api', () => ({
  ...jest.requireActual('@/services/api'),
  createReport: jest.fn(),
  getReportStatus: jest.fn(),
  downloadReport: jest.fn(),
}));

const mockCreate = createReport as jest.MockedFunction<typeof createReport>;
const mockStatus = getReportStatus as jest.MockedFunction<typeof getReportStatus>;
const mockDownload = downloadReport as jest.MockedFunction<typeof downloadReport>;

const request: ReportRequest = {
  address: '1 Queen St',
  lat: -36.85,
  lon: 174.76,
  radiusKm: 5,
  distanceMode: 'driving',
};

const status = (s: 'queued' | 'running' | 'ready' | 'failed', error?: string) => ({
  jobId: 'job-1',
  status: s,
  error: error ?? null,
});

/** Lets pending promise continuations run, then advances fake timers. */
async function tick(ms: number) {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(ms);
  });
}

describe('useReportGeneration', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockCreate.mockResolvedValue({ jobId: 'job-1', status: 'queued' });
  });
  afterEach(() => jest.useRealTimers());

  it('starts idle', () => {
    const { result } = renderHook(() => useReportGeneration(request));
    expect(result.current.state).toBe('idle');
  });

  it('polls until ready', async () => {
    mockStatus
      .mockResolvedValueOnce(status('running'))
      .mockResolvedValueOnce(status('ready'));
    const { result } = renderHook(() => useReportGeneration(request));

    await act(async () => {
      void result.current.start();
    });
    expect(result.current.state).toBe('generating');
    expect(result.current.jobId).toBe('job-1');

    await tick(1000);
    expect(result.current.state).toBe('generating');
    await tick(1500);
    expect(result.current.state).toBe('ready');
    expect(mockStatus).toHaveBeenCalledTimes(2);
  });

  it('surfaces a failed job with its message', async () => {
    mockStatus.mockResolvedValue(status('failed', 'Address not found'));
    const { result } = renderHook(() => useReportGeneration(request));
    await act(async () => {
      void result.current.start();
    });
    await tick(1000);
    expect(result.current.state).toBe('failed');
    expect(result.current.error).toBe('Address not found');
  });

  it('fails when creating the job fails', async () => {
    mockCreate.mockRejectedValue(new Error('Service temporarily unavailable.'));
    const { result } = renderHook(() => useReportGeneration(request));
    await act(async () => {
      void result.current.start();
    });
    await tick(0);
    expect(result.current.state).toBe('failed');
    expect(result.current.error).toMatch(/unavailable/);
  });

  it('times out after maxWaitMs', async () => {
    mockStatus.mockResolvedValue(status('running'));
    const { result } = renderHook(() =>
      useReportGeneration(request, { maxWaitMs: 5000 }),
    );
    await act(async () => {
      void result.current.start();
    });
    await tick(10_000);
    expect(result.current.state).toBe('failed');
    expect(result.current.error).toMatch(/too long/);
  });

  it('backs off between polls (1s, 1.5s, 2.25s, then capped at 3s)', async () => {
    mockStatus.mockResolvedValue(status('running'));
    const { result } = renderHook(() => useReportGeneration(request));
    await act(async () => {
      void result.current.start();
    });
    await tick(1000);
    expect(mockStatus).toHaveBeenCalledTimes(1);
    await tick(1499);
    expect(mockStatus).toHaveBeenCalledTimes(1);
    await tick(1);
    expect(mockStatus).toHaveBeenCalledTimes(2);
    await tick(2250);
    expect(mockStatus).toHaveBeenCalledTimes(3);
    await tick(3000);
    expect(mockStatus).toHaveBeenCalledTimes(4);
  });

  it('ignores start() while a report is already generating', async () => {
    mockStatus.mockResolvedValue(status('running'));
    const { result } = renderHook(() => useReportGeneration(request));
    await act(async () => {
      void result.current.start();
      void result.current.start();
    });
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it('stops polling on unmount', async () => {
    mockStatus.mockResolvedValue(status('running'));
    const { result, unmount } = renderHook(() => useReportGeneration(request));
    await act(async () => {
      void result.current.start();
    });
    await tick(1000);
    const calls = mockStatus.mock.calls.length;
    unmount();
    await tick(10_000);
    expect(mockStatus.mock.calls.length).toBe(calls);
  });

  it('resets when the request changes (new address)', async () => {
    mockStatus.mockResolvedValue(status('ready'));
    const { result, rerender } = renderHook(
      ({ req }) => useReportGeneration(req),
      { initialProps: { req: request } },
    );
    await act(async () => {
      void result.current.start();
    });
    await tick(1000);
    expect(result.current.state).toBe('ready');

    rerender({ req: { ...request, address: '2 Other St', lat: -37 } });
    expect(result.current.state).toBe('idle');
    expect(result.current.jobId).toBeNull();
  });

  it('a stale poll for the old address cannot overwrite the new state', async () => {
    mockStatus.mockResolvedValue(status('ready'));
    const { result, rerender } = renderHook(
      ({ req }) => useReportGeneration(req),
      { initialProps: { req: request } },
    );
    await act(async () => {
      void result.current.start();
    });
    rerender({ req: { ...request, lat: -37 } });
    await tick(5000);
    expect(result.current.state).toBe('idle');
  });

  it('does nothing without a request', async () => {
    const { result } = renderHook(() => useReportGeneration(null));
    await act(async () => {
      await result.current.start();
    });
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('reset() returns to idle', async () => {
    mockStatus.mockResolvedValue(status('failed', 'x'));
    const { result } = renderHook(() => useReportGeneration(request));
    await act(async () => {
      void result.current.start();
    });
    await tick(1000);
    act(() => result.current.reset());
    expect(result.current.state).toBe('idle');
    expect(result.current.error).toBeNull();
  });

  it('download() saves the PDF via a temporary link once ready', async () => {
    mockStatus.mockResolvedValue(status('ready'));
    mockDownload.mockResolvedValue({
      blob: new Blob(['%PDF'], { type: 'application/pdf' }),
      filename: 'report.pdf',
    });
    URL.createObjectURL = jest.fn(() => 'blob:x');
    URL.revokeObjectURL = jest.fn();
    const click = jest
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});

    const { result } = renderHook(() => useReportGeneration(request));
    await act(async () => {
      await result.current.download(); // not ready yet: no-op
    });
    expect(mockDownload).not.toHaveBeenCalled();

    await act(async () => {
      void result.current.start();
    });
    await tick(1000);
    await act(async () => {
      await result.current.download();
    });
    expect(mockDownload).toHaveBeenCalledWith('job-1');
    expect(click).toHaveBeenCalledTimes(1);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:x');
    click.mockRestore();
  });
});
