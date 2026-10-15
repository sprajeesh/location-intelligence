import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MobileControlsBar } from './MobileControlsBar';

jest.mock('@/components/ThemeToggle', () => ({
  ThemeToggle: ({ iconOnlyOnNarrow }: { iconOnlyOnNarrow?: boolean }) => (
    <div data-testid="theme-toggle-mock" data-icon-only={String(!!iconOnlyOnNarrow)} />
  ),
}));
jest.mock('@/containers/SettingsContainer', () => ({
  SettingsContainer: ({ iconOnlyOnNarrow }: { iconOnlyOnNarrow?: boolean }) => (
    <div data-testid="settings-container-mock" data-icon-only={String(!!iconOnlyOnNarrow)} />
  ),
}));
jest.mock('@/containers/MobileViewToggleContainer', () => ({
  MobileViewToggleContainer: ({ iconOnlyOnNarrow }: { iconOnlyOnNarrow?: boolean }) => (
    <div data-testid="mobile-view-toggle-mock" data-icon-only={String(!!iconOnlyOnNarrow)} />
  ),
}));
jest.mock('@/components/ReportButton', () => ({
  ReportButton: ({
    generating,
    ready,
    disabled,
    onClick,
    fullWidth,
  }: {
    generating: boolean;
    ready: boolean;
    disabled: boolean;
    onClick: () => void;
    fullWidth?: boolean;
  }) => (
    <button
      data-testid="report-button-mock"
      data-generating={String(generating)}
      data-ready={String(ready)}
      data-full-width={String(fullWidth)}
      disabled={disabled}
      onClick={onClick}
    >
      Report
    </button>
  ),
}));

const makeReport = (overrides = {}) => ({
  generating: false,
  ready: false,
  disabled: false,
  onClick: jest.fn(),
  ...overrides,
});

describe('MobileControlsBar', () => {
  it('renders Theme, Scoring, view toggle and Report', () => {
    render(<MobileControlsBar report={makeReport()} />);
    expect(screen.getByTestId('theme-toggle-mock')).toBeInTheDocument();
    expect(screen.getByTestId('settings-container-mock')).toBeInTheDocument();
    expect(screen.getByTestId('mobile-view-toggle-mock')).toBeInTheDocument();
    expect(screen.getByTestId('report-button-mock')).toBeInTheDocument();
  });

  it('collapses Theme, Scoring and the view toggle to icons on narrow screens', () => {
    render(<MobileControlsBar report={makeReport()} />);
    expect(screen.getByTestId('theme-toggle-mock')).toHaveAttribute('data-icon-only', 'true');
    expect(screen.getByTestId('settings-container-mock')).toHaveAttribute('data-icon-only', 'true');
    expect(screen.getByTestId('mobile-view-toggle-mock')).toHaveAttribute('data-icon-only', 'true');
  });

  it('hides Report when showReport is false but keeps the other controls', () => {
    render(<MobileControlsBar report={makeReport()} showReport={false} />);
    expect(screen.queryByTestId('report-button-mock')).not.toBeInTheDocument();
    expect(screen.getByTestId('theme-toggle-mock')).toBeInTheDocument();
  });

  it('passes the report state through and renders Report at natural width', () => {
    render(<MobileControlsBar report={makeReport({ ready: true, disabled: true })} />);
    const button = screen.getByTestId('report-button-mock');
    expect(button).toHaveAttribute('data-ready', 'true');
    expect(button).toHaveAttribute('data-full-width', 'false');
    expect(button).toBeDisabled();
  });

  it('calls report.onClick when Report is clicked', async () => {
    const report = makeReport();
    render(<MobileControlsBar report={report} />);
    await userEvent.click(screen.getByTestId('report-button-mock'));
    expect(report.onClick).toHaveBeenCalledTimes(1);
  });

  it('appends a custom className to the bar', () => {
    const { container } = render(<MobileControlsBar report={makeReport()} className="bg-white" />);
    expect(container.firstChild).toHaveClass('bg-white', 'border-t');
  });
});
