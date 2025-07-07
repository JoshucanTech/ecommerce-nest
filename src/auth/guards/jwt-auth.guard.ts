import {
  Injectable,
  type ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { IS_SESSION_KEY } from '../decorators/session-id.decorator';

// @Injectable()
// export class JwtAuthGuard extends AuthGuard('jwt') {
//   constructor(private reflector: Reflector) {
//     super();
//   }

//   async canActivate(context: ExecutionContext): Promise<any> {
//     const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
//       context.getHandler(),
//       context.getClass(),
//     ]);

//     const isSession = this.reflector.getAllAndOverride<boolean>(
//       IS_SESSION_KEY,
//       [context.getHandler(), context.getClass()],
//     );

//     const request = context.switchToHttp().getRequest();

//     if (isPublic) {
//       return true;
//     }

//     if (isSession) {
//       // 👇 Try to validate JWT first
//       try {
//         const result = (await super.canActivate(context)) as boolean;
//         return result;
//       } catch (err) {
//         // 👇 If no valid JWT, check for session ID in headers
//         const sessionId = request.headers['x-anonymous-id']?.toString();
//         if (sessionId) {
//           request.sessionId = sessionId; // Optional: attach to request
//           return true;
//         } else {
//           throw new UnauthorizedException('No token or session ID provided');
//         }
//       }
//     }

//     return super.canActivate(context);
//   }

//   handleRequest(err, user, info) {
//     if (err || !user) {
//       throw err || new UnauthorizedException('Invalid token or token expired');
//     }
//     return user;
//   }
// }

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<any> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const isSession = this.reflector.getAllAndOverride<boolean>(
      IS_SESSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    const req = context.switchToHttp().getRequest();

    // 🔓 Public route — allow without auth
    if (isPublic) {
      return true;
    }

    // 🟡 Session route — check for JWT first
    if (isSession) {
      const authHeader = req.headers['authorization'];

      if (authHeader?.startsWith('Bearer ')) {
        // JWT token exists → validate it
        try {
          const result = (await super.canActivate(context)) as boolean;
          return result; // token is valid
        } catch (err) {
          // token is present but invalid
          throw new UnauthorizedException('Invalid or expired token');
        }
      }

      // No token → check for session ID in headers
      const sessionId = req.headers['x-anonymous-id']?.toString();

      if (sessionId) {
        req.sessionId = sessionId;
        return true;
      }

      // Neither token nor session ID
      throw new UnauthorizedException('No token or session ID provided');
    }

    // All other routes → enforce full JWT auth
    return super.canActivate(context);
  }

  handleRequest(err, user, info) {
    if (err || !user) {
      throw err || new UnauthorizedException('Invalid token or token expired');
    }
    return user;
  }
}
