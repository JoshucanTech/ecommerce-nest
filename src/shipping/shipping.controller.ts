import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Patch,
  Delete,
  UseGuards,
  Put,
  Query,
  ForbiddenException,
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
import { ShippingCalculationService } from './shipping-calculation.service';

class AssociateShippingDto {
  shippingId: string;
  priceOverride?: number;
  fulfillmentType?: 'MERCHANT' | 'PLATFORM' | 'PRIME';
}

class CalculateShippingDto {
  shippingMethodId: string;
  address: {
    country: string;
    region?: string;
    postalCode?: string;
    city?: string;
  };
  orderValue: number;
  totalWeight: number;
}

@ApiTags('Shipping')
@Controller('shipping')
export class ShippingController {
  constructor(
    private readonly shippingService: ShippingService,
    private readonly shippingCalculationService: ShippingCalculationService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN') // Only admins can create shipping methods
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new shipping method (Admin only)' })
  @ApiResponse({
    status: 201,
    description: 'Shipping method created successfully',
  })
  async create(@Body() createShippingDto: CreateShippingDto) {
    return this.shippingService.create(createShippingDto);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all shipping methods' })
  async findAll() {
    return this.shippingService.findAll();
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get a specific shipping method' })
  async findOne(@Param('id') id: string) {
    return this.shippingService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN') // Only admins can update shipping methods
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a shipping method (Admin only)' })
  async update(
    @Param('id') id: string,
    @Body() updateShippingDto: UpdateShippingDto,
  ) {
    return this.shippingService.update(id, updateShippingDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN') // Only admins can delete shipping methods
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a shipping method (Admin only)' })
  async remove(@Param('id') id: string) {
    return this.shippingService.remove(id);
  }

  // Vendor-specific endpoints
  @Post('vendor/:vendorId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('VENDOR', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Associate a shipping method with a vendor' })
  @ApiResponse({
    status: 200,
    description: 'Shipping method associated with vendor successfully',
  })
  async associateWithVendor(
    @Param('vendorId') vendorId: string,
    @Body() associateDto: AssociateShippingDto,
    @CurrentUser() user,
  ) {
    // Vendors can only associate with their own vendorId unless they are admin
    if (user.role !== 'ADMIN' && user.vendorId !== vendorId) {
      throw new ForbiddenException('You can only modify your own vendor');
    }

    return this.shippingService.associateWithVendor(
      associateDto.shippingId,
      vendorId,
      associateDto.priceOverride,
      associateDto.fulfillmentType,
    );
  }

  @Get('vendor/:vendorId')
  @Public()
  @ApiOperation({ summary: 'Get available shipping methods for a vendor' })
  @ApiResponse({
    status: 200,
    description: 'Returns available shipping methods for a vendor',
  })
  async getAvailableMethodsForVendor(@Param('vendorId') vendorId: string) {
    return this.shippingService.getAvailableShippingMethods(vendorId);
  }

  @Delete('vendor/:vendorId/:shippingId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('VENDOR', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Dissociate a shipping method from a vendor' })
  async dissociateFromVendor(
    @Param('vendorId') vendorId: string,
    @Param('shippingId') shippingId: string,
    @CurrentUser() user,
  ) {
    // Vendors can only dissociate from their own vendorId unless they are admin
    if (user.role !== 'ADMIN' && user.vendorId !== vendorId) {
      throw new ForbiddenException('You can only modify your own vendor');
    }

    return this.shippingService.dissociateFromVendor(shippingId, vendorId);
  }

  @Get(':id/vendors')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get all vendors associated with a shipping method (Admin only)',
  })
  async getVendorsForShippingMethod(@Param('id') id: string) {
    return this.shippingService.getVendorsForShippingMethod(id);
  }

  @Post('calculate')
  @Public()
  @ApiOperation({ summary: 'Calculate shipping cost' })
  @ApiResponse({
    status: 200,
    description: 'Returns calculated shipping cost',
  })
  async calculateShipping(
    @Body() calculateDto: CalculateShippingDto,
    @Query('vendorId') vendorId: string,
  ) {
    return this.shippingCalculationService.calculateShippingCost(
      vendorId,
      calculateDto.shippingMethodId,
      calculateDto.address,
      calculateDto.orderValue,
      calculateDto.totalWeight,
    );
  }

  @Get('delivery-date/:shippingMethodId')
  @Public()
  @ApiOperation({ summary: 'Calculate delivery date for a shipping method' })
  @ApiResponse({
    status: 200,
    description: 'Returns estimated delivery date information',
  })
  async calculateDeliveryDate(
    @Param('shippingMethodId') shippingMethodId: string,
    @Query('zipCode') zipCode?: string,
    @Query('processingTime') processingTime?: string,
  ) {
    const shippingMethod = await this.shippingService.findOne(shippingMethodId);
    return this.shippingCalculationService.calculateDeliveryDate(
      shippingMethod,
      zipCode,
      processingTime,
    );
  }
}
