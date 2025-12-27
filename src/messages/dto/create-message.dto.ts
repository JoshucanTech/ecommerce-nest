import { IsString, IsOptional, IsEnum, IsArray } from 'class-validator';
import { MessageType } from '@prisma/client';

export class CreateMessageDto {
  @IsString()
  conversationId: string;

  @IsString()
  content: string;

  @IsEnum(MessageType)
  @IsOptional()
  messageType?: MessageType = MessageType.TEXT;

  @IsArray()
  @IsOptional()
  attachments?: string[] = [];

  @IsString()
  @IsOptional()
  replyToId?: string;
}

export class CreateConversationDto {
  @IsArray()
  @IsString({ each: true })
  participants: string[];

  @IsString()
  @IsOptional()
  initialMessage?: string;
}
