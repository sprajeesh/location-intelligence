/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { POST } from './route';

const fetchMock = jest.fn();

beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
});

function post(body: string) {
  return POST(
    new NextRequest('http://localhost/api/client-errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    }),
  );
}

describe('POST /api/client-errors', () => {
  it('relays the report body to the backend unchanged', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 202 }));
    const body = JSON.stringify({ kind: 'boundary', errorMessage: 'boom', route: '/en' });

    const response = await post(body);

    expect(response.status).toBe(202);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/client-errors$/);
    expect(init.method).toBe('POST');
    expect(init.body).toBe(body);
  });

  it('relays the backend status', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 429 }));

    const response = await post('{}');

    expect(response.status).toBe(429);
  });

  it('returns 502 when the backend is unreachable', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));

    const response = await post('{}');

    expect(response.status).toBe(502);
  });
});
