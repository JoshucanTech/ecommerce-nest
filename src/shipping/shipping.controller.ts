// src/shipping/shipping.controller.ts
import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Patch,
  Delete,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
// import { UserRole } from '../users/enums/user-role.enum';
import { ShippingService } from './shipping.service';
import { CreateShippingDto } from './dto/create-shipping.dto';
import { UpdateShippingDto } from './dto/update-shipping.dto';
// import { RequestWithUser } from '../common/interfaces/request-with-user.interface';
// import { ShippingPolicyResponseDto } from './dto/shipping-policy-response.dto';

@ApiTags('Shipping')
@ApiBearerAuth()
@Controller('shipping')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ShippingController {
  constructor(private readonly shippingService: ShippingService) {}

  // @Post()
  // @Roles(UserRole.VENDOR, UserRole.ADMIN)
  // @ApiOperation({ summary: 'Create a new shipping policy' })
  // @ApiResponse({
  //   status: 201,
  //   description: 'Shipping policy created successfully',
  //   type: ShippingPolicyResponseDto,
  // })
  // @ApiResponse({ status: 400, description: 'Invalid input data' })
  // @ApiResponse({ status: 401, description: 'Unauthorized' })
  // @ApiResponse({ status: 403, description: 'Forbidden' })
  // @ApiBody({ type: CreateShippingDto })
  // async createShippingPolicy(
  //   @Body() createShippingDto: CreateShippingDto,
  //   @Req() req: RequestWithUser,
  // ) {
  //   return this.shippingService.createShippingPolicy({
  //     ...createShippingDto,
  //     vendorId: req.user.vendorId,
  //   });
  // }

  // @Get()
  // @Roles(UserRole.VENDOR, UserRole.ADMIN)
  // @ApiOperation({ summary: 'Get all shipping policies for the vendor' })
  // @ApiResponse({
  //   status: 200,
  //   description: 'List of shipping policies',
  //   type: [ShippingPolicyResponseDto],
  // })
  // @ApiQuery({
  //   name: 'isActive',
  //   required: false,
  //   description: 'Filter by active status',
  // })
  // async getVendorShippingPolicies(
  //   @Req() req: RequestWithUser,
  //   @Query('isActive') isActive?: boolean,
  // ) {
  //   return this.shippingService.getVendorShippingPolicies(
  //     req.user.vendorId,
  //     isActive,
  //   );
  // }

  // @Get(':id')
  // @Roles(UserRole.VENDOR, UserRole.ADMIN, UserRole.CUSTOMER)
  // @ApiOperation({ summary: 'Get shipping policy details' })
  // @ApiResponse({
  //   status: 200,
  //   description: 'Shipping policy details',
  //   type: ShippingPolicyResponseDto,
  // })
  // @ApiResponse({ status: 404, description: 'Policy not found' })
  // @ApiParam({ name: 'id', description: 'Shipping policy ID' })
  // async getShippingPolicy(@Param('id') id: string) {
  //   return this.shippingService.getShippingPolicyById(id);
  // }

  // @Get('product/:productId')
  // @Roles(UserRole.CUSTOMER, UserRole.GUEST)
  // @ApiOperation({ summary: 'Get shipping policy for a product' })
  // @ApiResponse({
  //   status: 200,
  //   description: 'Product shipping information',
  //   type: ShippingPolicyResponseDto,
  // })
  // @ApiResponse({ status: 404, description: 'Product not found' })
  // @ApiParam({ name: 'productId', description: 'Product ID' })
  // async getProductShippingInfo(@Param('productId') productId: string) {
  //   return this.shippingService.getProductShippingInfo(productId);
  // }

  // @Patch(':id')
  // @Roles(UserRole.VENDOR, UserRole.ADMIN)
  // @ApiOperation({ summary: 'Update a shipping policy' })
  // @ApiResponse({
  //   status: 200,
  //   description: 'Updated shipping policy',
  //   type: ShippingPolicyResponseDto,
  // })
  // @ApiResponse({ status: 400, description: 'Invalid input data' })
  // @ApiResponse({ status: 404, description: 'Policy not found' })
  // @ApiParam({ name: 'id', description: 'Shipping policy ID' })
  // @ApiBody({ type: UpdateShippingDto })
  // async updateShippingPolicy(
  //   @Param('id') id: string,
  //   @Body() updateShippingDto: UpdateShippingDto,
  //   @Req() req: RequestWithUser,
  // ) {
  //   return this.shippingService.updateShippingPolicy(
  //     id,
  //     updateShippingDto,
  //     req.user.vendorId,
  //   );
  // }

  // @Delete(':id')
  // @Roles(UserRole.VENDOR, UserRole.ADMIN)
  // @ApiOperation({ summary: 'Delete a shipping policy' })
  // @ApiResponse({ status: 200, description: 'Policy deleted successfully' })
  // @ApiResponse({ status: 404, description: 'Policy not found' })
  // @ApiResponse({
  //   status: 400,
  //   description: 'Cannot delete default policy',
  // })
  // @ApiParam({ name: 'id', description: 'Shipping policy ID' })
  // async deleteShippingPolicy(
  //   @Param('id') id: string,
  //   @Req() req: RequestWithUser,
  // ) {
  //   return this.shippingService.deleteShippingPolicy(id, req.user.vendorId);
  // }

  // @Post(':policyId/set-default')
  // @Roles(UserRole.VENDOR, UserRole.ADMIN)
  // @ApiOperation({ summary: 'Set a policy as default for the vendor' })
  // @ApiResponse({
  //   status: 200,
  //   description: 'Default policy set successfully',
  // })
  // @ApiResponse({ status: 404, description: 'Policy not found' })
  // @ApiParam({ name: 'policyId', description: 'Shipping policy ID' })
  // async setDefaultPolicy(
  //   @Param('policyId') policyId: string,
  //   @Req() req: RequestWithUser,
  // ) {
  //   return this.shippingService.setDefaultShippingPolicy(
  //     policyId,
  //     req.user.vendorId,
  //   );
  // }
}
