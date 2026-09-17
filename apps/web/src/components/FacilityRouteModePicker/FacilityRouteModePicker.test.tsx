import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FacilityRouteModePicker } from './FacilityRouteModePicker';
import { useLocationStore } from '@/store/index';
import { useNavigate } from '@/hooks/useNavigate';
import type { Feature } from '@/types/api';

jest.mock('@/store/index');
jest.mock('@/hooks/useNavigate');
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

const mockUseLocationStore = useLocationStore as jest.MockedFunction<typeof useLocationStore>;
const mockUseNavigate = useNavigate as jest.MockedFunction<typeof useNavigate>;

const FEATURE: Feature = {
  id: 'school-1',
  name: 'Auckland Primary',
  category: 'schools',
  lat: -36.85,
  lon: 174.76,
  distanceKm: 0.5,
};

const OTHER_FEATURE: Feature = {
  ...FEATURE,
  id: 'school-2',
};

const makeStoreState = (overrides = {}) => ({
  isNavigating: false,
  selectedFeature: null,
  routeMode: 'driving' as const,
  ...overrides,
});

const navigateMock = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  mockUseLocationStore.mockReturnValue(makeStoreState());
  mockUseNavigate.mockReturnValue(navigateMock);
});

describe('FacilityRouteModePicker', () => {
  it('renders a button for each transport mode', () => {
    render(<FacilityRouteModePicker feature={FEATURE} />);

    expect(screen.getByRole('button', { name: 'driving' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'walking' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'cycling' })).toBeInTheDocument();
  });

  it('starts navigation for this feature in the clicked mode', async () => {
    const user = userEvent.setup();
    render(<FacilityRouteModePicker feature={FEATURE} />);

    await user.click(screen.getByRole('button', { name: 'walking' }));

    expect(navigateMock).toHaveBeenCalledWith(FEATURE, 'walking');
  });

  it('has no active mode when this feature is not the one being navigated to', () => {
    mockUseLocationStore.mockReturnValue(
      makeStoreState({ isNavigating: true, selectedFeature: OTHER_FEATURE, routeMode: 'cycling' }),
    );
    render(<FacilityRouteModePicker feature={FEATURE} />);

    expect(screen.getByRole('button', { name: 'cycling' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('highlights the active mode when navigating to this feature', () => {
    mockUseLocationStore.mockReturnValue(
      makeStoreState({ isNavigating: true, selectedFeature: FEATURE, routeMode: 'cycling' }),
    );
    render(<FacilityRouteModePicker feature={FEATURE} />);

    expect(screen.getByRole('button', { name: 'cycling' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'driving' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('does not render a "Back to results" button when onBackToResults is not provided', () => {
    render(<FacilityRouteModePicker feature={FEATURE} />);

    expect(screen.queryByRole('button', { name: 'Back to results' })).not.toBeInTheDocument();
  });

  it('invokes onBackToResults when the "Back to results" button is clicked', async () => {
    const user = userEvent.setup();
    const onBackToResults = jest.fn();
    render(<FacilityRouteModePicker feature={FEATURE} onBackToResults={onBackToResults} />);

    await user.click(screen.getByRole('button', { name: 'Back to results' }));

    expect(onBackToResults).toHaveBeenCalledTimes(1);
  });
});
