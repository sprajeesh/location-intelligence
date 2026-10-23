import { render, screen } from '@testing-library/react';
import { MobileControlsBar } from './MobileControlsBar';

jest.mock('@/containers/MobileViewToggleContainer', () => ({
  MobileViewToggleContainer: () => <div data-testid="mobile-view-toggle-mock" />,
}));

describe('MobileControlsBar', () => {
  it('renders only the Map/Results toggle', () => {
    render(<MobileControlsBar />);
    expect(screen.getByTestId('mobile-view-toggle-mock')).toBeInTheDocument();
    expect(screen.queryByText('Report')).not.toBeInTheDocument();
  });

  it('applies a custom className', () => {
    const { container } = render(<MobileControlsBar className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });
});
