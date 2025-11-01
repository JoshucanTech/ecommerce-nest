# JWT Refresh Token Expiration Configuration Guide

This guide explains how to configure the expiration time for JWT refresh tokens in your application.

## Understanding the Configuration

The JWT refresh token expiration is controlled by the `JWT_REFRESH_EXPIRATION` environment variable in your [.env](file:///C:/Users/titan/Documents/aaa/nest/.env) file. This variable accepts values in several formats:

1. **Numeric values** - Treated as seconds (e.g., `600` = 10 minutes)
2. **Time unit format** - Number followed by a unit:
   - `s` - seconds (e.g., `600s` = 10 minutes)
   - `m` - minutes (e.g., `10m` = 10 minutes)
   - `h` - hours (e.g., `24h` = 1 day)
   - `d` - days (e.g., `7d` = 1 week)
   - `w` - weeks (e.g., `2w` = 2 weeks)

## Common Expiration Periods

Here are some common refresh token expiration periods you can use:

| Period | Value | Use Case |
|--------|-------|----------|
| 10 minutes | `10m` or `600s` | Testing only |
| 1 hour | `1h` or `3600s` | Very strict security requirements |
| 1 day | `1d` or `86400s` | High security applications |
| 1 week | `7d` or `604800s` | Standard for many web applications |
| 2 weeks | `14d` or `1209600s` | Good balance of security and user experience |
| 1 month | `30d` or `2592000s` | Applications where user convenience is prioritized |
| 3 months | `90d` or `7776000s` | Less security-sensitive applications |
| 6 months | `180d` or `15552000s` | Applications where user retention is critical |
| 1 year | `365d` or `31536000s` | Applications where convenience is more important than security |

## Security Considerations

When choosing a refresh token expiration period, consider:

1. **Security requirements** - More sensitive applications should use shorter expiration periods
2. **User experience** - Longer expiration periods provide better user experience
3. **Industry standards** - Follow practices common in your industry
4. **Compliance requirements** - Some industries have specific requirements for session lengths

## Recommendations

### High Security Applications
- Banking, financial services, healthcare
- Refresh token expiration: 1 day to 1 week
- Example: `JWT_REFRESH_EXPIRATION=7d`

### Standard Web Applications
- E-commerce, social media, general business applications
- Refresh token expiration: 2 weeks to 1 month
- Example: `JWT_REFRESH_EXPIRATION=30d`

### User Experience Focused Applications
- Entertainment, gaming, productivity tools
- Refresh token expiration: 3 months to 6 months
- Example: `JWT_REFRESH_EXPIRATION=90d`

## Implementation Details

The application now includes a robust parsing function that correctly handles various time formats and calculates expiration dates properly. The fix addressed a bug where expiration times were being added twice to the same date object.

## Testing Your Configuration

To test your configuration:

1. Update the [JWT_REFRESH_EXPIRATION](file:///C:/Users/titan/Documents/aaa/nest/.env#L21-L21) value in your [.env](file:///C:/Users/titan/Documents/aaa/nest/.env) file
2. Restart your application
3. Register or log in to get a new refresh token
4. Check the database to verify the correct expiration date is set
5. Test the refresh token functionality after various time periods

## Database Considerations

Remember that refresh tokens are stored in the database and checked for expiration both by the JWT library and by comparing with the [refreshExpiresAt](file:///C:/Users/titan/Documents/aaa/nest/src/auth/auth.service.ts#L393-L393) field in the database. Both checks must pass for a refresh token to be valid.

## Rotating Refresh Tokens

The application implements refresh token rotation, which means:
1. Each time you use a refresh token, a new one is issued
2. The old refresh token is invalidated
3. This helps mitigate the risk of long-lived refresh tokens

This security feature is independent of the expiration time configuration.