import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger, LogLevel } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const now = Date.now();
    const { method, url, error } = req;
    // const { method, url,  params, query } = req;
    const body = JSON.stringify(req.body);
 
   

    this.logger.log(`Request: ${method} ${url} Body: ${body}`);
    // this.logger.log(`Query Params: ${query}`);
    this.logger.debug(`Request details: ${method} ${url} Body: ${body}`); // Example of debug log
    this.logger.verbose(`Request verbose: ${method} ${url} Body: ${body}`); // Example of verbose log

    return next
      .handle()
      .pipe(
        tap((response) => {
          // const response = context.switchToHttp().getResponse();
          const delay = Date.now() - now;
          this.logger.log(`Response: ${method} ${url}, Status: ${response.statusCode} Time: ${delay}ms`);
          this.logger.warn(`Response time is ${delay}ms for ${method} ${url}`); // Example of warn log
          this.logger.error(`Response error for ${method} ${url}: ${error}`); // Example of error log
          // this.logger.log(`Response for ${method} ${url}: ${JSON.stringify(response)}`);
          this.logger.log(`Response for ${method} ${url}`);

        }),
      );
  }
}





