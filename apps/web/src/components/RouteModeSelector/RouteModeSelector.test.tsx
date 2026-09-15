import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouteModeSelector } from './RouteModeSelector';

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

describe('RouteModeSelector', () => {
  it('renders a button with a label for each transport mode', () => {
    render(<RouteModeSelector activeMode="driving" onModeChange={jest.fn()} />);

    expect(screen.getByRole('group', { name: 'Transport mode' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'driving' })).toHaveTextContent('driving');
    expect(screen.getByRole('button', { name: 'walking' })).toHaveTextContent('walking');
    expect(screen.getByRole('button', { name: 'cycling' })).toHaveTextContent('cycling');
  });

  it('marks the active mode as pressed and the rest as not pressed', () => {
    render(<RouteModeSelector activeMode="walking" onModeChange={jest.fn()} />);

    expect(screen.getByRole('button', { name: 'walking' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'driving' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'cycling' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('marks no mode as pressed when activeMode is null', () => {
    render(<RouteModeSelector activeMode={null} onModeChange={jest.fn()} />);

    for (const name of ['driving', 'walking', 'cycling']) {
      expect(screen.getByRole('button', { name })).toHaveAttribute('aria-pressed', 'false');
    }
  });

  it('calls onModeChange with the clicked mode', async () => {
    const user = userEvent.setup();
    const onModeChange = jest.fn();
    render(<RouteModeSelector activeMode="driving" onModeChange={onModeChange} />);

    await user.click(screen.getByRole('button', { name: 'cycling' }));

    expect(onModeChange).toHaveBeenCalledWith('cycling');
  });

  it('shows text labels in the default "full" variant', () => {
    render(<RouteModeSelector activeMode="driving" onModeChange={jest.fn()} />);

    expect(screen.getByRole('button', { name: 'driving' }).textContent).toContain('driving');
  });

  it('hides text labels in the "icon" variant', () => {
    render(<RouteModeSelector activeMode="driving" onModeChange={jest.fn()} variant="icon" />);

    expect(screen.getByRole('button', { name: 'driving' }).textContent).toBe('');
  });
});
