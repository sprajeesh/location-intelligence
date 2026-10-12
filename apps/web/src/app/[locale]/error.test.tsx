import { fireEvent, render, screen } from '@testing-library/react';
import ErrorPage from './error';
import { reportClientError } from '@/lib/errorReporting';

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

jest.mock('@/lib/errorReporting', () => ({
  reportClientError: jest.fn(),
}));

const mockReport = reportClientError as jest.MockedFunction<typeof reportClientError>;

beforeEach(() => {
  mockReport.mockClear();
});

describe('locale error boundary', () => {
  it('shows the translated message and a retry button', () => {
    render(<ErrorPage error={new Error('render failed')} reset={jest.fn()} />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'generic' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'retry' })).toBeInTheDocument();
  });

  it('calls reset when retry is clicked', () => {
    const reset = jest.fn();
    render(<ErrorPage error={new Error('render failed')} reset={reset} />);

    fireEvent.click(screen.getByRole('button', { name: 'retry' }));

    expect(reset).toHaveBeenCalledTimes(1);
  });

  it('reports the error with its digest so it can be matched to the server log', () => {
    const error = Object.assign(new Error('render failed'), { digest: 'dig-123' });
    render(<ErrorPage error={error} reset={jest.fn()} />);

    expect(mockReport).toHaveBeenCalledWith({ kind: 'boundary', error, digest: 'dig-123' });
  });
});
