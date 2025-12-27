import { RedisService } from './redis.service';

/**
 * Cache decorator for service methods
 * @param ttl Time to live in seconds (default: 300 seconds / 5 minutes)
 * @param keyPrefix Prefix for the cache key (default: method name)
 */
export function Cacheable(ttl: number = 300, keyPrefix?: string) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor,
  ) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      // Get the Redis service instance
      const redisService = this.redisService || this.cacheService || this.redis;

      // If Redis service is not available, just call the original method
      if (
        !redisService ||
        !redisService.isRedisConnected ||
        !redisService.isRedisConnected()
      ) {
        return method.apply(this, args);
      }

      try {
        // Generate cache key
        const prefix = keyPrefix || propertyName;
        const cacheKey = `${prefix}:${JSON.stringify(args)}`;

        // Try to get from cache
        const cachedResult = await redisService.getCacheRaw(cacheKey);
        if (cachedResult !== null) {
          return JSON.parse(cachedResult);
        }

        // If not in cache, call the original method
        const result = await method.apply(this, args);

        // Cache the result
        if (result !== undefined) {
          await redisService.setCacheRaw(cacheKey, JSON.stringify(result), ttl);
        }

        return result;
      } catch (error) {
        // If caching fails, just call the original method
        console.error('Cache error:', error);
        return method.apply(this, args);
      }
    };
  };
}
