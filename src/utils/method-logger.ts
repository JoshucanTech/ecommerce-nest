import { Logger } from '@nestjs/common';

// A decorator to log method calls with parameters and return values
export function LogMethod(logger: Logger) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor,
  ) {
    const method = descriptor.value;

    descriptor.value = function (...args: any[]) {
      const className = target.constructor.name;
      const methodName = propertyName;
      
      // Log method call with arguments
      logger.log(
        `[${className}.${methodName}] Called with args: ${JSON.stringify(args)}`,
      );

      // Call the original method
      const result = method.apply(this, args);

      // If the method returns a Promise, log the resolved value
      if (result instanceof Promise) {
        return result.then((resolvedResult) => {
          logger.log(
            `[${className}.${methodName}] Resolved with: ${JSON.stringify(resolvedResult)}`,
          );
          return resolvedResult;
        }).catch((error) => {
          logger.error(
            `[${className}.${methodName}] Rejected with error: ${error.message}`,
            error.stack,
          );
          throw error;
        });
      } else {
        // For synchronous methods, log the result immediately
        logger.log(
          `[${className}.${methodName}] Returned: ${JSON.stringify(result)}`,
        );
        return result;
      }
    };
  };
}