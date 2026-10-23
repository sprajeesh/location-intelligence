import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MobileMenu } from './MobileMenu';

jest.mock('next-intl', () => ({
  useLocale: () => 'en',
  useTranslations: () => (key: string, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? key,
}));
jest.mock('@/components/ThemeToggle', () => ({
  ThemeToggle: () => <div data-testid="theme-toggle-mock" />,
}));
jest.mock('@/containers/SettingsContainer', () => ({
  SettingsContainer: () => <div data-testid="settings-container-mock" />,
}));
jest.mock('@/components/LanguageSwitcher', () => ({
  LanguageSwitcher: () => <div data-testid="language-switcher-mock" />,
}));
jest.mock('@/components/ReportButton', () => ({
  ReportButton: ({ onClick }: { onClick: () => void }) => (
    <button data-testid="report-button-mock" onClick={onClick}>Report</button>
  ),
}));

const report = { generating: false, ready: false, disabled: false, onClick: jest.fn() };

describe('MobileMenu', () => {
  it('is closed by default', () => {
    render(<MobileMenu />);
    expect(screen.getByRole('button', { name: 'More' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByTestId('theme-toggle-mock')).not.toBeInTheDocument();
  });

  it('opens with Theme, Scoring, Language and site links', async () => {
    render(<MobileMenu />);
    await userEvent.click(screen.getByRole('button', { name: 'More' }));
    expect(screen.getByRole('button', { name: 'More' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId('theme-toggle-mock')).toBeInTheDocument();
    expect(screen.getByTestId('settings-container-mock')).toBeInTheDocument();
    expect(screen.getByTestId('language-switcher-mock')).toBeInTheDocument();
    const hrefs = screen.getAllByRole('link').map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(['/about', '/contact', '/faq', '/data-sources']);
  });

  it('shows Report only when a report action is provided', async () => {
    const { unmount } = render(<MobileMenu />);
    await userEvent.click(screen.getByRole('button', { name: 'More' }));
    expect(screen.queryByTestId('report-button-mock')).not.toBeInTheDocument();
    unmount();
    render(<MobileMenu report={report} />);
    await userEvent.click(screen.getByRole('button', { name: 'More' }));
    await userEvent.click(screen.getByTestId('report-button-mock'));
    expect(report.onClick).toHaveBeenCalled();
  });

  it('closes on Escape, outside press and link click', async () => {
    render(<MobileMenu />);
    const toggle = screen.getByRole('button', { name: 'More' });
    await userEvent.click(toggle);
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByTestId('theme-toggle-mock')).not.toBeInTheDocument();
    expect(toggle).toHaveFocus();
    await userEvent.click(toggle);
    await userEvent.click(document.body);
    expect(screen.queryByTestId('theme-toggle-mock')).not.toBeInTheDocument();
    await userEvent.click(toggle);
    await userEvent.click(screen.getByRole('link', { name: 'footer.about' }));
    expect(screen.queryByTestId('theme-toggle-mock')).not.toBeInTheDocument();
  });

  it('closes when the toggle is pressed again', async () => {
    render(<MobileMenu />);
    const toggle = screen.getByRole('button', { name: 'More' });
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByTestId('theme-toggle-mock')).not.toBeInTheDocument();
  });
});
