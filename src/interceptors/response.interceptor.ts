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
import { RESPONSE_MESSAGE_METADATA } from 'src/decorators/response-message.decorator';

 
export type Response<T> = {
  status: boolean;
  statusCode: number;
  path: string;
  message: string;
  data: T;
  timestamp: string;
};
 
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, Response<T>> {
  constructor(private reflector: Reflector) {}
 
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    // If handler or class sets metadata 'skipResponse' true, bypass this interceptor
    const skipHandler = this.reflector.get<boolean>('skipResponse', context.getHandler());
    const skipClass = this.reflector.get<boolean>('skipResponse', context.getClass());
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

  errorHandler(exception: HttpException, context: ExecutionContext) {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // Lấy payload từ exception
    let responseBody: any = exception instanceof HttpException ? exception.getResponse() : null;

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
      status: false,
      statusCode: status,
      path: request.url,
      message: responseBody.message || exception.message,
      result: responseBody,
      timestamp: format(new Date().toISOString(), 'yyyy-MM-dd HH:mm:ss'),
    });
  }
 
  responseHandler(res: any, context: ExecutionContext) {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();
    const statusCode = response.statusCode;
    const message =
      this.reflector.get<string>(
        RESPONSE_MESSAGE_METADATA,
        context.getHandler(),
      ) || 'success';
 
    return {
      status: true,
      path: request.url,
      message: message,
      statusCode,
      data: res,
      timestamp: format(new Date().toISOString(), 'yyyy-MM-dd HH:mm:ss'),
    };
  }
}