import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';

@Catch()
export class DetailedExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DetailedExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // Get detailed error information for logging only
    const errorDetails = this.getErrorDetails(exception);

    // Log detailed error information in terminal only
    this.logger.error(
      `Error ${status} - ${request.method} ${request.url}\n` +
        `File: ${errorDetails.file}:${errorDetails.line}\n` +
        `Function: ${errorDetails.function}\n` +
        `Code: ${errorDetails.code}\n`,
      exception instanceof Error ? exception.stack : undefined,
    );

    // For client errors (4xx), return detailed information
    // For server errors (5xx), return generic message to frontend
    if (status >= 400 && status < 500) {
      // Client errors - return detailed information
      if (exception instanceof HttpException) {
        const exceptionResponse = exception.getResponse();
        const responseObject =
          typeof exceptionResponse === 'string'
            ? { message: exceptionResponse }
            : exceptionResponse;

        response.status(status).json({
          statusCode: status,
          timestamp: new Date().toISOString(),
          ...responseObject,
        });
      } else {
        response.status(status).json({
          statusCode: status,
          timestamp: new Date().toISOString(),
          message:
            exception instanceof Error ? exception.message : 'Client error',
        });
      }
    } else {
      // Server errors (5xx) - return generic message to frontend
      // Log detailed error in server but don't expose internals to client
      response.status(status).json({
        statusCode: status,
        timestamp: new Date().toISOString(),
        message: 'Internal server error',
      });
    }
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
    try {
      // Check if file exists and is within the project
      if (!fs.existsSync(filePath) || !filePath.includes('src')) {
        return `Code snippet not available for ${filePath}`;
      }

      // Read the file
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const lines = fileContent.split('\n');

      // Get a few lines around the error line for context
      const startLine = Math.max(0, lineNumber - 3);
      const endLine = Math.min(lines.length, lineNumber + 2);

      const codeSnippet = lines
        .slice(startLine, endLine)
        .map((line, index) => {
          const currentLine = startLine + index + 1;
          const marker = currentLine === lineNumber ? '>>> ' : '    ';
          return `${marker}${currentLine}: ${line}`;
        })
        .join('\n');

      return codeSnippet || `Code snippet not available (line ${lineNumber})`;
    } catch (error) {
      return `Error reading code snippet: ${error.message}`;
    }
  }
}
