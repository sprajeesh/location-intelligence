import { act, render } from '@testing-library/react';
import { ErrorReporter } from './ErrorReporter';
import { reportClientError } from '@/lib/errorReporting';

jest.mock('@/lib/errorReporting', () => ({
  reportClientError: jest.fn(),
}));

const mockReport = reportClientError as jest.MockedFunction<typeof reportClientError>;

beforeEach(() => {
  mockReport.mockClear();
});

describe('ErrorReporter', () => {
  it('reports uncaught exceptions', () => {
    render(<ErrorReporter />);
    const error = new Error('uncaught');

    act(() => {
      window.dispatchEvent(new ErrorEvent('error', { error, message: 'uncaught' }));
    });

    expect(mockReport).toHaveBeenCalledWith({ kind: 'error', error });
  });

  it('ignores resource-load failures, which carry no error object', () => {
    render(<ErrorReporter />);

    act(() => {
      window.dispatchEvent(new ErrorEvent('error', { message: 'Script failed to load' }));
    });

    expect(mockReport).not.toHaveBeenCalled();
  });

  it('reports unhandled promise rejections with the rejection reason', () => {
    render(<ErrorReporter />);
    const reason = new Error('rejected');
    const event = new Event('unhandledrejection') as Event & { reason: unknown };
    event.reason = reason;

    act(() => {
      window.dispatchEvent(event);
    });

    expect(mockReport).toHaveBeenCalledWith({ kind: 'unhandledrejection', error: reason });
  });

  it('removes its listeners when unmounted', () => {
    const removeSpy = jest.spyOn(window, 'removeEventListener');
    const { unmount } = render(<ErrorReporter />);
    unmount();

    expect(removeSpy).toHaveBeenCalledWith('error', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('unhandledrejection', expect.any(Function));
    removeSpy.mockRestore();
  });
});
