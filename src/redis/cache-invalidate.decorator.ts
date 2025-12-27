import { RedisService } from './redis.service';

/**
 * Cache invalidation decorator for service methods that modify data
 * @param keyPatterns Array of cache key patterns to invalidate
 */
export function CacheInvalidate(...keyPatterns: string[]) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor,
  ) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      // Get the Redis service instance
      const redisService = this.redisService || this.cacheService || this.redis;

      try {
        // Call the original method first
        const result = await method.apply(this, args);

        // If Redis service is available, invalidate cache entries
        if (
          redisService &&
          redisService.isRedisConnected &&
          redisService.isRedisConnected()
        ) {
          for (const pattern of keyPatterns) {
            // Invalidate cache entries by pattern
            await redisService.invalidateCachePattern(pattern);
          }
        }

        return result;
      } catch (error) {
        // If cache invalidation fails, still return the result
        console.error('Cache invalidation error:', error);
        return method.apply(this, args);
      }
    };
  };
}
