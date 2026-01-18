import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
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
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Prisma, UserRole } from '@prisma/client';
import { CreateShippingAddressDto } from './dto/create-shipping-address.dto';
import { UpdateShippingAddressDto } from './dto/update-shipping-address.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AddressType } from './enums/address-type.enum';


@ApiTags('users')
@Controller('users')
// @ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUB_ADMIN)
  @ApiOperation({
    summary: 'Get all users (admin only)',
    description:
      'Retrieve a paginated list of all users in the system. Only accessible by administrators.',
  })
  @ApiHeader({
    name: 'Authorization',
    description: 'Bearer token for authentication',
    required: true,
    example: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number for pagination',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page',
    example: 10,
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description:
      'Search term to filter users by email, first name, last name, or phone',
    example: 'john',
  })
  @ApiQuery({
    name: 'role',
    required: false,
    type: String,
    description:
      'Filter users by role (ADMIN, SUB_ADMIN, VENDOR, BUYER, RIDER)',
    example: 'BUYER',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated users',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: {
                    type: 'string',
                    example: '123e4567-e89b-12d3-a456-426614174000',
                  },
                  email: { type: 'string', example: 'user@example.com' },
                  firstName: { type: 'string', example: 'John' },
                  lastName: { type: 'string', example: 'Doe' },
                  phone: { type: 'string', example: '+1234567890' },
                  avatar: {
                    type: 'string',
                    example: 'https://example.com/avatar.jpg',
                  },
                  role: { type: 'string', example: 'BUYER' },
                  isActive: { type: 'boolean', example: true },
                  createdAt: {
                    type: 'string',
                    format: 'date-time',
                    example: '2023-01-01T00:00:00Z',
                  },
                  updatedAt: {
                    type: 'string',
                    format: 'date-time',
                    example: '2023-01-01T00:00:00Z',
                  },
                },
              },
            },
            meta: {
              type: 'object',
              properties: {
                page: { type: 'number', example: 1 },
                limit: { type: 'number', example: 10 },
                total: { type: 'number', example: 100 },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Missing or invalid authentication token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions (admin role required)',
  })
  findAll(
    @CurrentUser() user: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('status') status?: string,
  ) {
    return this.usersService.findAll(user.id, {
      page: page || 1,
      limit: limit || 10,
      search,
      role,
      status,
    });
  }

  @Get('dashboard/customers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.VENDOR, UserRole.SUB_ADMIN)
  @ApiOperation({
    summary: 'Get customers for dashboard (Admin, Vendor, Sub-Admin)',
    description: 'Retrieve customers matching the user\'s role and scope.',
  })
  findDashboardCustomers(
    @CurrentUser() user: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    return this.usersService.findDashboardCustomers(user.id, {
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 50,
      search,
    });
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Update current user profile',
    description:
      'Update the profile information of the currently authenticated user',
  })
  @ApiHeader({
    name: 'Authorization',
    description: 'Bearer token for authentication',
    required: true,
    example: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @ApiBody({
    description: 'Profile update data',
    examples: {
      basic: {
        summary: 'Basic profile update',
        value: {
          bio: 'I love shopping for tech gadgets!',
          gender: 'MALE',
          birthDate: '1990-01-01',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid input data' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Missing or invalid authentication token',
  })
  updateProfile(
    @CurrentUser() user,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(user.id, updateProfileDto);
  }

  @Post('change-password')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Change user password' })
  @ApiBody({ type: ChangePasswordDto })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request - Incorrect current password or invalid new password' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async changePassword(
    @CurrentUser() user,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(user.id, changePasswordDto);
  }


  @Get('settings')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get user settings',
    description:
      'Get the settings/preferences of the currently authenticated user',
  })
  @ApiHeader({
    name: 'Authorization',
    description: 'Bearer token for authentication',
    required: true,
    example: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @ApiResponse({
    status: 200,
    description: 'User settings retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Missing or invalid authentication token',
  })
  getSettings(@CurrentUser() user) {
    return this.usersService.getSettings(user.id);
  }

  @Patch('settings')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Update user settings',
    description:
      'Update the settings/preferences of the currently authenticated user',
  })
  @ApiHeader({
    name: 'Authorization',
    description: 'Bearer token for authentication',
    required: true,
    example: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @ApiBody({
    description: 'Settings update data',
    examples: {
      notification: {
        summary: 'Update notification settings',
        value: {
          emailNotifications: true,
          pushNotifications: false,
          smsNotifications: false,
        },
      },
      ui: {
        summary: 'Update UI settings',
        value: {
          language: 'en',
          currency: 'USD',
          darkMode: true,
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Settings updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid input data' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Missing or invalid authentication token',
  })
  updateSettings(
    @CurrentUser() user,
    @Body() updateSettingsDto: UpdateSettingsDto,
  ) {
    return this.usersService.updateSettings(user.id, updateSettingsDto);
  }

  @Get('addresses')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('BUYER', 'VENDOR', 'ADMIN', 'SUB_ADMIN', 'RIDER')
  @ApiOperation({
    summary: 'Get user addresses',
    description:
      'Retrieve all addresses associated with a specific user (Admin only) or the current user',
  })
  @ApiHeader({
    name: 'Authorization',
    description: 'Bearer token for authentication',
    required: true,
    example: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @ApiQuery({ name: 'userId', required: false, description: 'User ID to fetch addresses for (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Returns user addresses',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Missing or invalid authentication token',
  })
  getAddresses(@CurrentUser() user, @Query('userId') userId?: string) {
    const targetUserId = user.role === 'ADMIN' && userId ? userId : user.id;
    return this.usersService.getAddresses(targetUserId);
  }

  @Post('addresses')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('BUYER', 'VENDOR', 'ADMIN', 'RIDER')
  @ApiOperation({
    summary: 'Create a new address',
    description:
      "Add a new address to a specific user's address book (Admin only) or the current user's",
  })
  @ApiHeader({
    name: 'Authorization',
    description: 'Bearer token for authentication',
    required: true,
    example: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @ApiQuery({ name: 'userId', required: false, description: 'User ID to create address for (Admin only)' })
  // ... (ApiBody and ApiResponse omitted)
  @ApiResponse({ status: 201, description: 'Address created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid input data' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Missing or invalid authentication token',
  })
  createAddress(
    @CurrentUser() user,
    @Body() createAddressDto: CreateAddressDto,
    @Query('userId') userId?: string,
  ) {
    const targetUserId = user.role === 'ADMIN' && userId ? userId : user.id;
    return this.usersService.createAddress(targetUserId, createAddressDto);
  }

  @Patch('addresses/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('BUYER', 'VENDOR', 'ADMIN', 'RIDER')
  @ApiOperation({
    summary: 'Update an address',
    description:
      "Update an existing address in a specific user's address book (Admin only) or the current user's",
  })
  @ApiHeader({
    name: 'Authorization',
    description: 'Bearer token for authentication',
    required: true,
    example: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @ApiParam({
    name: 'id',
    description: 'Unique identifier of the address',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiQuery({ name: 'userId', required: false, description: 'User ID of the address owner (Admin only)' })
  // ... (ApiBody and ApiResponse omitted)
  @ApiResponse({ status: 200, description: 'Address updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid input data' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Missing or invalid authentication token',
  })
  @ApiResponse({ status: 404, description: 'Address not found' })
  updateAddress(
    @CurrentUser() user,
    @Param('id') id: string,
    @Body() updateAddressDto: UpdateAddressDto,
    @Query('userId') userId?: string,
  ) {
    const targetUserId = user.role === 'ADMIN' && userId ? userId : user.id;
    return this.usersService.updateAddress(targetUserId, id, updateAddressDto);
  }

  @Delete('addresses/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('BUYER', 'VENDOR', 'ADMIN', 'RIDER')
  @ApiOperation({
    summary: 'Delete an address',
    description:
      "Remove an address from a specific user's address book (Admin only) or the current user's",
  })
  @ApiHeader({
    name: 'Authorization',
    description: 'Bearer token for authentication',
    required: true,
    example: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @ApiParam({
    name: 'id',
    description: 'Unique identifier of the address',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiQuery({ name: 'userId', required: false, description: 'User ID of the address owner (Admin only)' })
  @ApiResponse({ status: 200, description: 'Address deleted successfully' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Missing or invalid authentication token',
  })
  @ApiResponse({ status: 404, description: 'Address not found' })
  removeAddress(
    @CurrentUser() user,
    @Param('id') id: string,
    @Query('userId') userId?: string,
  ) {
    const targetUserId = user.role === 'ADMIN' && userId ? userId : user.id;
    return this.usersService.removeAddress(targetUserId, id);
  }

  @Post('shipping-addresses')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('BUYER', 'VENDOR', 'ADMIN', 'RIDER')
  @ApiOperation({
    summary: 'Create a new shipping address',
  })
  @ApiBody({ type: CreateShippingAddressDto })
  @ApiQuery({ name: 'userId', required: false, description: 'User ID to create shipping address for (Admin only)' })
  @ApiResponse({ status: 201, description: 'Shipping address created' })
  @ApiResponse({ status: 409, description: 'Address already exists' })
  createShippingAddress(
    @CurrentUser() user: any,
    @Body() createShippingAddressDto: CreateShippingAddressDto,
    @Query('userId') userId?: string,
  ) {
    const targetUserId = user.role === 'ADMIN' && userId ? userId : user.id;
    return this.usersService.createShippingAddress(
      targetUserId,
      createShippingAddressDto,
    );
  }

  @Get('shipping-addresses')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('BUYER', 'VENDOR', 'ADMIN', 'RIDER')
  @ApiOperation({
    summary: 'Get all saved shipping addresses',
  })
  @ApiQuery({ name: 'type', enum: AddressType, required: false })
  @ApiQuery({ name: 'shared', type: Boolean, required: false })
  @ApiQuery({ name: 'userId', required: false, description: 'User ID to fetch shipping addresses for (Admin only)' })
  @ApiResponse({ status: 200, description: 'List of shipping addresses' })
  getShippingAddresses(
    @CurrentUser() user: any,
    @Query('type') type?: AddressType,
    @Query('shared') shared?: boolean,
    @Query('userId') userId?: string,
  ) {
    const targetUserId = user.role === 'ADMIN' && userId ? userId : user.id;
    return this.usersService.getShippingAddresses(targetUserId, type, shared);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUB_ADMIN)
  @ApiOperation({
    summary: 'Get a user by ID (admin only)',
    description:
      'Retrieve detailed information about a specific user by their ID. Only accessible by administrators.',
  })
  @ApiHeader({
    name: 'Authorization',
    description: 'Bearer token for authentication',
    required: true,
    example: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @ApiParam({
    name: 'id',
    description: 'Unique identifier of the user',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the user',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: '123e4567-e89b-12d3-a456-426614174000',
            },
            email: { type: 'string', example: 'user@example.com' },
            firstName: { type: 'string', example: 'John' },
            lastName: { type: 'string', example: 'Doe' },
            phone: { type: 'string', example: '+1234567890' },
            avatar: {
              type: 'string',
              example: 'https://example.com/avatar.jpg',
            },
            role: { type: 'string', example: 'BUYER' },
            isActive: { type: 'boolean', example: true },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2023-01-01T00:00:00Z',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              example: '2023-01-01T00:00:00Z',
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Missing or invalid authentication token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions (admin role required)',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Get('shipping-addresses/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('BUYER', 'VENDOR', 'ADMIN', 'RIDER')
  @ApiOperation({ summary: 'Get a specific shipping address' })
  @ApiParam({ name: 'id', description: 'Address ID' })
  @ApiQuery({ name: 'userId', required: false, description: 'User ID of the address owner (Admin only)' })
  @ApiResponse({ status: 200, description: 'Shipping address details' })
  @ApiResponse({ status: 404, description: 'Shipping address not found' })
  getShippingAddress(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Query('userId') userId?: string,
  ) {
    const targetUserId = user.role === 'ADMIN' && userId ? userId : user.id;
    return this.usersService.getShippingAddress(targetUserId, id);
  }

  @Patch('shipping-addresses/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('BUYER', 'VENDOR', 'ADMIN', 'RIDER')
  @ApiOperation({
    summary: 'Update a shipping address',
  })
  @ApiParam({ name: 'id', description: 'Address ID' })
  @ApiBody({ type: UpdateShippingAddressDto })
  @ApiQuery({ name: 'userId', required: false, description: 'User ID of the address owner (Admin only)' })
  @ApiResponse({ status: 200, description: 'Shipping address updated' })
  @ApiResponse({ status: 404, description: 'Shipping address not found' })
  @ApiResponse({ status: 409, description: 'Address conflict' })
  updateShippingAddress(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() updateShippingAddressDto: UpdateShippingAddressDto,
    @Query('userId') userId?: string,
  ) {
    const targetUserId = user.role === 'ADMIN' && userId ? userId : user.id;
    return this.usersService.updateShippingAddress(
      targetUserId,
      id,
      updateShippingAddressDto,
    );
  }

  @Delete('shipping-addresses/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('BUYER', 'VENDOR', 'ADMIN', 'RIDER')
  @ApiOperation({ summary: 'Delete a shipping address' })
  @ApiParam({ name: 'id', description: 'Address ID' })
  @ApiQuery({ name: 'userId', required: false, description: 'User ID of the address owner (Admin only)' })
  @ApiResponse({ status: 200, description: 'Shipping address deleted' })
  @ApiResponse({ status: 404, description: 'Shipping address not found' })
  deleteShippingAddress(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Query('userId') userId?: string,
  ) {
    const targetUserId = user.role === 'ADMIN' && userId ? userId : user.id;
    return this.usersService.deleteShippingAddress(targetUserId, id);
  }

  @Post('shipping-addresses/:id/share')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('BUYER', 'VENDOR')
  @ApiOperation({ summary: 'Share a shipping address with another user' })
  @ApiParam({ name: 'id', description: 'Address ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        sharedWithId: { type: 'string', description: 'User ID to share with' },
        canEdit: {
          type: 'boolean',
          description: 'Whether shared user can edit',
        },
        expiresAt: {
          type: 'string',
          format: 'date-time',
          description: 'Optional expiration',
        },
      },
      required: ['sharedWithId'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Shipping address shared successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Shipping address or user not found',
  })
  shareShippingAddress(
    @CurrentUser() user: any,
    @Param('id') addressId: string,
    @Body('sharedWithId') sharedWithId: string,
    @Body('canEdit') canEdit: boolean,
    @Body('expiresAt') expiresAt: Date,
  ) {
    return this.usersService.shareShippingAddress(
      user.id,
      addressId,
      sharedWithId,
      canEdit,
      expiresAt,
    );
  }

  @Get('shipping-addresses/:id/usage')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('BUYER', 'VENDOR')
  @ApiOperation({ summary: 'Get usage history of a shipping address' })
  @ApiParam({ name: 'id', description: 'Address ID' })
  @ApiResponse({
    status: 200,
    description: 'Usage history of the shipping address',
  })
  @ApiResponse({ status: 404, description: 'Shipping address not found' })
  getShippingAddressUsage(@CurrentUser() user: any, @Param('id') id: string) {
    return this.usersService.getShippingAddressUsage(user.id, id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUB_ADMIN)
  @ApiOperation({
    summary: 'Update a user (admin only)',
    description:
      'Update information for a specific user by their ID. Only accessible by administrators.',
  })
  @ApiHeader({
    name: 'Authorization',
    description: 'Bearer token for authentication',
    required: true,
    example: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @ApiParam({
    name: 'id',
    description: 'Unique identifier of the user',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({
    description: 'User update data',
    examples: {
      basic: {
        summary: 'Update user details',
        value: {
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane.smith@example.com',
          phone: '+1987654321',
          isActive: true,
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid input data' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Missing or invalid authentication token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions (admin role required)',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

}
