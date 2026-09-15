import { CallHandler, ExecutionContext } from '@nestjs/common';
import { of } from 'rxjs';
import { LoggingInterceptor } from './logging.interceptor';

function makeContext() {
  const request = { method: 'GET', url: '/health' };
  const response = { statusCode: 200 };
  return {
    switchToHttp: () => ({ getRequest: () => request, getResponse: () => response }),
  } as unknown as ExecutionContext;
}

describe('LoggingInterceptor', () => {
  it('passes the response through unchanged', (done) => {
    const interceptor = new LoggingInterceptor();
    const handler: CallHandler = { handle: () => of({ status: 'ok' }) };

    interceptor.intercept(makeContext(), handler).subscribe((result) => {
      expect(result).toEqual({ status: 'ok' });
      done();
    });
  });

  it('logs method, path, and status after the handler completes', (done) => {
    const interceptor = new LoggingInterceptor();
    const logSpy = jest.spyOn((interceptor as any).logger, 'log').mockImplementation();
    const handler: CallHandler = { handle: () => of({}) };

    interceptor.intercept(makeContext(), handler).subscribe(() => {
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('GET /health -> 200'));
      done();
    });
  });
});
