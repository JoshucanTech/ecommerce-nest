import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const SessionOrUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    if (request.user) {
      return { userId: request.user.id };
    }
    return { sessionId: request.headers['x-anonymous-id'] };
  },
);
