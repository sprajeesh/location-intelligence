import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReportButton } from './ReportButton';

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) =>
    ({
      'results.report.generate': 'Report',
      'results.report.generating': 'Generating…',
      'results.report.download': 'Download',
      'results.report.generatingFull': 'Generating report…',
      'results.report.generateLabel': 'Generate report',
      'results.report.downloadLabel': 'Download report',
    })[key] ?? key,
}));

describe('ReportButton', () => {
  it('shows short label "Report" when not ready (default)', () => {
    const onClick = jest.fn();
    render(
      <ReportButton
        generating={false}
        ready={false}
        disabled={false}
        onClick={onClick}
      />
    );

    const button = screen.getByRole('button', { name: 'Generate report' });
    expect(button).toBeEnabled();
    expect(button.className).toMatch(/bg-primary-600/);
  });

  it('shows short label "Download" when ready (default)', () => {
    const onClick = jest.fn();
    render(
      <ReportButton
        generating={false}
        ready={true}
        disabled={false}
        onClick={onClick}
      />
    );

    expect(screen.getByRole('button', { name: 'Download report' })).toBeEnabled();
  });

  it('shows full label "Generate report" when not ready (fullLabel=true)', () => {
    const onClick = jest.fn();
    render(
      <ReportButton
        generating={false}
        ready={false}
        disabled={false}
        onClick={onClick}
        fullLabel
      />
    );

    expect(screen.getByText('Generate report')).toBeInTheDocument();
  });

  it('shows full label "Download report" when ready (fullLabel=true)', () => {
    const onClick = jest.fn();
    render(
      <ReportButton
        generating={false}
        ready={true}
        disabled={false}
        onClick={onClick}
        fullLabel
      />
    );

    expect(screen.getByText('Download report')).toBeInTheDocument();
  });

  it('shows generating spinner when generating', () => {
    const onClick = jest.fn();
    render(
      <ReportButton
        generating={true}
        ready={false}
        disabled={true}
        onClick={onClick}
      />
    );

    const button = screen.getByRole('button', { name: /Generating/ });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
  });

  it('is disabled when disabled prop is true', () => {
    const onClick = jest.fn();
    render(
      <ReportButton
        generating={false}
        ready={false}
        disabled={true}
        onClick={onClick}
      />
    );

    expect(screen.getByRole('button', { name: 'Generate report' })).toBeDisabled();
  });

  it('calls onClick when clicked', async () => {
    const onClick = jest.fn();
    render(
      <ReportButton
        generating={false}
        ready={false}
        disabled={false}
        onClick={onClick}
      />
    );

    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
