import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { SupportService } from './support.service';
import { CreateSupportTicketDto } from './dto/create-support-ticket.dto';
import { CreateTicketResponseDto } from './dto/create-ticket-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Support')
@Controller('support')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SupportController {
    constructor(private readonly supportService: SupportService) { }

    @Post('tickets')
    @ApiOperation({ summary: 'Create a new support ticket' })
    @ApiResponse({ status: 201, description: 'Ticket created successfully' })
    createTicket(@CurrentUser() user: any, @Body() createSupportTicketDto: CreateSupportTicketDto) {
        return this.supportService.createTicket(user.id, createSupportTicketDto);
    }

    @Get('tickets')
    @ApiOperation({ summary: 'Get all support tickets for current user' })
    getTickets(@CurrentUser() user: any) {
        return this.supportService.getTickets(user.id);
    }

    @Get('tickets/:id')
    @ApiOperation({ summary: 'Get ticket details by ID' })
    getTicketById(@CurrentUser() user: any, @Param('id') id: string) {
        return this.supportService.getTicketById(id, user.id);
    }

    @Post('tickets/:id/responses')
    @ApiOperation({ summary: 'Add a response to a support ticket' })
    addResponse(
        @CurrentUser() user: any,
        @Param('id') id: string,
        @Body() createTicketResponseDto: CreateTicketResponseDto,
    ) {
        return this.supportService.addResponse(id, user.id, createTicketResponseDto);
    }

    @Get('faqs')
    @ApiOperation({ summary: 'Get all published FAQs' })
    getFaqs() {
        return this.supportService.getFaqs();
    }
}
