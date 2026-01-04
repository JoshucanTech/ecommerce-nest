import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CouponsService } from './coupons.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('coupons')
@Controller('coupons')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CouponsController {
    constructor(private readonly couponsService: CouponsService) { }

    @Get()
    @Roles('ADMIN', 'VENDOR', 'SUB_ADMIN')
    @ApiOperation({ summary: 'Get all coupons' })
    findAll(
        @CurrentUser() user: any,
        @Query('page') page?: number,
        @Query('limit') limit?: number,
        @Query('search') search?: string,
        @Query('status') status?: string,
    ) {
        return this.couponsService.findAll(user, {
            page: page ? Number(page) : 1,
            limit: limit ? Number(limit) : 10,
            search,
            status,
        });
    }

    @Post()
    @Roles('ADMIN', 'VENDOR', 'SUB_ADMIN')
    @ApiOperation({ summary: 'Create a new coupon' })
    create(@CurrentUser() user: any, @Body() createCouponDto: CreateCouponDto) {
        return this.couponsService.create(user, createCouponDto);
    }

    @Get(':id')
    @Roles('ADMIN', 'VENDOR', 'SUB_ADMIN')
    @ApiOperation({ summary: 'Get a coupon by ID' })
    findOne(@Param('id') id: string, @CurrentUser() user: any) {
        return this.couponsService.findOne(id, user);
    }

    @Patch(':id')
    @Roles('ADMIN', 'VENDOR', 'SUB_ADMIN')
    @ApiOperation({ summary: 'Update a coupon' })
    update(
        @Param('id') id: string,
        @CurrentUser() user: any,
        @Body() updateCouponDto: UpdateCouponDto,
    ) {
        return this.couponsService.update(id, user, updateCouponDto);
    }

    @Delete(':id')
    @Roles('ADMIN', 'VENDOR', 'SUB_ADMIN')
    @ApiOperation({ summary: 'Delete a coupon' })
    remove(@Param('id') id: string, @CurrentUser() user: any) {
        return this.couponsService.remove(id, user);
    }
}
