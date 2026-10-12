import { trackedFetch } from './trackedFetch';
import { resetErrorReportingForTests } from './errorReporting';
import { CORRELATION_ID_HEADER, REQUEST_ID_HEADER } from './tracing';

const fetchMock = jest.fn();

beforeEach(() => {
  resetErrorReportingForTests();
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
});

/** The call the tracked request made, which is the first fetch. */
function requestInit(): RequestInit {
  return fetchMock.mock.calls[0][1];
}

/** The failure report, if one was sent: the fetch to the BFF relay. */
function reportCall(): [string, RequestInit] | undefined {
  return fetchMock.mock.calls.find(([url]) => url === '/api/client-errors');
}

function reportedBody(): Record<string, unknown> {
  return JSON.parse(reportCall()![1].body as string);
}

describe('trackedFetch', () => {
  it('sends a request ID and the given correlation ID', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200 });

    await trackedFetch('/api/categories', {}, 'act-42');

    const headers = new Headers(requestInit().headers);
    expect(headers.get(CORRELATION_ID_HEADER)).toBe('act-42');
    expect(headers.get(REQUEST_ID_HEADER)).toMatch(/^[A-Za-z0-9-]{1,64}$/);
  });

  it('gives a standalone call its own correlation ID, distinct from its request ID', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200 });

    await trackedFetch('/api/categories');

    const headers = new Headers(requestInit().headers);
    expect(headers.get(CORRELATION_ID_HEADER)).toMatch(/^[A-Za-z0-9-]{1,64}$/);
    expect(headers.get(CORRELATION_ID_HEADER)).not.toBe(headers.get(REQUEST_ID_HEADER));
  });

  it('gives every call in one action a distinct request ID but the same correlation ID', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200 });

    await trackedFetch('/api/reports', {}, 'act-1');
    await trackedFetch('/api/reports/job-1', {}, 'act-1');

    const first = new Headers(fetchMock.mock.calls[0][1].headers);
    const second = new Headers(fetchMock.mock.calls[1][1].headers);
    expect(first.get(CORRELATION_ID_HEADER)).toBe('act-1');
    expect(second.get(CORRELATION_ID_HEADER)).toBe('act-1');
    expect(first.get(REQUEST_ID_HEADER)).not.toBe(second.get(REQUEST_ID_HEADER));
  });

  it('keeps headers the caller set', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200 });

    await trackedFetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' } });

    const init = requestInit();
    expect(init.method).toBe('POST');
    expect(new Headers(init.headers).get('Content-Type')).toBe('application/json');
  });

  it('does not report successful responses', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200 });

    const response = await trackedFetch('/api/categories');

    expect(response.status).toBe(200);
    expect(reportCall()).toBeUndefined();
  });

  it('reports a failed response with path, status and both IDs, and still returns it', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 503 });

    const response = await trackedFetch('/api/search/address?q=1+Queen+St', {}, 'act-7');

    expect(response.status).toBe(503);
    const sentId = new Headers(requestInit().headers).get(REQUEST_ID_HEADER);
    expect(reportedBody()).toEqual(
      expect.objectContaining({ kind: 'api', endpoint: '/api/search/address', status: 503, requestId: sentId }),
    );
    expect(new Headers(reportCall()![1].headers).get(CORRELATION_ID_HEADER)).toBe('act-7');
    expect(JSON.stringify(reportedBody())).not.toContain('Queen');
  });

  it('reports a network error with status 0 and rethrows it', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    fetchMock.mockResolvedValue({ ok: true, status: 202 });

    await expect(trackedFetch('/api/categories', {}, 'act-9')).rejects.toThrow('Failed to fetch');

    expect(reportedBody()).toEqual(expect.objectContaining({ kind: 'api', status: 0 }));
  });
});
