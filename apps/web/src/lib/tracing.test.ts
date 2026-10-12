import { CORRELATION_ID_HEADER, createTraceId, REQUEST_ID_HEADER, traceHeaders } from './tracing';

describe('createTraceId', () => {
  it('returns a value the backend accepts as an ID', () => {
    // Matches the backend's pattern: ^[A-Za-z0-9-]{1,64}$
    expect(createTraceId()).toMatch(/^[A-Za-z0-9-]{1,64}$/);
  });

  it('returns a different value each call', () => {
    expect(createTraceId()).not.toBe(createTraceId());
  });
});

describe('traceHeaders', () => {
  it('forwards both incoming IDs', () => {
    const incoming = new Headers({ [REQUEST_ID_HEADER]: 'req-1', [CORRELATION_ID_HEADER]: 'act-1' });
    expect(traceHeaders(incoming)).toEqual({ 'X-Request-ID': 'req-1', 'X-Correlation-ID': 'act-1' });
  });

  it('forwards only the IDs that were sent', () => {
    const incoming = new Headers({ [CORRELATION_ID_HEADER]: 'act-1' });
    expect(traceHeaders(incoming)).toEqual({ 'X-Correlation-ID': 'act-1' });
  });

  it('forwards nothing when no IDs were sent', () => {
    expect(traceHeaders(new Headers())).toEqual({});
  });
});
