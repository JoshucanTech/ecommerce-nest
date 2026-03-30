import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    UseGuards,
    Query,
    HttpStatus,
    Delete,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiParam,
    ApiQuery,
    ApiBearerAuth,
    ApiBody,
    ApiHeader,
} from '@nestjs/swagger';
import { VendorsService } from './vendors.service';
import { OrdersService } from '../orders/orders.service';
import { CreateVendorApplicationDto } from './dto/create-vendor-application.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';
import { UpdateVendorApplicationDto } from './dto/update-vendor-application.dto';
import { VendorBranchDto } from './dto/vendor-branch.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('vendors')
@Controller('vendors')
export class VendorsController {
    constructor(
        private readonly vendorsService: VendorsService,
        private readonly ordersService: OrdersService,
    ) { }

    @Patch('profile')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.VENDOR)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update vendor profile' })
    @ApiResponse({ status: 200, description: 'Vendor profile updated successfully' })
    updateProfile(@CurrentUser() user, @Body() updateVendorDto: UpdateVendorDto) {
        return this.vendorsService.updateProfile(user.id, updateVendorDto);
    }

    @Get('branches')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.VENDOR, UserRole.ADMIN, UserRole.SUB_ADMIN)
    @ApiBearerAuth()
    getBranches(@CurrentUser() user, @Query('userId') userId?: string) {
        const targetUserId = user.role === 'ADMIN' && userId ? userId : user.id;
        return this.vendorsService.getBranches(targetUserId);
    }

    @Post('branches')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.VENDOR, UserRole.ADMIN, UserRole.SUB_ADMIN)
    @ApiBearerAuth()
    addBranch(@CurrentUser() user, @Body() branchDto: VendorBranchDto, @Query('userId') userId?: string) {
        const targetUserId = user.role === 'ADMIN' && userId ? userId : user.id;
        return this.vendorsService.addBranch(targetUserId, branchDto);
    }

    @Patch('branches/:id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.VENDOR, UserRole.ADMIN, UserRole.SUB_ADMIN)
    @ApiBearerAuth()
    updateBranch(@CurrentUser() user, @Param('id') id: string, @Body() branchDto: VendorBranchDto, @Query('userId') userId?: string) {
        const targetUserId = user.role === 'ADMIN' && userId ? userId : user.id;
        return this.vendorsService.updateBranch(targetUserId, id, branchDto);
    }

    @Delete('branches/:id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.VENDOR, UserRole.ADMIN, UserRole.SUB_ADMIN)
    @ApiBearerAuth()
    deleteBranch(@CurrentUser() user, @Param('id') id: string, @Query('userId') userId?: string) {
        const targetUserId = user.role === 'ADMIN' && userId ? userId : user.id;
        return this.vendorsService.deleteBranch(targetUserId, id);
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.SUB_ADMIN)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update a vendor (admin only)' })
    @ApiParam({ name: 'id', description: 'Vendor ID' })
    @ApiResponse({ status: 200, description: 'Vendor updated successfully' })
    @ApiResponse({ status: 400, description: 'Bad request' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - Insufficient permissions',
    })
    @ApiResponse({ status: 404, description: 'Vendor not found' })
    update(@Param('id') id: string, @Body() updateVendorDto: UpdateVendorDto) {
        return this.vendorsService.update(id, updateVendorDto);
    }

    @Get('dashboard/stats')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.VENDOR, UserRole.ADMIN, UserRole.SUB_ADMIN)
    @ApiBearerAuth()
    getDashboardStats(@CurrentUser() user, @Query('userId') userId?: string) {
        const targetUserId = user.role === 'ADMIN' && userId ? userId : user.id;
        return this.vendorsService.getDashboardStats(targetUserId);
    }

    @Get('orders')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.VENDOR, UserRole.SUB_ADMIN, UserRole.ADMIN)
    @ApiBearerAuth()
    getVendorOrders(
        @CurrentUser() user,
        @Query('page') page = 1,
        @Query('limit') limit = 10,
        @Query('status') status?: string,
        @Query('userId') userId?: string,
    ) {
        const targetUserId = (user.role === UserRole.ADMIN || user.role === UserRole.SUB_ADMIN) && userId ? userId : user.id;
        return this.ordersService.findDashboardOrders(targetUserId, {
            page: +page,
            limit: +limit,
            status,
        });
    }

    @Post('apply')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    apply(@Body() createVendorApplicationDto: CreateVendorApplicationDto, @CurrentUser() user) {
        return this.vendorsService.apply(createVendorApplicationDto, user.id);
    }

    @Get('applications')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.SUB_ADMIN)
    @ApiBearerAuth()
    getApplications(@CurrentUser() user, @Query('page') page?: number, @Query('limit') limit?: number, @Query('status') status?: string) {
        return this.vendorsService.getApplications(user.id, {
            page: page || 1,
            limit: limit || 10,
            status,
        });
    }

    @Get('slug/:slug')
    @Public()
    @ApiOperation({ summary: 'Get vendor by slug' })
    @ApiParam({ name: 'slug', description: 'Vendor slug' })
    @ApiResponse({ status: 200, description: 'Returns vendor details' })
    @ApiResponse({ status: 404, description: 'Vendor not found' })
    findBySlug(@Param('slug') slug: string) {
        return this.vendorsService.findBySlug(slug);
    }

    @Get('featured')
    @Public()
    getFeaturedVendors(@Query('page') page = 1, @Query('limit') limit = 10, @Query('spotlight') spotlight = false) {
        return this.vendorsService.getFeaturedVendors({
            page: +page,
            limit: +limit,
            spotlight: spotlight === true,
        });
    }

    @Get()
    @Public()
    findAll(
        @Query('page') page?: number,
        @Query('limit') limit?: number,
        @Query('search') search?: string,
        @Query('sortBy') sortBy?: string,
        @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    ) {
        return this.vendorsService.findAll({
            page: page || 1,
            limit: limit || 10,
            search,
            sortBy,
            sortOrder,
        });
    }

    @Get(':id')
    @Public()
    findOne(@Param('id') id: string) {
        return this.vendorsService.findOne(id);
    }
}
