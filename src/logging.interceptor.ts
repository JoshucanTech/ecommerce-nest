import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();
    const { method, url } = req;
    const body = JSON.stringify(req.body);
    const now = Date.now();

    res.on('finish', () => {
      const delay = Date.now() - now;
      const statusCode = res.statusCode;

      this.logger.log(
        `Time: ${delay}ms -- ${method} ${url} - Status: ${statusCode}`,
      );
    });

    return next.handle(); // No need for tap() here
  }
}
