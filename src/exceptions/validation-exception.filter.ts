import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ValidationError } from 'class-validator';

@Catch(BadRequestException)
export class ValidationExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ValidationExceptionFilter.name);

  catch(exception: BadRequestException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    let message = 'Validation failed';
    let errors: any = {};

    if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const responseObj = exceptionResponse as any;
      
      if (responseObj.message && Array.isArray(responseObj.message)) {
        // Extract detailed constraint violations
        message = 'Input validation failed. Please check your data.';
        errors = this.formatValidationErrors(responseObj.message);
      } else if (responseObj.message) {
        message = responseObj.message;
      }
    }

    const detailedError = {
      statusCode: status,
      error: 'Bad Request',
      message,
      ...(Object.keys(errors).length > 0 && { errors }),
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    this.logger.error(
      `Validation Error for ${request.method} ${request.url}: ${JSON.stringify(detailedError)}`
    );

    response.status(status).json(detailedError);
  }

  private formatValidationErrors(validationErrors: any[]): Record<string, string[]> {
    const errors: Record<string, string[]> = {};
    
    validationErrors.forEach((error) => {
      if (typeof error === 'string') {
        // Simple error message
        errors['general'] = [...(errors['general'] || []), error];
      } else if (error.property && error.constraints) {
        // Detailed validation error with property
        errors[error.property] = Object.values(error.constraints);
      } else if (error.children && error.children.length > 0) {
        // Nested validation errors
        const childErrors = this.formatValidationErrors(error.children);
        Object.entries(childErrors).forEach(([key, value]) => {
          const fullKey = error.property ? `${error.property}.${key}` : key;
          errors[fullKey] = value;
        });
      }
    });

    return errors;
  }
}