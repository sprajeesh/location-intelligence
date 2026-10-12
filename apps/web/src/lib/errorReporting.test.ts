import {
  buildReport,
  reportClientError,
  resetErrorReportingForTests,
  scrubUrls,
  stripQuery,
} from './errorReporting';

// jsdom has no Response or Blob.text(), so read the sent body through FileReader.
function readBlob(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.readAsText(blob);
  });
}

function stubResponse(status: number): Response {
  return { ok: status >= 200 && status < 300, status, statusText: '' } as unknown as Response;
}

const sendBeacon = jest.fn();
const fetchMock = jest.fn();

beforeEach(() => {
  resetErrorReportingForTests();
  sendBeacon.mockReset().mockReturnValue(true);
  fetchMock.mockReset().mockResolvedValue(stubResponse(202));
  Object.defineProperty(navigator, 'sendBeacon', { value: sendBeacon, configurable: true });
  global.fetch = fetchMock as unknown as typeof fetch;
});

async function sentBody(): Promise<Record<string, unknown>> {
  return JSON.parse(await readBlob(sendBeacon.mock.calls[0][1] as Blob));
}

describe('stripQuery', () => {
  it('removes the query string and fragment', () => {
    expect(stripQuery('/api/search/address?q=1+Queen+St#top')).toBe('/api/search/address');
  });

  it('returns paths without a query unchanged', () => {
    expect(stripQuery('/api/categories')).toBe('/api/categories');
  });
});

describe('scrubUrls', () => {
  it('removes query strings from URLs embedded in text', () => {
    expect(scrubUrls('Failed to fetch /api/search/address?q=1 Queen St')).toBe(
      'Failed to fetch /api/search/address Queen St',
    );
  });

  it('leaves text without URLs alone', () => {
    expect(scrubUrls('Something went wrong')).toBe('Something went wrong');
  });
});

describe('buildReport', () => {
  it('describes a thrown Error with its message and stack', () => {
    const report = buildReport({ kind: 'error', error: new Error('boom') });

    expect(report.kind).toBe('error');
    expect(report.errorMessage).toBe('boom');
    expect(report.stack).toContain('boom');
  });

  it('describes a non-Error thrown value without a stack', () => {
    const report = buildReport({ kind: 'unhandledrejection', error: 'nope' });

    expect(report.errorMessage).toBe('nope');
    expect(report.stack).toBeUndefined();
  });

  it('truncates long messages', () => {
    const report = buildReport({ kind: 'error', errorMessage: 'x'.repeat(2000) });

    expect(report.errorMessage).toHaveLength(500);
    expect(report.errorMessage.endsWith('…')).toBe(true);
  });

  it('keeps the endpoint path and status, and drops its query string', () => {
    const report = buildReport({
      kind: 'api',
      endpoint: '/api/search/address?q=secret+address',
      status: 500,
      correlationId: 'req-1',
    });

    expect(report.endpoint).toBe('/api/search/address');
    expect(report.status).toBe(500);
    expect(report.correlationId).toBe('req-1');
    expect(JSON.stringify(report)).not.toContain('secret');
  });
});

describe('reportClientError', () => {
  it('sends the report with sendBeacon', () => {
    reportClientError({ kind: 'error', error: new Error('boom') });

    expect(sendBeacon).toHaveBeenCalledTimes(1);
    expect(sendBeacon.mock.calls[0][0]).toBe('/api/client-errors');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('falls back to fetch with keepalive when sendBeacon declines', () => {
    sendBeacon.mockReturnValue(false);

    reportClientError({ kind: 'error', error: new Error('boom') });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/client-errors',
      expect.objectContaining({ method: 'POST', keepalive: true }),
    );
  });

  it('sends the sanitized report as JSON', async () => {
    reportClientError({
      kind: 'api',
      errorMessage: 'Failed to fetch /api/search/address?q=secret+address',
      endpoint: '/api/search/address?q=secret+address',
      status: 500,
      correlationId: 'req-1',
    });

    const body = await sentBody();
    expect(body).toEqual(
      expect.objectContaining({
        kind: 'api',
        errorMessage: 'Failed to fetch /api/search/address',
        endpoint: '/api/search/address',
        status: 500,
        correlationId: 'req-1',
      }),
    );
    expect(JSON.stringify(body)).not.toContain('secret');
  });

  it('stops after the per-page budget', () => {
    for (let i = 0; i < 25; i += 1) {
      reportClientError({ kind: 'error', error: new Error(`e${i}`) });
    }

    expect(sendBeacon).toHaveBeenCalledTimes(20);
  });

  it('never throws, even if sending fails', () => {
    sendBeacon.mockImplementation(() => {
      throw new Error('blocked');
    });
    fetchMock.mockRejectedValue(new Error('offline'));

    expect(() => reportClientError({ kind: 'error', error: new Error('boom') })).not.toThrow();
  });
});
