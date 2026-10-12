import { trackedFetch } from './trackedFetch';
import { REQUEST_ID_HEADER } from './requestId';

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

const sendBeacon = jest.fn().mockReturnValue(true);
const fetchMock = jest.fn();

beforeEach(() => {
  sendBeacon.mockClear();
  fetchMock.mockReset();
  Object.defineProperty(navigator, 'sendBeacon', { value: sendBeacon, configurable: true });
  global.fetch = fetchMock as unknown as typeof fetch;
});

async function reportedBody(): Promise<Record<string, unknown>> {
  return JSON.parse(await readBlob(sendBeacon.mock.calls[0][1] as Blob));
}

describe('trackedFetch', () => {
  it('sends the given request ID to the server', async () => {
    fetchMock.mockResolvedValue(stubResponse(200));

    await trackedFetch('/api/categories', {}, 'req-42');

    const [, init] = fetchMock.mock.calls[0];
    expect(new Headers(init.headers).get(REQUEST_ID_HEADER)).toBe('req-42');
  });

  it('mints a request ID when none is given', async () => {
    fetchMock.mockResolvedValue(stubResponse(200));

    await trackedFetch('/api/categories');

    const [, init] = fetchMock.mock.calls[0];
    expect(new Headers(init.headers).get(REQUEST_ID_HEADER)).toMatch(/^[A-Za-z0-9-]{1,64}$/);
  });

  it('keeps headers the caller set', async () => {
    fetchMock.mockResolvedValue(stubResponse(200));

    await trackedFetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' } });

    const [, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe('POST');
    expect(new Headers(init.headers).get('Content-Type')).toBe('application/json');
  });

  it('returns successful responses without reporting', async () => {
    fetchMock.mockResolvedValue(stubResponse(200));

    const response = await trackedFetch('/api/categories');

    expect(response.status).toBe(200);
    expect(sendBeacon).not.toHaveBeenCalled();
  });

  it('reports a failed response with status, path and request ID, and still returns it', async () => {
    fetchMock.mockResolvedValue(stubResponse(503));

    const response = await trackedFetch('/api/search/address?q=1+Queen+St', {}, 'req-7');

    expect(response.status).toBe(503);
    expect(await reportedBody()).toEqual(
      expect.objectContaining({
        kind: 'api',
        endpoint: '/api/search/address',
        status: 503,
        correlationId: 'req-7',
      }),
    );
    expect(JSON.stringify(await reportedBody())).not.toContain('Queen');
  });

  it('reports a network error with status 0 and rethrows it', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(trackedFetch('/api/categories', {}, 'req-9')).rejects.toThrow('Failed to fetch');

    expect(await reportedBody()).toEqual(
      expect.objectContaining({ kind: 'api', status: 0, correlationId: 'req-9' }),
    );
  });
});
