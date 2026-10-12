import {
  buildReport,
  reportClientError,
  resetErrorReportingForTests,
  scrubUrls,
  stripQuery,
} from './errorReporting';

const fetchMock = jest.fn();

beforeEach(() => {
  resetErrorReportingForTests();
  fetchMock.mockReset().mockResolvedValue({ ok: true, status: 202 });
  global.fetch = fetchMock as unknown as typeof fetch;
});

/** Parsed body and headers of the report sent by the most recent call. */
function lastReport(): { body: Record<string, unknown>; headers: Headers } {
  const [, init] = fetchMock.mock.calls[fetchMock.mock.calls.length - 1];
  return { body: JSON.parse(init.body), headers: new Headers(init.headers) };
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

  it('truncates long messages to exactly the backend limit, ellipsis included', () => {
    const report = buildReport({ kind: 'error', errorMessage: 'x'.repeat(2000) });

    expect(report.errorMessage).toHaveLength(500);
    expect(report.errorMessage.endsWith('…')).toBe(true);
  });

  it('keeps the endpoint path and status, and drops its query string', () => {
    const report = buildReport({
      kind: 'api',
      endpoint: '/api/search/address?q=secret+address',
      status: 500,
      requestId: 'req-1',
    });

    expect(report.endpoint).toBe('/api/search/address');
    expect(report.status).toBe(500);
    expect(report.requestId).toBe('req-1');
    expect(JSON.stringify(report)).not.toContain('secret');
  });
});

describe('reportClientError', () => {
  it('posts the report to the BFF relay with keepalive', () => {
    reportClientError({ kind: 'error', error: new Error('boom') });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/client-errors',
      expect.objectContaining({ method: 'POST', keepalive: true }),
    );
  });

  it('sends the sanitized report as JSON', () => {
    reportClientError({
      kind: 'api',
      errorMessage: 'Failed to fetch /api/search/address?q=secret+address',
      endpoint: '/api/search/address?q=secret+address',
      status: 500,
      requestId: 'req-1',
    });

    const { body } = lastReport();
    expect(body).toEqual(
      expect.objectContaining({
        kind: 'api',
        errorMessage: 'Failed to fetch /api/search/address',
        endpoint: '/api/search/address',
        status: 500,
        requestId: 'req-1',
      }),
    );
    expect(JSON.stringify(body)).not.toContain('secret');
  });

  it('sends the action correlation ID as a header, so the report joins that action in the logs', () => {
    reportClientError({ kind: 'api', errorMessage: 'x', correlationId: 'act-5' });

    expect(lastReport().headers.get('X-Correlation-ID')).toBe('act-5');
  });

  it('gives the report POST its own request ID, separate from the failed call', () => {
    reportClientError({ kind: 'api', errorMessage: 'x', requestId: 'failed-1' });

    const { headers } = lastReport();
    expect(headers.get('X-Request-ID')).toMatch(/^[A-Za-z0-9-]{1,64}$/);
    expect(headers.get('X-Request-ID')).not.toBe('failed-1');
  });

  it('gives an error outside any action its own correlation ID', () => {
    reportClientError({ kind: 'error', error: new Error('boom') });

    expect(lastReport().headers.get('X-Correlation-ID')).toMatch(/^[A-Za-z0-9-]{1,64}$/);
  });

  it('stops after the per-page budget', () => {
    for (let i = 0; i < 25; i += 1) {
      reportClientError({ kind: 'error', error: new Error(`e${i}`) });
    }

    expect(fetchMock).toHaveBeenCalledTimes(20);
  });

  it('never throws, even if sending fails', () => {
    fetchMock.mockRejectedValue(new Error('offline'));

    expect(() => reportClientError({ kind: 'error', error: new Error('boom') })).not.toThrow();
  });
});
