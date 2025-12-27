import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';

@Injectable()
export class EnhancedLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(EnhancedLoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();
    const { method, url, ip } = req;
    const userAgent = req.get('user-agent') || '';
    const now = Date.now();

    // Log request details
    this.logger.log(`REQUEST --> ${method} ${url} from ${ip}`, {
      userAgent,
      body: req.body,
      params: req.params,
      query: req.query,
    });

    return next.handle().pipe(
      tap((data) => {
        const delay = Date.now() - now;
        this.logger.log(
          `RESPONSE <-- ${method} ${url} - Status: 200 - ${delay}ms`,
          {
            response: data,
          },
        );
      }),
      catchError((error) => {
        const delay = Date.now() - now;
        const status = error.status || 500;

        // Log error response
        this.logger.error(
          `ERROR <-- ${method} ${url} - Status: ${status} - ${delay}ms`,
          error.message,
          {
            stack: error.stack,
          },
        );

        // Re-throw the error for the exception filters to handle
        return throwError(() => error);
      }),
    );
  }
}
