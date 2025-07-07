// backend/src/auth/decorators/public.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const IS_SESSION_KEY = 'isSessionId';
export const Session = () => SetMetadata(IS_SESSION_KEY, true);
