import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
} from '@nestjs/websockets';
import { OnEvent } from '@nestjs/event-emitter';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { MessagesService } from './messages.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { MessageReactionDto } from './dto/update-message.dto';
import { InitiateCallDto, CallSignalDto, CallActionDto } from './dto/call.dto';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL?.split(','),
    credentials: true,
  },
  namespace: '/messages',
})
export class MessagesGateway
  implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private connectedUsers = new Map<string, string>(); // userId -> socketId
  private onlineUsers = new Map<string, { socketId: string; lastSeen: Date }>(); // userId -> status
  private activeTypers = new Map<string, Set<string>>(); // conversationId -> Set<userId>
  private activeCalls = new Map<string, {
    initiator: string;
    recipient: string;
    type: string;
    status: 'calling' | 'active';
    createdAt: Date
  }>(); // conversationId -> call info

  constructor(
    private messagesService: MessagesService,
    private prismaService: PrismaService,
    private jwtService: JwtService,
  ) {
    // Clean up abandoned calls every 10 seconds
    setInterval(() => {
      const now = new Date();
      this.activeCalls.forEach((call, conversationId) => {
        if (call.status === 'calling' && (now.getTime() - call.createdAt.getTime()) > 45000) {
          this.server.to(`conversation:${conversationId}`).emit('call:ended', {
            conversationId,
            reason: 'no_answer',
          });
          this.activeCalls.delete(conversationId);
        }
      });
    }, 10000);
  }

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
      this.onlineUsers.set(userId, { socketId: client.id, lastSeen: new Date() });

      const conversations =
        await this.messagesService.getUserConversations(userId);
      conversations.forEach((conv) => {
        client.join(`conversation:${conv.id}`);
      });

      // Notify only users in same conversations
      conversations.forEach((conv) => {
        client.to(`conversation:${conv.id}`).emit('user:online', {
          userId,
          timestamp: new Date().toISOString(),
        });
      });
    } catch (error) {
      console.error('WebSocket connection error:', error.message);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId) {
      const lastSeen = new Date();
      this.connectedUsers.delete(userId);
      this.onlineUsers.set(userId, { socketId: '', lastSeen });

      // Notify only users in same conversations
      client.broadcast.emit('user:offline', {
        userId,
        lastSeen: lastSeen.toISOString(),
      });

      // Clean up typing indicators and active calls
      this.activeTypers.forEach((typers, conversationId) => {
        if (typers.has(userId)) {
          typers.delete(userId);
          this.server.to(`conversation:${conversationId}`).emit('typing:stop', {
            userId,
            conversationId,
          });
        }
      });

      // Terminate any active calls for this user
      this.activeCalls.forEach((call, conversationId) => {
        if (call.initiator === userId || call.recipient === userId) {
          this.server.to(`conversation:${conversationId}`).emit('call:ended', {
            conversationId,
            reason: 'User disconnected',
          });
          this.activeCalls.delete(conversationId);
        }
      });
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

      // Emission is handled by event listener 'message.created'

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
        // Emit full update to ensure immediate reflection
        this.server
          .to(`conversation:${result.conversationId}`)
          .emit('message:reaction', {
            messageId: data.messageId,
            conversationId: result.conversationId,
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

      // Track active typers
      if (!this.activeTypers.has(data.conversationId)) {
        this.activeTypers.set(data.conversationId, new Set());
      }
      this.activeTypers.get(data.conversationId).add(userId);

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

      // Remove from active typers
      const typers = this.activeTypers.get(data.conversationId);
      if (typers) {
        typers.delete(userId);
      }

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

      this.server.to(`conversation:${data.conversationId}`).emit('message:read', {
        readerId: userId,
        conversationId: data.conversationId,
        readAt: new Date().toISOString(),
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  @OnEvent('message.created')
  handleMessageCreated(message: any) {
    this.server
      .to(`conversation:${message.conversationId}`)
      .emit('message:new', message);
  }

  @OnEvent('message.delivered')
  async handleMessageDelivered(data: { messageId: string, conversationId: string, recipientId: string }) {
    const isOnline = this.onlineUsers.get(data.recipientId)?.socketId;
    if (isOnline) {
      await this.messagesService.markAsDelivered(data.messageId);
      this.server.to(`conversation:${data.conversationId}`).emit('message:delivered', {
        messageId: data.messageId,
        conversationId: data.conversationId,
        deliveredAt: new Date().toISOString(),
      });
    }
  }

  @OnEvent('conversation.created')
  handleConversationCreated(conversation: any) {
    // Notify participants about the new conversation
    conversation.participants.forEach((participantId) => {
      // If user is connected, join them to the room
      const socketId = this.connectedUsers.get(participantId);
      if (socketId) {
        const socket = this.server.sockets.sockets.get(socketId);
        if (socket) {
          socket.join(`conversation:${conversation.id}`);
          // Also emit an event so the frontend knows a new conversation appeared
          socket.emit('conversation:new', conversation);
        }
      }
    });
  }

  // ============ WebRTC Call Handlers ============

  @SubscribeMessage('call:initiate')
  async handleCallInitiate(
    @MessageBody() data: InitiateCallDto,
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

      // Get conversation to find recipient
      const conversation = await this.prismaService.conversation.findUnique({
        where: { id: data.conversationId },
      });

      const recipient = conversation.participants.find((p) => p !== userId);

      // Check if recipient is online
      const recipientSocketId = this.connectedUsers.get(recipient);
      if (!recipientSocketId) {
        return { success: false, error: 'Recipient is offline' };
      }

      // Store active call
      this.activeCalls.set(data.conversationId, {
        initiator: userId,
        recipient,
        type: data.callType,
        status: 'calling',
        createdAt: new Date(),
      });

      // Notify ONLY the recipient
      this.server.to(recipientSocketId).emit('call:incoming', {
        conversationId: data.conversationId,
        callType: data.callType,
        initiatorId: userId,
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('call:accept')
  async handleCallAccept(
    @MessageBody() data: CallActionDto,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const userId = client.data.userId;
      const call = this.activeCalls.get(data.conversationId);

      if (call) {
        call.status = 'active';
        this.activeCalls.set(data.conversationId, call);
      }

      this.server.to(`conversation:${data.conversationId}`).emit('call:accepted', {
        conversationId: data.conversationId,
        acceptedBy: userId,
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('call:reject')
  async handleCallReject(
    @MessageBody() data: CallActionDto,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const userId = client.data.userId;
      const call = this.activeCalls.get(data.conversationId);

      this.activeCalls.delete(data.conversationId);

      // Notify the initiator specifically or the room
      this.server.to(`conversation:${data.conversationId}`).emit('call:rejected', {
        conversationId: data.conversationId,
        rejectedBy: userId,
        reason: data.reason || 'Call rejected',
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('call:end')
  async handleCallEnd(
    @MessageBody() data: CallActionDto,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const userId = client.data.userId;

      this.activeCalls.delete(data.conversationId);

      this.server.to(`conversation:${data.conversationId}`).emit('call:ended', {
        conversationId: data.conversationId,
        endedBy: userId,
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('call:signal')
  async handleCallSignal(
    @MessageBody() data: CallSignalDto,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const userId = client.data.userId;

      // Forward signal to other participant
      client.to(`conversation:${data.conversationId}`).emit('call:signal', {
        conversationId: data.conversationId,
        signal: data.signal,
        from: userId,
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Get online status for a user
  getUserOnlineStatus(userId: string) {
    const status = this.onlineUsers.get(userId);
    if (!status || !status.socketId) {
      return { online: false, lastSeen: status?.lastSeen };
    }
    return { online: true, lastSeen: status.lastSeen };
  }
}
