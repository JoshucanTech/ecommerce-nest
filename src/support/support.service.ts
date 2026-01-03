import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSupportTicketDto } from './dto/create-support-ticket.dto';
import { CreateTicketResponseDto } from './dto/create-ticket-response.dto';
import { RespondentType } from '@prisma/client';

@Injectable()
export class SupportService {
    constructor(private prisma: PrismaService) { }

    async createTicket(userId: string, createSupportTicketDto: CreateSupportTicketDto) {
        return this.prisma.supportTicket.create({
            data: {
                ...createSupportTicketDto,
                userId,
            },
        });
    }

    async getTickets(userId: string) {
        return this.prisma.supportTicket.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            include: {
                responses: {
                    orderBy: { createdAt: 'asc' },
                },
            },
        });
    }

    async getTicketById(id: string, userId: string) {
        const ticket = await this.prisma.supportTicket.findUnique({
            where: { id },
            include: {
                responses: {
                    orderBy: { createdAt: 'asc' },
                },
            },
        });

        if (!ticket) {
            throw new NotFoundException(`Support ticket with ID ${id} not found`);
        }

        if (ticket.userId !== userId) {
            throw new ForbiddenException('You do not have permission to view this ticket');
        }

        return ticket;
    }

    async addResponse(ticketId: string, userId: string, createTicketResponseDto: CreateTicketResponseDto, respondentType: RespondentType = RespondentType.USER) {
        const ticket = await this.getTicketById(ticketId, userId);

        return this.prisma.ticketResponse.create({
            data: {
                content: createTicketResponseDto.content,
                supportTicketId: ticketId,
                respondentId: userId,
                respondentType,
            },
        });
    }

    async getFaqs() {
        return this.prisma.faq.findMany({
            where: { isPublished: true },
            orderBy: { order: 'asc' },
        });
    }
}
