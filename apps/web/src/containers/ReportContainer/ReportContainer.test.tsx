import { render, screen } from '@testing-library/react';
import { ReportContainer } from './ReportContainer';

jest.mock('@/store');
jest.mock('@/hooks/useAnalyzeCategories', () => ({ useAnalyzeCategories: () => ['schools'] }));
jest.mock('@/hooks/useAnalyzeCategoryWeights', () => ({ useAnalyzeCategoryWeights: () => ({ schools: 1 }) }));
jest.mock('@/hooks/useReportAction', () => ({
  useReportAction: (request: unknown) => ({
    generating: false,
    ready: false,
    disabled: !request,
    onClick: jest.fn(),
  }),
}));
jest.mock('@/components/ReportButton', () => ({
  ReportButton: ({ generating, disabled, onClick }: { generating: boolean; ready: boolean; disabled: boolean; onClick: () => void }) => (
    <button data-testid="report-button" disabled={disabled} onClick={onClick} aria-busy={generating} />
  ),
}));

import { useLocationStore } from '@/store';

const mockStore = useLocationStore as unknown as jest.Mock;
const ADDRESS = { displayName: '1 Queen St', lat: -36.85, lon: 174.76 };

const state = (over = {}) => ({
  selectedAddress: null,
  analysisResult: null,
  isAnalyzing: false,
  radiusKm: 7,
  distanceMode: 'walking',
  ...over,
});

describe('ReportContainer', () => {
  it('renders nothing before an address is selected', () => {
    mockStore.mockReturnValue(state());
    render(<ReportContainer />);
    expect(screen.queryByTestId('report-button')).not.toBeInTheDocument();
  });

  it('renders the button when an address and analysis result are available', () => {
    mockStore.mockReturnValue(state({ selectedAddress: ADDRESS, analysisResult: {} }));
    render(<ReportContainer />);
    expect(screen.getByTestId('report-button')).toBeInTheDocument();
    expect(screen.getByTestId('report-button')).not.toBeDisabled();
  });

  it('stays mounted but disables the button while analyzing or before a result', () => {
    mockStore.mockReturnValue(state({ selectedAddress: ADDRESS, analysisResult: {}, isAnalyzing: true }));
    const { unmount } = render(<ReportContainer />);
    expect(screen.getByTestId('report-button')).toBeDisabled();
    unmount();
    mockStore.mockReturnValue(state({ selectedAddress: ADDRESS }));
    render(<ReportContainer />);
    expect(screen.getByTestId('report-button')).toBeDisabled();
  });
});
