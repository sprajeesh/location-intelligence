import { createRequestId, REQUEST_ID_HEADER, requestIdHeaders } from './requestId';

describe('createRequestId', () => {
  it('returns a value the backend accepts as a request ID', () => {
    // Matches the backend's X-Request-ID pattern: ^[A-Za-z0-9-]{1,64}$
    expect(createRequestId()).toMatch(/^[A-Za-z0-9-]{1,64}$/);
  });

  it('returns a different value each call', () => {
    expect(createRequestId()).not.toBe(createRequestId());
  });
});

describe('requestIdHeaders', () => {
  it('forwards an incoming request ID', () => {
    const incoming = new Headers({ [REQUEST_ID_HEADER]: 'abc-123' });
    expect(requestIdHeaders(incoming)).toEqual({ 'X-Request-ID': 'abc-123' });
  });

  it('forwards nothing when the caller sent no request ID', () => {
    expect(requestIdHeaders(new Headers())).toEqual({});
  });
});
