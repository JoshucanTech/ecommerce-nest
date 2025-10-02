import { HttpException, HttpStatus } from '@nestjs/common';

export class AppException extends HttpException {
  constructor(
    message: string,
    status: HttpStatus,
    private readonly extra?: any,
  ) {
    super(message, status);
  }

  getResponse() {
    return {
      statusCode: this.getStatus(),
      message: this.message,
      ...(this.extra && { error: this.extra }),
    };
  }
}