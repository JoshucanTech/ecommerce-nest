import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { PrismaService } from '../prisma/prisma.service';
import {
  CreateMessageDto,
  CreateConversationDto,
} from './dto/create-message.dto';
import { UpdateMessageDto, MessageReactionDto } from './dto/update-message.dto';

@Injectable()
export class MessagesService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  async createConversation(
    userId: string,
    createConversationDto: CreateConversationDto,
  ) {
    const participants = [
      ...new Set([userId, ...createConversationDto.participants]),
    ];

    // Check if conversation already exists
    const possible = await this.prisma.conversation.findMany({
      where: {
        participants: { hasEvery: participants },
      },
    });

    const existing = possible.find(
      (conv) => conv.participants.length === participants.length,
    );

    if (existing) return existing;

    const conversation = await this.prisma.$transaction(async (tx) => {
      const newConversation = await tx.conversation.create({
        data: {
          participants,
          lastMessage: null,
          lastMessageAt: null,
        },
        include: {
          messages: {
            include: {
              sender: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  avatar: true,
                },
              },
              reactions: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });

      if (createConversationDto.initialMessage) {
        await this.createMessage(userId, {
          conversationId: newConversation.id,
          content: createConversationDto.initialMessage,
        });
      }

      return newConversation;
    });

    this.eventEmitter.emit('conversation.created', conversation);

    return conversation;
  }

  async getUserConversations(userId: string) {
    return this.prisma.conversation.findMany({
      where: {
        participants: { has: userId },
      },
      include: {
        messages: {
          include: {
            sender: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatar: true,
              },
            },
            reactions: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { lastMessageAt: 'desc' },
    });
  }

  async getConversationMessages(
    userId: string,
    conversationId: string,
    page = 1,
    limit = 50,
  ) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation?.participants.includes(userId)) {
      throw new ForbiddenException('Access denied to this conversation');
    }

    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true, avatar: true },
        },
        replyTo: {
          include: {
            sender: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        reactions: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return messages.reverse();
  }

  async createMessage(userId: string, dto: CreateMessageDto) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: dto.conversationId },
    });

    if (!conversation?.participants.includes(userId)) {
      throw new ForbiddenException('Access denied to this conversation');
    }

    const message = await this.prisma.$transaction(async (tx) => {
      const newMessage = await tx.message.create({
        data: {
          ...dto,
          senderId: userId,
        },
        include: {
          sender: {
            select: { id: true, firstName: true, lastName: true, avatar: true },
          },
          replyTo: {
            include: {
              sender: { select: { id: true, firstName: true, lastName: true } },
            },
          },
          reactions: true,
        },
      });

      // Update conversation
      await tx.conversation.update({
        where: { id: dto.conversationId },
        data: {
          lastMessage: dto.content,
          lastMessageAt: new Date(),
        },
      });

      // Emit event for real-time updates
      this.eventEmitter.emit('message.created', newMessage);

      return newMessage;
    });

    return message;
  }

  async updateMessage(
    userId: string,
    messageId: string,
    dto: UpdateMessageDto,
  ) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.senderId !== userId) {
      throw new ForbiddenException('Can only edit your own messages');
    }

    return this.prisma.message.update({
      where: { id: messageId },
      data: {
        ...dto,
        isEdited: true,
        editedAt: new Date(),
      },
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true, avatar: true },
        },
        reactions: true,
      },
    });
  }

  async toggleReaction(userId: string, dto: MessageReactionDto) {
    // Validate message exists and user has access
    const message = await this.prisma.message.findUnique({
      where: { id: dto.messageId },
      include: {
        conversation: {
          select: { id: true, participants: true },
        },
      },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (!message.conversation.participants.includes(userId)) {
      throw new ForbiddenException('Access denied to this conversation');
    }

    const existing = await this.prisma.messageReaction.findUnique({
      where: {
        messageId_userId_emoji: {
          messageId: dto.messageId,
          userId,
          emoji: dto.emoji,
        },
      },
    });

    if (existing) {
      await this.prisma.messageReaction.delete({
        where: { id: existing.id },
      });
      return { action: 'removed', conversationId: message.conversation.id };
    }

    await this.prisma.messageReaction.create({
      data: {
        messageId: dto.messageId,
        userId,
        emoji: dto.emoji,
      },
    });

    return { action: 'added', conversationId: message.conversation.id };
  }

  async markAsRead(userId: string, conversationId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation?.participants.includes(userId)) {
      throw new ForbiddenException('Access denied to this conversation');
    }

    await this.prisma.message.updateMany({
      where: {
        conversationId,
        senderId: { not: userId },
        isRead: false,
      },
      data: { isRead: true },
    });

    return { success: true };
  }

  async deleteMessage(userId: string, messageId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: {
        conversation: {
          select: { id: true, lastMessage: true },
        },
      },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.senderId !== userId) {
      throw new ForbiddenException('Can only delete your own messages');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.message.delete({
        where: { id: messageId },
      });

      // Update conversation if this was the last message
      if (message.conversation.lastMessage === message.content) {
        const lastMessage = await tx.message.findFirst({
          where: { conversationId: message.conversation.id },
          orderBy: { createdAt: 'desc' },
          select: { content: true, createdAt: true },
        });

        await tx.conversation.update({
          where: { id: message.conversation.id },
          data: {
            lastMessage: lastMessage?.content || null,
            lastMessageAt: lastMessage?.createdAt || null,
          },
        });
      }

      return { success: true };
    });
  }

  async hasConversationAccess(
    userId: string,
    conversationId: string,
  ): Promise<boolean> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { participants: true },
    });

    return conversation?.participants.includes(userId) || false;
  }
}
