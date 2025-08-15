import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Patch,
  Delete,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ShippingService } from './shipping.service';
import { CreateShippingDto } from './dto/create-shipping.dto';
import { UpdateShippingDto } from './dto/update-shipping.dto';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { Public } from 'src/auth/decorators/public.decorator';

@ApiTags('Shipping')
@Controller('shipping')
export class ShippingController {
  constructor(private readonly shippingService: ShippingService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('VENDOR')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new shipping method' })
  @ApiResponse({
    status: 201,
    description: 'Shipping method created successfully',
  })
  async create(
    @Body() createShippingDto: CreateShippingDto,
    @CurrentUser() user,
  ) {
    return this.shippingService.create(createShippingDto, user.vendorId);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('VENDOR')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all shipping methods for the vendor' })
  async findAll(@CurrentUser() user) {
    return this.shippingService.findAll(user.vendorId);
  }

  @Get('vendor/:vendorId')
  @Public()
  @ApiOperation({ summary: 'Get available shipping methods for a vendor' })
  async getAvailableMethodsForVendor(@Param('vendorId') vendorId: string) {
    return this.shippingService.getAvailableMethodsForVendor(vendorId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('VENDOR')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a specific shipping method' })
  async findOne(@Param('id') id: string, @CurrentUser() user) {
    return this.shippingService.findOne(id, user.vendorId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('VENDOR')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a shipping method' })
  async update(
    @Param('id') id: string,
    @Body() updateShippingDto: UpdateShippingDto,
    @CurrentUser() user,
  ) {
    return this.shippingService.update(id, updateShippingDto, user.vendorId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('VENDOR')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a shipping method' })
  async remove(@Param('id') id: string, @CurrentUser() user) {
    return this.shippingService.remove(id, user.vendorId);
  }
}
