import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tabs } from './Tabs';

const TABS = [
  { id: 'score', label: 'Score' },
  { id: 'facilities', label: 'Nearby Facilities' },
  { id: 'extra', label: 'Extra' },
];

describe('Tabs', () => {
  describe('Rendering', () => {
    it('renders a tab button for each item', () => {
      render(<Tabs tabs={TABS} activeTab="score" onChange={jest.fn()} />);
      expect(screen.getByRole('tab', { name: 'Score' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Nearby Facilities' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Extra' })).toBeInTheDocument();
    });

    it('renders a tablist container', () => {
      render(<Tabs tabs={TABS} activeTab="score" onChange={jest.fn()} />);
      expect(screen.getByRole('tablist')).toBeInTheDocument();
    });

    it('merges a custom className onto the tablist', () => {
      render(<Tabs tabs={TABS} activeTab="score" onChange={jest.fn()} className="px-2" />);
      expect(screen.getByRole('tablist')).toHaveClass('px-2');
    });
  });

  describe('Active tab state', () => {
    it('marks the active tab aria-selected=true and others false', () => {
      render(<Tabs tabs={TABS} activeTab="facilities" onChange={jest.fn()} />);
      expect(screen.getByRole('tab', { name: 'Score' })).toHaveAttribute('aria-selected', 'false');
      expect(screen.getByRole('tab', { name: 'Nearby Facilities' })).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByRole('tab', { name: 'Extra' })).toHaveAttribute('aria-selected', 'false');
    });

    it('gives only the active tab a 0 tabIndex (roving tabindex)', () => {
      render(<Tabs tabs={TABS} activeTab="facilities" onChange={jest.fn()} />);
      expect(screen.getByRole('tab', { name: 'Score' })).toHaveAttribute('tabIndex', '-1');
      expect(screen.getByRole('tab', { name: 'Nearby Facilities' })).toHaveAttribute('tabIndex', '0');
      expect(screen.getByRole('tab', { name: 'Extra' })).toHaveAttribute('tabIndex', '-1');
    });

    it('styles the active tab differently from inactive tabs', () => {
      render(<Tabs tabs={TABS} activeTab="score" onChange={jest.fn()} />);
      expect(screen.getByRole('tab', { name: 'Score' })).toHaveClass('surface-glass-primary', 'text-white');
      expect(screen.getByRole('tab', { name: 'Nearby Facilities' })).toHaveClass('text-slate-500');
    });
  });

  describe('Accessibility wiring', () => {
    it('pairs each tab\'s id and aria-controls with a panel-{id}/tab-{id} convention', () => {
      render(<Tabs tabs={TABS} activeTab="score" onChange={jest.fn()} />);
      const scoreTab = screen.getByRole('tab', { name: 'Score' });
      expect(scoreTab).toHaveAttribute('id', 'tab-score');
      expect(scoreTab).toHaveAttribute('aria-controls', 'panel-score');
    });
  });

  describe('Selection', () => {
    it('calls onChange with the clicked tab id', async () => {
      const onChange = jest.fn();
      render(<Tabs tabs={TABS} activeTab="score" onChange={onChange} />);
      await userEvent.click(screen.getByRole('tab', { name: 'Nearby Facilities' }));
      expect(onChange).toHaveBeenCalledWith('facilities');
    });
  });

  describe('Keyboard navigation', () => {
    it('moves to the next tab on ArrowRight and focuses it', async () => {
      const onChange = jest.fn();
      render(<Tabs tabs={TABS} activeTab="score" onChange={onChange} />);
      const scoreTab = screen.getByRole('tab', { name: 'Score' });
      const facilitiesTab = screen.getByRole('tab', { name: 'Nearby Facilities' });
      scoreTab.focus();

      await userEvent.keyboard('{ArrowRight}');

      expect(onChange).toHaveBeenCalledWith('facilities');
      expect(facilitiesTab).toHaveFocus();
    });

    it('moves to the previous tab on ArrowLeft and focuses it', async () => {
      const onChange = jest.fn();
      render(<Tabs tabs={TABS} activeTab="facilities" onChange={onChange} />);
      const scoreTab = screen.getByRole('tab', { name: 'Score' });
      const facilitiesTab = screen.getByRole('tab', { name: 'Nearby Facilities' });
      facilitiesTab.focus();

      await userEvent.keyboard('{ArrowLeft}');

      expect(onChange).toHaveBeenCalledWith('score');
      expect(scoreTab).toHaveFocus();
    });

    it('wraps from the last tab to the first on ArrowRight', async () => {
      const onChange = jest.fn();
      render(<Tabs tabs={TABS} activeTab="extra" onChange={onChange} />);
      const scoreTab = screen.getByRole('tab', { name: 'Score' });
      const extraTab = screen.getByRole('tab', { name: 'Extra' });
      extraTab.focus();

      await userEvent.keyboard('{ArrowRight}');

      expect(onChange).toHaveBeenCalledWith('score');
      expect(scoreTab).toHaveFocus();
    });

    it('wraps from the first tab to the last on ArrowLeft', async () => {
      const onChange = jest.fn();
      render(<Tabs tabs={TABS} activeTab="score" onChange={onChange} />);
      const scoreTab = screen.getByRole('tab', { name: 'Score' });
      const extraTab = screen.getByRole('tab', { name: 'Extra' });
      scoreTab.focus();

      await userEvent.keyboard('{ArrowLeft}');

      expect(onChange).toHaveBeenCalledWith('extra');
      expect(extraTab).toHaveFocus();
    });

    it('ignores keys other than ArrowLeft/ArrowRight', async () => {
      const onChange = jest.fn();
      render(<Tabs tabs={TABS} activeTab="score" onChange={onChange} />);
      screen.getByRole('tab', { name: 'Score' }).focus();

      await userEvent.keyboard('{ArrowDown}');

      expect(onChange).not.toHaveBeenCalled();
    });
  });
});
