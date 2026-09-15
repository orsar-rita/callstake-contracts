import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ContractNotDeployedError } from '../../config/contract-registry.service';

interface ErrorResponseBody {
  statusCode: number;
  error: string;
  message: string | string[];
  path: string;
  timestamp: string;
}

/**
 * Catches everything (not just HttpException) so an unexpected error from a
 * TypeORM query, a Soroban RPC call, etc. still produces a well-formed JSON
 * response instead of an opaque 500 with a stack trace leaking to the
 * client. HttpExceptions keep their status/message; anything else is
 * logged with its full stack and reported to the client as a generic 500.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, body } = this.toResponseBody(exception, request.url);

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.url} -> ${status}: ${body.message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else {
      this.logger.warn(`${request.method} ${request.url} -> ${status}: ${body.message}`);
    }

    response.status(status).json(body);
  }

  private toResponseBody(
    exception: unknown,
    path: string,
  ): { status: number; body: ErrorResponseBody } {
    const timestamp = new Date().toISOString();

    if (exception instanceof ContractNotDeployedError) {
      return {
        status: HttpStatus.SERVICE_UNAVAILABLE,
        body: {
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          error: 'ContractNotDeployed',
          message: exception.message,
          path,
          timestamp,
        },
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      const message =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : ((exceptionResponse as { message?: string | string[] }).message ?? exception.message);

      return {
        status,
        body: { statusCode: status, error: exception.name, message, path, timestamp },
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        error: 'InternalServerError',
        message: 'An unexpected error occurred',
        path,
        timestamp,
      },
    };
  }
}
