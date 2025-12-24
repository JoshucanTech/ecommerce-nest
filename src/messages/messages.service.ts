import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMessageDto, CreateConversationDto } from './dto/create-message.dto';
import { UpdateMessageDto, MessageReactionDto } from './dto/update-message.dto';

@Injectable()
export class MessagesService {
  constructor(private prisma: PrismaService) {}

  async createConversation(
    userId: string,
    createConversationDto: CreateConversationDto,
  ) {
    const participants = [
      ...new Set([userId, ...createConversationDto.participants]),
    ];

    // Check if conversation already exists
    const existing = await this.prisma.conversation.findFirst({
      where: {
        participants: {
          equals: participants,
        },
      },
    });

    if (existing) return existing;

    const conversation = await this.prisma.conversation.create({
      data: {
        participants,
        lastMessage: createConversationDto.initialMessage,
        lastMessageAt: createConversationDto.initialMessage ? new Date() : null,
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
        conversationId: conversation.id,
        content: createConversationDto.initialMessage,
      });
    }

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

    if (!conversation || !conversation.participants.includes(userId)) {
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

    if (!conversation || !conversation.participants.includes(userId)) {
      throw new ForbiddenException('Access denied to this conversation');
    }

    const message = await this.prisma.message.create({
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
    await this.prisma.conversation.update({
      where: { id: dto.conversationId },
      data: {
        lastMessage: dto.content,
        lastMessageAt: new Date(),
      },
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
        isEdited: dto.content ? true : message.isEdited,
        editedAt: dto.content ? new Date() : message.editedAt,
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
      return { action: 'removed' };
    }

    await this.prisma.messageReaction.create({
      data: {
        messageId: dto.messageId,
        userId,
        emoji: dto.emoji,
      },
    });

    return { action: 'added' };
  }

  async markAsRead(userId: string, conversationId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation || !conversation.participants.includes(userId)) {
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
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.senderId !== userId) {
      throw new ForbiddenException('Can only delete your own messages');
    }

    await this.prisma.message.delete({
      where: { id: messageId },
    });

    return { success: true };
  }
}