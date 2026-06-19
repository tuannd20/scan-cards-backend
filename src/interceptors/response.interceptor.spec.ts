import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ResponseInterceptor } from './response.interceptor';

describe('ResponseInterceptor', () => {
  const createContext = (
    url = '/easy-card-scanner/catalog/cards/trending?period=week&direction=both&minChangePercent=5&limit=20',
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
      message: 'success',
      statusCode: 200,
      data: payload,
    });
    expect(response.timestamp).toBeDefined();
    expect(response).not.toHaveProperty('status');
    expect(response).not.toHaveProperty('path');
  });

  it('unwraps legacy envelopes and returns one response level', () => {
    const interceptor = createInterceptor();
    const payload = {
      status: true,
      path: '/easy-card-scanner/catalog/cards/trending?period=week&direction=both&limit=20',
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

    expect(response).toMatchObject({
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
    });
    expect((response.data as Record<string, unknown>).status).toBeUndefined();
  });

  it('unwraps partial success envelopes', () => {
    const interceptor = createInterceptor('Articles retrieved successfully');
    const payload = {
      success: true,
      data: { items: [], total: 0 },
    };

    const response = interceptor.responseHandler(payload, createContext());

    expect(response).toMatchObject({
      message: 'Articles retrieved successfully',
      statusCode: 200,
      data: { items: [], total: 0 },
    });
  });

  it('prefers custom message from decorator over extracted envelope message', () => {
    const interceptor = createInterceptor('Custom message');

    const response = interceptor.responseHandler(
      {
        success: true,
        message: 'Envelope message',
        data: { ok: true },
      },
      createContext(),
    );

    expect(response.message).toBe('Custom message');
  });

  it('unwraps double-wrapped legacy envelopes', () => {
    const interceptor = createInterceptor();
    const innerPayload = { period: 'today', total: 1, data: [{ id: 1 }] };
    const payload = {
      status: true,
      statusCode: 200,
      message: 'success',
      data: {
        status: true,
        statusCode: 200,
        message: 'success',
        data: innerPayload,
      },
    };

    const response = interceptor.responseHandler(payload, createContext());

    expect(response.data).toEqual(innerPayload);
  });
});
