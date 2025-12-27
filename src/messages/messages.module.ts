import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';
import { MessagesGateway } from './messages.gateway';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    EventEmitterModule,
    JwtModule.register({
      secret: (() => {
        if (!process.env.JWT_ACCESS_SECRET) {
          throw new Error('JWT_SECRET environment variable is not defined');
        }
        return process.env.JWT_ACCESS_SECRET;
      })(),
      signOptions: { expiresIn: '24h' },
    }),
  ],
  controllers: [MessagesController],
  providers: [MessagesService, MessagesGateway],
  exports: [MessagesService],
})
export class MessagesModule {}
