import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { format } from 'date-fns';
import { Reflector } from '@nestjs/core';
import { RESPONSE_MESSAGE_METADATA } from '../decorators/response-message.decorator';

export type ApiResponse<T = unknown> = {
  message: string;
  statusCode: number;
  data: T;
  timestamp: string;
};

type LegacyResponseEnvelope<T = unknown> = {
  status: boolean;
  statusCode: number;
  message: string;
  data: T;
  path?: string;
  timestamp?: string;
};

type PartialResponseEnvelope<T = unknown> = {
  success: boolean;
  data: T;
  message?: string;
};

type UnwrappedPayload = {
  payload: unknown;
  message?: string;
};

@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  constructor(private reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    const skipHandler = this.reflector.get<boolean>(
      'skipResponse',
      context.getHandler(),
    );
    const skipClass = this.reflector.get<boolean>(
      'skipResponse',
      context.getClass(),
    );
    if (skipHandler || skipClass) {
      return next.handle() as Observable<any>;
    }

    return next.handle().pipe(
      map((res: unknown) => this.responseHandler(res, context)),
      catchError((err: HttpException) =>
        throwError(() => this.errorHandler(err, context)),
      ),
    );
  }

  private isLegacyResponseEnvelope(
    res: unknown,
  ): res is LegacyResponseEnvelope {
    if (!res || typeof res !== 'object' || Array.isArray(res)) {
      return false;
    }

    const maybeEnvelope = res as Record<string, unknown>;

    return (
      typeof maybeEnvelope.status === 'boolean' &&
      typeof maybeEnvelope.statusCode === 'number' &&
      typeof maybeEnvelope.message === 'string' &&
      Object.prototype.hasOwnProperty.call(maybeEnvelope, 'data')
    );
  }

  private isPartialResponseEnvelope(
    res: unknown,
  ): res is PartialResponseEnvelope {
    if (!res || typeof res !== 'object' || Array.isArray(res)) {
      return false;
    }

    const maybeEnvelope = res as Record<string, unknown>;

    return (
      typeof maybeEnvelope.success === 'boolean' &&
      Object.prototype.hasOwnProperty.call(maybeEnvelope, 'data')
    );
  }

  private unwrapPayload(res: unknown, maxDepth = 2): UnwrappedPayload {
    let payload = res;
    let extractedMessage: string | undefined;

    for (let depth = 0; depth < maxDepth; depth++) {
      if (this.isLegacyResponseEnvelope(payload)) {
        extractedMessage = payload.message;
        payload = payload.data;
        continue;
      }

      if (this.isPartialResponseEnvelope(payload)) {
        if (typeof payload.message === 'string') {
          extractedMessage = payload.message;
        }
        payload = payload.data;
        continue;
      }

      break;
    }

    return { payload, message: extractedMessage };
  }

  errorHandler(exception: HttpException, context: ExecutionContext) {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let responseBody: any =
      exception instanceof HttpException ? exception.getResponse() : null;

    if (!responseBody) {
      responseBody = {
        statusCode: status,
        message: 'Internal server error',
        error: 'Internal Server Error',
      };
    }

    if (typeof responseBody === 'string') {
      responseBody = {
        statusCode: status,
        message: responseBody,
        error: HttpStatus[status] || 'Error',
      };
    }

    response.status(status).json({
      message: responseBody.message || exception.message,
      statusCode: status,
      data: responseBody,
      timestamp: format(new Date().toISOString(), 'yyyy-MM-dd HH:mm:ss'),
    });
  }

  responseHandler(res: unknown, context: ExecutionContext): ApiResponse<T> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse();
    const statusCode = response.statusCode;
    const timestamp = format(new Date().toISOString(), 'yyyy-MM-dd HH:mm:ss');
    const customMessage = this.reflector.get<string>(
      RESPONSE_MESSAGE_METADATA,
      context.getHandler(),
    );
    const { payload, message: extractedMessage } = this.unwrapPayload(res);

    return {
      message: customMessage ?? extractedMessage ?? 'success',
      statusCode,
      data: payload as T,
      timestamp,
    };
  }
}
