import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class AnonymousOrJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err, user, info) {
    // if (err || !user) {
    //   return null; // or whatever you want to do with unauthenticated users
    // }
    return user;
  }
}
