import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import * as path from 'path';

@Catch()
export class CustomExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(CustomExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // Get detailed error information
    const errorDetails = this.getErrorDetails(exception);

    // Log detailed error information
    this.logger.error(
      `Error ${status} - ${request.method} ${request.url}\n` +
        `File: ${errorDetails.file}:${errorDetails.line}\n` +
        `Function: ${errorDetails.function}\n` +
        `Code: ${errorDetails.code}\n` +
        `Stack: ${errorDetails.stack}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    // Send response
    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      ...errorDetails,
      message:
        exception instanceof Error
          ? exception.message
          : 'Internal server error',
    });
  }

  private getErrorDetails(exception: unknown): {
    file: string;
    line: number;
    function: string;
    code: string;
    stack: string;
  } {
    const defaultDetails = {
      file: 'unknown',
      line: 0,
      function: 'unknown',
      code: 'unknown',
      stack: 'unknown',
    };

    if (!(exception instanceof Error)) {
      return defaultDetails;
    }

    const stackLines = exception.stack?.split('\n') || [];
    const relevantStackLine =
      stackLines.find(
        (line) =>
          line.includes(path.join('src', '')) && !line.includes('node_modules'),
      ) || stackLines[1];

    if (!relevantStackLine) {
      return {
        ...defaultDetails,
        stack: exception.stack || 'unknown',
      };
    }

    // Extract file path and line number
    const pathMatch =
      relevantStackLine.match(/\((.*):(\d+):(\d+)\)/) ||
      relevantStackLine.match(/at (.*):(\d+):(\d+)/);

    if (pathMatch) {
      const filePath = pathMatch[1];
      const line = parseInt(pathMatch[2], 10);

      // Get just the filename for readability
      const fileName = path.basename(filePath);

      return {
        file: fileName,
        line: line,
        function: this.extractFunctionName(relevantStackLine),
        code: this.extractCodeSnippet(filePath, line),
        stack: exception.stack || 'unknown',
      };
    }

    return {
      ...defaultDetails,
      stack: exception.stack || 'unknown',
    };
  }

  private extractFunctionName(stackLine: string): string {
    const functionMatch =
      stackLine.match(/at (.+?) \(/) || stackLine.match(/at (.+?)$/);

    if (functionMatch) {
      return functionMatch[1].trim();
    }

    return 'unknown';
  }

  private extractCodeSnippet(filePath: string, lineNumber: number): string {
    // In a real implementation, you might read the file and extract the code snippet
    // For now, we'll just return a placeholder
    return `Code at line ${lineNumber} (implementation would read actual code)`;
  }
}
