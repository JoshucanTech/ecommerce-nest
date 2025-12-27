import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { MessagesService } from './messages.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { MessageReactionDto } from './dto/update-message.dto';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL?.split(','),
    credentials: true,
  },
  namespace: '/messages',
})
export class MessagesGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private connectedUsers = new Map<string, string>(); // userId -> socketId

  constructor(
    private messagesService: MessagesService,
    private prismaService: PrismaService,
    private jwtService: JwtService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token;

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      if (!payload?.sub) {
        client.disconnect();
        return;
      }
      const userId = payload.sub;

      client.data.userId = userId;
      this.connectedUsers.set(userId, client.id);

      const conversations =
        await this.messagesService.getUserConversations(userId);
      conversations.forEach((conv) => {
        client.join(`conversation:${conv.id}`);
      });

      client.broadcast.emit('user:online', { userId });
    } catch (error) {
      console.error('WebSocket connection error:', error.message);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId) {
      this.connectedUsers.delete(userId);
      client.broadcast.emit('user:offline', { userId });
    }
  }

  @SubscribeMessage('message:send')
  async handleSendMessage(
    @MessageBody() data: CreateMessageDto,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const userId = client.data.userId;
      const message = await this.messagesService.createMessage(userId, data);

      // Emit to conversation room
      this.server
        .to(`conversation:${data.conversationId}`)
        .emit('message:new', message);

      return { success: true, message };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('message:reaction')
  async handleMessageReaction(
    @MessageBody() data: MessageReactionDto,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const userId = client.data.userId;
      const result = await this.messagesService.toggleReaction(userId, data);

      if (result.conversationId) {
        this.server
          .to(`conversation:${result.conversationId}`)
          .emit('message:reaction', {
            messageId: data.messageId,
            userId,
            emoji: data.emoji,
            action: result.action,
          });
      }

      return { success: true, result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('typing:start')
  handleTypingStart(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const userId = client.data.userId;
      client.to(`conversation:${data.conversationId}`).emit('typing:start', {
        userId,
        conversationId: data.conversationId,
      });
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('typing:stop')
  handleTypingStop(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const userId = client.data.userId;
      client.to(`conversation:${data.conversationId}`).emit('typing:stop', {
        userId,
        conversationId: data.conversationId,
      });
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('conversation:join')
  async handleJoinConversation(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const userId = client.data.userId;
      const hasAccess = await this.messagesService.hasConversationAccess(
        userId,
        data.conversationId,
      );

      if (!hasAccess) {
        return { success: false, error: 'Access denied' };
      }

      client.join(`conversation:${data.conversationId}`);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('conversation:leave')
  async handleLeaveConversation(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(`conversation:${data.conversationId}`);
    return { success: true };
  }

  @SubscribeMessage('message:read')
  async handleMarkAsRead(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const userId = client.data.userId;
      const hasAccess = await this.messagesService.hasConversationAccess(
        userId,
        data.conversationId,
      );

      if (!hasAccess) {
        return { success: false, error: 'Access denied' };
      }

      await this.messagesService.markAsRead(userId, data.conversationId);

      client.to(`conversation:${data.conversationId}`).emit('message:read', {
        userId,
        conversationId: data.conversationId,
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}