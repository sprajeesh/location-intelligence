import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LayerSelector, MAP_LAYERS } from './LayerSelector';

const defaultProps = {
  activeLayer: 'default' as const,
  onSelectLayer: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('LayerSelector', () => {
  describe('Rendering', () => {
    it('renders the layers toggle button', () => {
      render(<LayerSelector {...defaultProps} />);
      expect(screen.getByRole('button', { name: 'Map layers' })).toBeInTheDocument();
    });

    it('does not render the dropdown menu initially', () => {
      render(<LayerSelector {...defaultProps} />);
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('exports all three layer options', () => {
      expect(MAP_LAYERS).toHaveLength(3);
      expect(MAP_LAYERS.map((l) => l.id)).toEqual(['default', 'satellite', 'topo']);
    });
  });

  describe('Dropdown toggle', () => {
    it('opens the dropdown when the toggle button is clicked', async () => {
      const user = userEvent.setup();
      render(<LayerSelector {...defaultProps} />);
      await user.click(screen.getByRole('button', { name: 'Map layers' }));
      expect(screen.getByRole('menu', { name: 'Map layers' })).toBeInTheDocument();
    });

    it('closes the dropdown when the toggle button is clicked again', async () => {
      const user = userEvent.setup();
      render(<LayerSelector {...defaultProps} />);
      await user.click(screen.getByRole('button', { name: 'Map layers' }));
      expect(screen.getByRole('menu')).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Map layers' }));
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('renders all layer options in the dropdown', async () => {
      const user = userEvent.setup();
      render(<LayerSelector {...defaultProps} />);
      await user.click(screen.getByRole('button', { name: 'Map layers' }));
      expect(screen.getByRole('menuitem', { name: /Default/ })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: /Satellite/ })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: /Topo/ })).toBeInTheDocument();
    });
  });

  describe('Layer selection', () => {
    it('calls onSelectLayer with the selected layer id', async () => {
      const user = userEvent.setup();
      const onSelectLayer = jest.fn();
      render(<LayerSelector {...defaultProps} onSelectLayer={onSelectLayer} />);
      await user.click(screen.getByRole('button', { name: 'Map layers' }));
      await user.click(screen.getByRole('menuitem', { name: /Satellite/ }));
      expect(onSelectLayer).toHaveBeenCalledWith('satellite');
    });

    it('closes the dropdown after selecting a layer', async () => {
      const user = userEvent.setup();
      render(<LayerSelector {...defaultProps} />);
      await user.click(screen.getByRole('button', { name: 'Map layers' }));
      await user.click(screen.getByRole('menuitem', { name: /Topo/ }));
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('highlights the active layer', async () => {
      const user = userEvent.setup();
      render(<LayerSelector {...defaultProps} activeLayer="satellite" />);
      await user.click(screen.getByRole('button', { name: 'Map layers' }));
      const satelliteItem = screen.getByRole('menuitem', { name: /Satellite/ });
      expect(satelliteItem).toHaveAttribute('aria-current', 'true');
    });

    it('does not highlight inactive layers', async () => {
      const user = userEvent.setup();
      render(<LayerSelector {...defaultProps} activeLayer="satellite" />);
      await user.click(screen.getByRole('button', { name: 'Map layers' }));
      const defaultItem = screen.getByRole('menuitem', { name: /Default/ });
      expect(defaultItem).not.toHaveAttribute('aria-current');
    });
  });

  describe('Click outside', () => {
    it('closes the dropdown when clicking outside', async () => {
      const user = userEvent.setup();
      render(
        <div data-testid="outside">
          <LayerSelector {...defaultProps} />
        </div>,
      );
      await user.click(screen.getByRole('button', { name: 'Map layers' }));
      expect(screen.getByRole('menu')).toBeInTheDocument();
      await user.click(screen.getByTestId('outside'));
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
  });

  describe('Keyboard handling', () => {
    it('closes the dropdown when Escape is pressed', async () => {
      render(<LayerSelector {...defaultProps} />);
      fireEvent.click(screen.getByRole('button', { name: 'Map layers' }));
      expect(screen.getByRole('menu')).toBeInTheDocument();
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('does not open dropdown on keypress', () => {
      render(<LayerSelector {...defaultProps} />);
      fireEvent.keyDown(document, { key: 'Enter' });
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('dropdown has role=menu', async () => {
      const user = userEvent.setup();
      render(<LayerSelector {...defaultProps} />);
      await user.click(screen.getByRole('button', { name: 'Map layers' }));
      expect(screen.getByRole('menu')).toHaveAttribute('aria-label', 'Map layers');
    });

    it('layer items have role=menuitem', async () => {
      const user = userEvent.setup();
      render(<LayerSelector {...defaultProps} />);
      await user.click(screen.getByRole('button', { name: 'Map layers' }));
      const items = screen.getAllByRole('menuitem');
      expect(items).toHaveLength(3);
    });
  });
});
