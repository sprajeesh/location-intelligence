import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReportButton } from './ReportButton';

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) =>
    ({
      'results.report.generate': 'Generate report',
      'results.report.generating': 'Generating report…',
      'results.report.download': 'Download report',
    })[key] ?? key,
}));

describe('ReportButton', () => {
  it('shows "Generate report" label when not ready', () => {
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

  it('shows "Download report" label when ready', () => {
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

    const button = screen.getByRole('button', { name: /Generating report/ });
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
