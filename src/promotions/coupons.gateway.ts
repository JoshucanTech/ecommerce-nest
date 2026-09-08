import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/coupons',
})
export class CouponsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private logger = new Logger('CouponsGateway');
  private connectedClients = new Set<string>();

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token || client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (token) {
        try {
          const payload = this.jwtService.verify(token, {
            secret: this.configService.get('JWT_ACCESS_SECRET') || process.env.JWT_ACCESS_SECRET,
          });
          const userId = payload.sub;
          client.data.userId = userId;
          client.data.role = payload.role;
          client.join(`user:${userId}`);
          this.logger.log(`Client connected with auth: ${client.id} (user: ${userId})`);
        } catch (authErr) {
          this.logger.debug(`Client connected without valid auth, treated as guest: ${client.id}`);
        }
      } else {
        this.logger.debug(`Client connected as guest: ${client.id}`);
      }

      this.connectedClients.add(client.id);
      // Join general coupons broadcast room
      client.join('coupons:global');
    } catch (error) {
      this.logger.error(`Error during connection: ${error.message}`);
    }
  }

  handleDisconnect(client: Socket) {
    this.connectedClients.delete(client.id);
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join:vendor')
  handleJoinVendor(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { vendorId: string },
  ) {
    if (data?.vendorId) {
      client.join(`vendor:${data.vendorId}`);
      return { success: true, room: `vendor:${data.vendorId}` };
    }
    return { success: false };
  }

  broadcastCouponExpired(coupon: {
    id: string;
    code: string;
    vendorId?: string | null;
    status: string;
    endDate: Date | string;
  }) {
    this.logger.log(`Broadcasting coupon:expired -> ${coupon.code} (${coupon.id})`);
    // Broadcast to global room and specific vendor room
    this.server.to('coupons:global').emit('coupon:expired', coupon);
    if (coupon.vendorId) {
      this.server.to(`vendor:${coupon.vendorId}`).emit('coupon:expired', coupon);
    }
  }

  broadcastCouponUpdated(coupon: any) {
    this.logger.log(`Broadcasting coupon:updated -> ${coupon.code} (${coupon.id})`);
    this.server.to('coupons:global').emit('coupon:updated', coupon);
    if (coupon.vendorId) {
      this.server.to(`vendor:${coupon.vendorId}`).emit('coupon:updated', coupon);
    }
  }

  broadcastCouponCreated(coupon: any) {
    this.logger.log(`Broadcasting coupon:created -> ${coupon.code} (${coupon.id})`);
    this.server.to('coupons:global').emit('coupon:created', coupon);
    if (coupon.vendorId) {
      this.server.to(`vendor:${coupon.vendorId}`).emit('coupon:created', coupon);
    }
  }

  broadcastCouponDeleted(data: { id: string; vendorId?: string | null }) {
    this.logger.log(`Broadcasting coupon:deleted -> ${data.id}`);
    this.server.to('coupons:global').emit('coupon:deleted', data);
    if (data.vendorId) {
      this.server.to(`vendor:${data.vendorId}`).emit('coupon:deleted', data);
    }
  }
}
