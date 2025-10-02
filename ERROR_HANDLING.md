# Error Handling System

This document explains how the error handling system works in the NestJS application.

## Overview

The error handling system differentiates between client errors (4xx) and server errors (5xx), providing appropriate responses for each:

1. **Client Errors (4xx)** - Return detailed information to help frontend developers fix issues
2. **Server Errors (5xx)** - Log detailed information for debugging but return generic messages to frontend

## Components

### 1. Detailed Exception Filter

Located at `src/exceptions/detailed-exception.filter.ts`, this filter:
- Catches all unhandled exceptions
- Extracts detailed information from the error stack trace
- Logs detailed error information to the console (for all errors)
- Returns appropriate responses based on error type:
  - Client errors (4xx): Detailed information for frontend
  - Server errors (5xx): Generic message to frontend

### 2. Validation Exception Filter

Located at `src/exceptions/validation-exception.filter.ts`, this filter:
- Handles specifically BadRequestException (validation errors)
- Logs validation errors with request body for debugging
- Returns detailed validation error information to frontend

### 3. Custom AppException

Located at `src/exceptions/app.exception.ts`, this class:
- Provides a standardized way to throw application-specific errors
- Allows including additional details in server logs while controlling frontend messages

## Error Response Strategy

### Client Errors (400-499)

These errors are typically caused by invalid input from the client and include:
- Validation errors
- Resource not found errors
- Authentication/authorization errors
- Bad request errors

**Response to frontend:**
```json
{
  "statusCode": 400,
  "timestamp": "2025-09-27T17:09:26.837Z",
  "path": "/api/orders",
  "message": "Invalid coupon code"
}
```

**Server log:**
```
[Nest] 12345 - 09/27/2025, 5:14:18 PM   WARN [ValidationExceptionFilter] Validation Error - POST /api/orders
Validation Issues: [
  "productId must be a valid UUID",
  "quantity must be a positive number"
]
Request Body: {
  "items": [
    {
      "productId": "invalid-id",
      "quantity": -1
    }
  ]
}
```

### Server Errors (500-599)

These errors are typically caused by bugs in the application code and include:
- TypeError exceptions
- Database connection errors
- Unexpected runtime errors

**Response to frontend:**
```json
{
  "statusCode": 500,
  "timestamp": "2025-09-27T17:09:26.837Z",
  "path": "/api/orders",
  "message": "Internal server error"
}
```

**Server log:**
```
[Nest] 12345 - 09/27/2025, 5:14:18 PM   ERROR [DetailedExceptionFilter] Error 500 - POST /api/orders
File: orders.service.ts:223
Function: OrdersService.create
Code:     221:         let unitPrice;
    222:         if (variantId) {
>>> 223:           const variant = product.variants.find((v) => v.id === variantId);
    224:           unitPrice = variant?.discountPrice || variant?.price || product.price;
    225:         } else {
Stack: TypeError: Cannot read properties of undefined (reading 'find')
    at OrdersService.create (C:\Users\titan\Documents\aaa\nest\src\orders\orders.service.ts:223:44)
```

## Implementation Details

### Exception Filter Registration Order

In `main.ts`, exception filters are registered in a specific order:
1. `ValidationExceptionFilter` - Handles validation errors first
2. `DetailedExceptionFilter` - Handles all other errors

This ensures that validation errors are processed by the specialized filter before falling back to the general one.

### Service-Level Error Handling

Services should follow these patterns:

1. **Re-throw known exceptions** - Allow client errors to propagate:
```typescript
try {
  // Some operation
} catch (error) {
  // Re-throw known exceptions
  if (
    error instanceof NotFoundException ||
    error instanceof BadRequestException ||
    error instanceof ForbiddenException
  ) {
    throw error;
  }
  
  // For unexpected errors, throw a generic server error
  throw new AppException(
    'An unexpected error occurred while creating the order',
    HttpStatus.INTERNAL_SERVER_ERROR,
    { userId }
  );
}
```

2. **Use AppException for application-specific errors**:
```typescript
// Instead of generic errors
throw new Error('Order creation failed');

// Use AppException with details for logging
throw new AppException(
  'Failed to create order due to inventory issues',
  HttpStatus.BAD_REQUEST,
  { productId, requestedQuantity, availableQuantity }
);
```

## Benefits

1. **Security**: Internal implementation details are not exposed to clients
2. **Debugging**: Detailed error information is logged for server-side debugging
3. **User Experience**: Frontend receives appropriate error messages for client errors
4. **Standards Compliance**: Follows REST API best practices for error responses
5. **Developer Productivity**: Clear distinction between client and server errors

## Customization

To modify error handling behavior:

1. **Adjust logging level** in `main.ts`:
```typescript
const app = await NestFactory.create(AppModule, {
  logger: ['log', 'error', 'warn', 'debug', 'verbose'] as LogLevel[],
});
```

2. **Modify exception filters** in `src/exceptions/` directory
3. **Customize response format** in individual filters
4. **Add new exception filters** for specific error types

## Troubleshooting

If error handling is not working as expected:

1. Check that exception filters are properly registered in `main.ts`
2. Verify filter order (more specific filters should come first)
3. Ensure source maps are enabled in `tsconfig.json`
4. Check that file paths in stack traces are accessible to the application
5. Confirm that logging levels are set appropriately