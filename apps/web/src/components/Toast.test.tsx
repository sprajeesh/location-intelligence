import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastContainer, useToast } from './Toast';
import { useLocationStore } from '@/store';

/**
 * Test suite for Toast notification system.
 */

// Reset store before each test
beforeEach(() => {
  useLocationStore.setState({ toasts: [] });
});

describe('ToastContainer', () => {
  it('renders empty when no toasts are present', () => {
    render(<ToastContainer />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('renders a single error toast', () => {
    render(<ToastContainer />);

    useLocationStore.setState({
      toasts: [
        {
          id: '1',
          message: 'Error occurred',
          type: 'error',
          dismissible: true,
        },
      ],
    });

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Error occurred')).toBeInTheDocument();
  });

  it('renders multiple toasts', () => {
    render(<ToastContainer />);

    useLocationStore.setState({
      toasts: [
        {
          id: '1',
          message: 'Error 1',
          type: 'error',
        },
        {
          id: '2',
          message: 'Warning 1',
          type: 'warning',
        },
        {
          id: '3',
          message: 'Success 1',
          type: 'success',
        },
      ],
    });

    expect(screen.getByText('Error 1')).toBeInTheDocument();
    expect(screen.getByText('Warning 1')).toBeInTheDocument();
    expect(screen.getByText('Success 1')).toBeInTheDocument();
  });

  it('applies correct styling for error type', () => {
    const { container } = render(<ToastContainer />);

    useLocationStore.setState({
      toasts: [
        {
          id: '1',
          message: 'Error message',
          type: 'error',
        },
      ],
    });

    const toast = container.querySelector('[role="alert"]');
    expect(toast).toHaveClass('bg-red-900/80', 'border-red-700');
  });

  it('applies correct styling for warning type', () => {
    const { container } = render(<ToastContainer />);

    useLocationStore.setState({
      toasts: [
        {
          id: '1',
          message: 'Warning message',
          type: 'warning',
        },
      ],
    });

    const toast = container.querySelector('[role="alert"]');
    expect(toast).toHaveClass('bg-amber-900/80', 'border-amber-700');
  });

  it('applies correct styling for success type', () => {
    const { container } = render(<ToastContainer />);

    useLocationStore.setState({
      toasts: [
        {
          id: '1',
          message: 'Success message',
          type: 'success',
        },
      ],
    });

    const toast = container.querySelector('[role="alert"]');
    expect(toast).toHaveClass('bg-emerald-900/80', 'border-emerald-700');
  });

  it('applies correct styling for info type', () => {
    const { container } = render(<ToastContainer />);

    useLocationStore.setState({
      toasts: [
        {
          id: '1',
          message: 'Info message',
          type: 'info',
        },
      ],
    });

    const toast = container.querySelector('[role="alert"]');
    expect(toast).toHaveClass('bg-blue-900/80', 'border-blue-700');
  });

  it('auto-dismisses after 3 seconds', async () => {
    jest.useFakeTimers();
    render(<ToastContainer />);

    useLocationStore.setState({
      toasts: [
        {
          id: '1',
          message: 'Auto-dismiss toast',
          type: 'error',
        },
      ],
    });

    expect(screen.getByText('Auto-dismiss toast')).toBeInTheDocument();

    jest.advanceTimersByTime(3000);

    await waitFor(() => {
      expect(screen.queryByText('Auto-dismiss toast')).not.toBeInTheDocument();
    });

    jest.useRealTimers();
  });

  it('removes toast when close button is clicked', async () => {
    const user = userEvent.setup();
    render(<ToastContainer />);

    useLocationStore.setState({
      toasts: [
        {
          id: '1',
          message: 'Dismissible toast',
          type: 'error',
          dismissible: true,
        },
      ],
    });

    const closeButton = screen.getByLabelText('Dismiss notification');
    await user.click(closeButton);

    expect(screen.queryByText('Dismissible toast')).not.toBeInTheDocument();
  });

  it('renders close button when dismissible is true', () => {
    render(<ToastContainer />);

    useLocationStore.setState({
      toasts: [
        {
          id: '1',
          message: 'Dismissible toast',
          type: 'error',
          dismissible: true,
        },
      ],
    });

    expect(screen.getByLabelText('Dismiss notification')).toBeInTheDocument();
  });

  it('does not render close button when dismissible is false', () => {
    render(<ToastContainer />);

    useLocationStore.setState({
      toasts: [
        {
          id: '1',
          message: 'Non-dismissible toast',
          type: 'error',
          dismissible: false,
        },
      ],
    });

    expect(screen.queryByLabelText('Dismiss notification')).not.toBeInTheDocument();
  });

  it('renders close button when dismissible is undefined (defaults to true)', () => {
    render(<ToastContainer />);

    useLocationStore.setState({
      toasts: [
        {
          id: '1',
          message: 'Toast with undefined dismissible',
          type: 'error',
        },
      ],
    });

    expect(screen.getByLabelText('Dismiss notification')).toBeInTheDocument();
  });
});

describe('useToast hook', () => {
  it('should be a function', () => {
    const TestComponent = () => {
      const showToast = useToast();
      return typeof showToast === 'function' ? <div>Success</div> : null;
    };

    render(<TestComponent />);
    expect(screen.getByText('Success')).toBeInTheDocument();
  });

  it('adds a toast to the store when called', () => {
    const TestComponent = () => {
      const showToast = useToast();

      React.useEffect(() => {
        showToast('Test message', 'error');
      }, [showToast]);

      return null;
    };

    render(<TestComponent />);

    const state = useLocationStore.getState();
    expect(state.toasts).toHaveLength(1);
    expect(state.toasts[0]).toMatchObject({
      message: 'Test message',
      type: 'error',
      dismissible: true,
    });
  });

  it('defaults to error type when not specified', () => {
    const TestComponent = () => {
      const showToast = useToast();

      React.useEffect(() => {
        showToast('Test message');
      }, [showToast]);

      return null;
    };

    render(<TestComponent />);

    const state = useLocationStore.getState();
    expect(state.toasts[0].type).toBe('error');
  });

  it('generates unique IDs for each toast', () => {
    const TestComponent = () => {
      const showToast = useToast();

      React.useEffect(() => {
        showToast('Message 1', 'error');
        showToast('Message 2', 'warning');
      }, [showToast]);

      return null;
    };

    render(<TestComponent />);

    const state = useLocationStore.getState();
    expect(state.toasts).toHaveLength(2);
    expect(state.toasts[0].id).not.toBe(state.toasts[1].id);
  });
});
