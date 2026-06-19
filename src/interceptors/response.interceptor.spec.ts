import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ResponseInterceptor } from './response.interceptor';

describe('ResponseInterceptor', () => {
  const createContext = (
    url = '/pokemon/trending?period=week&direction=both&minChangePercent=5&limit=20',
    statusCode = 200,
  ): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getResponse: () => ({ statusCode }),
        getRequest: () => ({ url }),
      }),
      getHandler: () => function handler() {},
      getClass: () => class TestController {},
    }) as unknown as ExecutionContext;

  const createInterceptor = (message?: string) => {
    const reflector = {
      get: jest.fn().mockReturnValue(message),
    } as unknown as Reflector;

    return new ResponseInterceptor(reflector);
  };

  it('wraps raw handler payloads with the standard response envelope', () => {
    const interceptor = createInterceptor();
    const payload = { value: 'raw-data' };

    const response = interceptor.responseHandler(payload, createContext());

    expect(response).toMatchObject({
      status: true,
      path: '/pokemon/trending?period=week&direction=both&minChangePercent=5&limit=20',
      message: 'success',
      statusCode: 200,
      data: payload,
    });
    expect(response.timestamp).toBeDefined();
  });

  it('returns existing standard envelopes as one response level', () => {
    const interceptor = createInterceptor();
    const payload = {
      status: true,
      path: '/pokemon/trending?period=week&direction=both&limit=20',
      message: 'success',
      statusCode: 200,
      data: {
        period: 'week',
        direction: 'both',
        minChangePercent: 5,
        limit: 20,
        total: 0,
        data: [],
      },
      timestamp: '2026-06-18 08:54:07',
    };

    const response = interceptor.responseHandler(payload, createContext());

    expect(response).toEqual({
      status: true,
      path: '/pokemon/trending?period=week&direction=both&minChangePercent=5&limit=20',
      message: 'success',
      statusCode: 200,
      data: {
        period: 'week',
        direction: 'both',
        minChangePercent: 5,
        limit: 20,
        total: 0,
        data: [],
      },
      timestamp: '2026-06-18 08:54:07',
    });
    expect((response.data as Record<string, unknown>).status).toBeUndefined();
  });

  it('uses the current request url when flattening an existing envelope', () => {
    const interceptor = createInterceptor();

    const response = interceptor.responseHandler(
      {
        status: true,
        path: '/stale-path',
        message: 'success',
        statusCode: 200,
        data: { ok: true },
        timestamp: '2026-06-18 08:54:07',
      },
      createContext('/current-path?query=1'),
    );

    expect(response.path).toBe('/current-path?query=1');
  });
});
