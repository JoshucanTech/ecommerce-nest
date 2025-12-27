import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class UpdateMessageDto {
  @IsString()
  @IsOptional()
  content?: string;

  @IsBoolean()
  @IsOptional()
  isRead?: boolean;
}

export class MessageReactionDto {
  @IsString()
  messageId: string;

  @IsString()
  emoji: string;
}
