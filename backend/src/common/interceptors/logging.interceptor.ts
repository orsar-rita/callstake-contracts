import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';

/**
 * Logs every request that completes successfully (method, path, status,
 * duration). Failed requests are already logged by AllExceptionsFilter —
 * this covers the other side, so the access log is complete without
 * double-logging errors in both places.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        const durationMs = Date.now() - start;
        this.logger.log(`${request.method} ${request.url} -> ${response.statusCode} (${durationMs}ms)`);
      }),
    );
  }
}
