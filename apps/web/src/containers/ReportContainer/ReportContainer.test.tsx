import { render, screen } from '@testing-library/react';
import { ReportContainer } from './ReportContainer';

jest.mock('@/store');
jest.mock('@/hooks/useAnalyzeCategories', () => ({ useAnalyzeCategories: () => ['schools'] }));
jest.mock('@/hooks/useAnalyzeCategoryWeights', () => ({ useAnalyzeCategoryWeights: () => ({ schools: 1 }) }));
jest.mock('@/components/ReportButton', () => ({
  ReportButton: ({ request }: { request: unknown }) => (
    <button data-testid="report-button" data-request={JSON.stringify(request)} />
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

  it('passes the on-screen analysis as the report request', () => {
    mockStore.mockReturnValue(state({ selectedAddress: ADDRESS, analysisResult: {} }));
    render(<ReportContainer />);
    const request = JSON.parse(screen.getByTestId('report-button').dataset.request!);
    expect(request).toMatchObject({
      address: ADDRESS.displayName,
      lat: ADDRESS.lat,
      lon: ADDRESS.lon,
      radiusKm: 7,
      distanceMode: 'walking',
      categories: ['schools'],
      categoryWeights: { schools: 1 },
    });
  });

  it('stays mounted but passes no request while analyzing or before a result', () => {
    mockStore.mockReturnValue(state({ selectedAddress: ADDRESS, analysisResult: {}, isAnalyzing: true }));
    const { unmount } = render(<ReportContainer />);
    expect(screen.getByTestId('report-button').dataset.request).toBe('null');
    unmount();
    mockStore.mockReturnValue(state({ selectedAddress: ADDRESS }));
    render(<ReportContainer />);
    expect(screen.getByTestId('report-button').dataset.request).toBe('null');
  });
});
