import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReportButton } from './ReportButton';
import { useLocationStore } from '@/store';
import { useReportGeneration } from '@/hooks/useReportGeneration';

jest.mock('@/hooks/useReportGeneration');
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) =>
    ({
      'results.report.generate': 'Generate report',
      'results.report.generating': 'Generating report…',
      'results.report.download': 'Download report',
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

describe('ReportButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useLocationStore.setState({ toasts: [] });
  });

  it('idle: a primary-coloured button that starts generation', async () => {
    const hook = hookState();
    mockHook.mockReturnValue(hook);
    render(<ReportButton request={request} />);

    const button = screen.getByRole('button', { name: 'Generate report' });
    expect(button).toBeEnabled();
    expect(button.className).toMatch(/bg-primary-600/);
    await userEvent.click(button);
    expect(hook.start).toHaveBeenCalledTimes(1);
  });

  it('generating: shows progress and is disabled', () => {
    mockHook.mockReturnValue(hookState({ state: 'generating' }));
    render(<ReportButton request={request} />);
    const button = screen.getByRole('button', { name: /Generating report/ });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
  });

  it('ready: becomes a download button', async () => {
    const hook = hookState({ state: 'ready' });
    mockHook.mockReturnValue(hook);
    render(<ReportButton request={request} />);
    await userEvent.click(screen.getByRole('button', { name: 'Download report' }));
    expect(hook.download).toHaveBeenCalledTimes(1);
    expect(hook.start).not.toHaveBeenCalled();
  });

  it('is disabled without a request', () => {
    mockHook.mockReturnValue(hookState());
    render(<ReportButton request={null} />);
    expect(screen.getByRole('button', { name: 'Generate report' })).toBeDisabled();
  });

  it('shows a success toast with a Download action when generation finishes', () => {
    const hook = hookState({ state: 'generating' });
    mockHook.mockReturnValue(hook);
    const { rerender } = render(<ReportButton request={request} />);
    expect(useLocationStore.getState().toasts).toHaveLength(0);

    mockHook.mockReturnValue({ ...hook, state: 'ready' });
    rerender(<ReportButton request={request} />);

    const [toast] = useLocationStore.getState().toasts;
    expect(toast).toMatchObject({ type: 'success', message: 'Your report is ready.' });
    act(() => toast!.action!.onClick());
    expect(hook.download).toHaveBeenCalledTimes(1);

    // Re-rendering in the same state must not toast again.
    rerender(<ReportButton request={request} />);
    expect(useLocationStore.getState().toasts).toHaveLength(1);
  });

  it('shows an error toast with Retry when generation fails', () => {
    const hook = hookState({ state: 'generating' });
    mockHook.mockReturnValue(hook);
    const { rerender } = render(<ReportButton request={request} />);

    mockHook.mockReturnValue({ ...hook, state: 'failed', error: 'Address not found' });
    rerender(<ReportButton request={request} />);

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
    render(<ReportButton request={request} />);
    await userEvent.click(screen.getByRole('button', { name: 'Download report' }));
    await screen.findByRole('button', { name: 'Download report' });
    expect(useLocationStore.getState().toasts.at(-1)?.message).toMatch(/download/i);
  });
});
