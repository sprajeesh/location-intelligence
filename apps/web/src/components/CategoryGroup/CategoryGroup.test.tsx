import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CategoryGroup from './CategoryGroup';

const defaultProps = {
  id: 'schools',
  label: 'Schools',
  color: '#F59E0B',
  count: 3,
  isExpanded: false,
  isVisible: true,
  onToggleExpand: jest.fn(),
  onToggleVisibility: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('CategoryGroup', () => {
  describe('Rendering', () => {
    it('renders the label and count', () => {
      render(<CategoryGroup {...defaultProps} />);
      expect(screen.getByText('Schools')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('does not render children when collapsed', () => {
      render(
        <CategoryGroup {...defaultProps} isExpanded={false}>
          <div data-testid="child">child content</div>
        </CategoryGroup>,
      );
      expect(screen.queryByTestId('child')).not.toBeInTheDocument();
    });

    it('renders children when expanded', () => {
      render(
        <CategoryGroup {...defaultProps} isExpanded={true}>
          <div data-testid="child">child content</div>
        </CategoryGroup>,
      );
      expect(screen.getByTestId('child')).toBeInTheDocument();
    });
  });

  describe('Expand/collapse interaction', () => {
    it('calls onToggleExpand when the header is clicked', async () => {
      const onToggleExpand = jest.fn();
      render(<CategoryGroup {...defaultProps} onToggleExpand={onToggleExpand} />);
      await userEvent.click(screen.getByText('Schools'));
      expect(onToggleExpand).toHaveBeenCalledTimes(1);
    });
  });

  describe('Visibility toggle interaction', () => {
    it('calls onToggleVisibility when the eye icon is clicked', async () => {
      const onToggleVisibility = jest.fn();
      render(<CategoryGroup {...defaultProps} onToggleVisibility={onToggleVisibility} />);
      await userEvent.click(
        screen.getByRole('button', { name: /hide schools markers on map/i }),
      );
      expect(onToggleVisibility).toHaveBeenCalledTimes(1);
    });

    // The header button and the visibility toggle are siblings (not nested —
    // a <button> cannot legally contain another <button>), so clicking the
    // visibility toggle must not also bubble into onToggleExpand.
    it('clicking the visibility toggle does not also trigger onToggleExpand', async () => {
      const onToggleExpand = jest.fn();
      const onToggleVisibility = jest.fn();
      render(
        <CategoryGroup
          {...defaultProps}
          onToggleExpand={onToggleExpand}
          onToggleVisibility={onToggleVisibility}
        />,
      );
      await userEvent.click(
        screen.getByRole('button', { name: /hide schools markers on map/i }),
      );
      expect(onToggleVisibility).toHaveBeenCalledTimes(1);
      expect(onToggleExpand).not.toHaveBeenCalled();
    });

    it('shows "Show" label when not visible', () => {
      render(<CategoryGroup {...defaultProps} isVisible={false} />);
      expect(
        screen.getByRole('button', { name: /show schools markers on map/i }),
      ).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('exposes aria-pressed on the visibility toggle reflecting isVisible', () => {
      render(<CategoryGroup {...defaultProps} isVisible={true} />);
      expect(
        screen.getByRole('button', { name: /hide schools markers on map/i }),
      ).toHaveAttribute('aria-pressed', 'true');
    });

    it('reflects isExpanded via aria-expanded somewhere in the header', () => {
      const { container } = render(<CategoryGroup {...defaultProps} isExpanded={true} />);
      expect(container.querySelector('[aria-expanded="true"]')).toBeInTheDocument();
    });
  });

  describe('Keyboard accessibility', () => {
    it('the header and the visibility toggle are both real, independently focusable buttons', () => {
      render(<CategoryGroup {...defaultProps} />);
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThanOrEqual(2);
      buttons.forEach((button) => expect(button.tagName).toBe('BUTTON'));
    });

    it('Tab reaches the header first, then the visibility toggle', async () => {
      render(<CategoryGroup {...defaultProps} />);
      await userEvent.tab();
      expect(document.activeElement).toHaveAttribute('aria-expanded', 'false');
      await userEvent.tab();
      expect(document.activeElement).toHaveAttribute('aria-pressed', 'true');
    });

    it('activating the header with Enter fires onToggleExpand', async () => {
      const onToggleExpand = jest.fn();
      render(<CategoryGroup {...defaultProps} onToggleExpand={onToggleExpand} />);
      await userEvent.tab();
      await userEvent.keyboard('{Enter}');
      expect(onToggleExpand).toHaveBeenCalledTimes(1);
    });

    it('activating the visibility toggle via keyboard does not also fire onToggleExpand', async () => {
      const onToggleExpand = jest.fn();
      const onToggleVisibility = jest.fn();
      render(
        <CategoryGroup
          {...defaultProps}
          onToggleExpand={onToggleExpand}
          onToggleVisibility={onToggleVisibility}
        />,
      );
      await userEvent.tab();
      await userEvent.tab();
      await userEvent.keyboard('{Enter}');
      expect(onToggleVisibility).toHaveBeenCalledTimes(1);
      expect(onToggleExpand).not.toHaveBeenCalled();
    });
  });
});
