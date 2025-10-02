# Enhanced Error Logging System

This document explains how the enhanced error logging system works in the NestJS application.

## Overview

The enhanced error logging system provides detailed information about errors including:
- File name and line number where the error occurred
- Function name where the error occurred
- Code snippet showing the problematic code
- Full stack trace
- Request details (method, URL, IP, user agent)
- Request/response data

## Components

### 1. Detailed Exception Filter

Located at `src/exceptions/detailed-exception.filter.ts`, this filter:
- Catches all unhandled exceptions
- Extracts detailed information from the error stack trace
- Logs detailed error information to the console
- Provides structured error responses

### 2. Enhanced Logging Interceptor

Located at `src/interceptors/enhanced-logging.interceptor.ts`, this interceptor:
- Logs all incoming requests with details
- Logs all outgoing responses with timing information
- Logs errors with detailed information

### 3. Request Logger Middleware

Located at `src/middleware/request-logger.middleware.ts`, this middleware:
- Logs basic HTTP request information
- Tracks response status codes and response times

### 4. Debug Logger Utility

Located at `src/utils/debug-logger.ts`, this utility:
- Provides contextual logging with file and line information
- Can extract code snippets from source files
- Offers different log levels (log, error, warn, debug)

## How It Works

### Exception Handling

When an exception occurs:
1. The `DetailedExceptionFilter` catches it
2. It analyzes the stack trace to find the relevant source file
3. It extracts the file name, line number, and function name
4. It logs detailed information to the console
5. It returns a structured error response

### Request/Response Logging

For each request:
1. The `RequestLoggerMiddleware` logs basic request information
2. The `EnhancedLoggingInterceptor` logs detailed request data
3. On response, it logs timing and status information
4. On error, it logs detailed error information

## Log Output Format

Example error log:
```
[Nest] 12345 - 01/01/2023, 12:00:00 PM   ERROR [DetailedExceptionFilter] Error 500 - POST /api/orders
File: orders.service.ts:45
Function: OrdersService.create
Code: const product = products.find((p) => p.id === item.productId);
```

## Usage

### In Services

Services can use the `DebugLogger` for detailed logging:

```typescript
import { DebugLogger } from '../utils/debug-logger';

@Injectable()
export class OrdersService {
  private readonly logger = new DebugLogger(OrdersService.name);
  
  async createOrder(dto: CreateOrderDto) {
    try {
      // Some operation
      this.logger.log('Order creation started', { dto });
      // ...
    } catch (error) {
      this.logger.error('Failed to create order', error, { dto });
      throw error;
    }
  }
}
```

### Customizing Log Levels

In `main.ts`, the log levels are configured:

```typescript
const app = await NestFactory.create(AppModule, {
  logger: ['log', 'error', 'warn', 'debug', 'verbose'] as LogLevel[],
});
```

## Benefits

1. **Quick Error Diagnosis**: Immediately see which file and line caused the error
2. **Context Preservation**: Request and data context is preserved in logs
3. **Performance Monitoring**: Request timing helps identify performance issues
4. **Structured Logging**: Consistent log format makes parsing and analysis easier
5. **Debugging Assistance**: Code snippets help understand the context of errors

## Configuration

To adjust logging behavior, you can modify:
- Log levels in `main.ts`
- Exception filter details in `detailed-exception.filter.ts`
- Interceptor behavior in `enhanced-logging.interceptor.ts`
- Middleware logging in `request-logger.middleware.ts`

## Troubleshooting

If detailed error information is not showing:
1. Ensure source maps are enabled in `tsconfig.json` (`"sourceMap": true`)
2. Check that the application is running in development mode
3. Verify that the exception filter is properly registered in `main.ts`
4. Confirm that file paths in stack traces are accessible to the application