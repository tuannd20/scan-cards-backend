import { applyDecorators } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { wrapError } from './api-envelope.examples';

type ApiWrappedOkResponseOptions = {
  status?: number;
  description: string;
  example: Record<string, unknown>;
};

type ApiWrappedErrorResponseOptions = {
  status: number;
  description?: string;
  message: string;
  errorLabel?: string;
};

export function ApiWrappedOkResponse(options: ApiWrappedOkResponseOptions) {
  return ApiResponse({
    status: options.status ?? 200,
    description: options.description,
    schema: {
      example: options.example,
    },
  });
}

export function ApiWrappedErrorResponse(options: ApiWrappedErrorResponseOptions) {
  return ApiResponse({
    status: options.status,
    description: options.description ?? options.message,
    schema: {
      example: wrapError(
        options.status,
        options.message,
        options.errorLabel,
      ),
    },
  });
}

export function ApiWrappedInternalServerErrorResponse(
  message = 'Internal server error',
) {
  return ApiWrappedErrorResponse({
    status: 500,
    message,
  });
}

export function ApiCatalogReadResponses(options: {
  description: string;
  example: Record<string, unknown>;
}) {
  return applyDecorators(
    ApiWrappedOkResponse({
      description: options.description,
      example: options.example,
    }),
    ApiWrappedInternalServerErrorResponse(),
  );
}
