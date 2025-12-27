import { IsString, IsEnum, IsNotEmpty, IsOptional } from 'class-validator';

export enum CallType {
    AUDIO = 'audio',
    VIDEO = 'video',
}

export enum CallStatus {
    INITIATING = 'initiating',
    RINGING = 'ringing',
    ACTIVE = 'active',
    ENDED = 'ended',
    REJECTED = 'rejected',
    MISSED = 'missed',
}

export class InitiateCallDto {
    @IsString()
    @IsNotEmpty()
    conversationId: string;

    @IsEnum(CallType)
    @IsNotEmpty()
    callType: CallType;
}

export class CallSignalDto {
    @IsString()
    @IsNotEmpty()
    conversationId: string;

    @IsNotEmpty()
    signal: any; // WebRTC offer, answer, or ICE candidate
}

export class CallActionDto {
    @IsString()
    @IsNotEmpty()
    conversationId: string;

    @IsString()
    @IsOptional()
    reason?: string;
}
