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
import { Prisma } from '@prisma/client';
import { CreateShippingAddressDto } from './dto/create-shipping-address.dto';
import { UpdateShippingAddressDto } from './dto/update-shipping-address.dto';
import { AddressType } from './enums/address-type.enum';

@ApiTags('users')
@Controller('users')
// @ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
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
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('role') role?: string,
  ) {
    return this.usersService.findAll({
      page: page || 1,
      limit: limit || 10,
      search,
      role,
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
      'Retrieve all addresses associated with the currently authenticated user',
  })
  @ApiHeader({
    name: 'Authorization',
    description: 'Bearer token for authentication',
    required: true,
    example: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns user addresses',
    content: {
      'application/json': {
        schema: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                example: '123e4567-e89b-12d3-a456-426614174000',
              },
              street: { type: 'string', example: '123 Main St' },
              city: { type: 'string', example: 'New York' },
              state: { type: 'string', example: 'NY' },
              postalCode: { type: 'string', example: '10001' },
              country: { type: 'string', example: 'USA' },
              isDefault: { type: 'boolean', example: true },
              userId: {
                type: 'string',
                example: '123e4567-e89b-12d3-a456-426614174001',
              },
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
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Missing or invalid authentication token',
  })
  getAddresses(@CurrentUser() user) {
    return this.usersService.getAddresses(user.id);
  }

  @Post('addresses')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Create a new address',
    description:
      "Add a new address to the currently authenticated user's address book",
  })
  @ApiHeader({
    name: 'Authorization',
    description: 'Bearer token for authentication',
    required: true,
    example: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @ApiBody({
    description: 'Address creation data',
    examples: {
      basic: {
        summary: 'Basic address',
        value: {
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          postalCode: '10001',
          country: 'USA',
          isDefault: false,
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Address created successfully',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: '123e4567-e89b-12d3-a456-426614174000',
            },
            street: { type: 'string', example: '123 Main St' },
            city: { type: 'string', example: 'New York' },
            state: { type: 'string', example: 'NY' },
            postalCode: { type: 'string', example: '10001' },
            country: { type: 'string', example: 'USA' },
            isDefault: { type: 'boolean', example: false },
            userId: {
              type: 'string',
              example: '123e4567-e89b-12d3-a456-426614174001',
            },
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
  @ApiResponse({ status: 400, description: 'Bad request - Invalid input data' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Missing or invalid authentication token',
  })
  createAddress(
    @CurrentUser() user,
    @Body() createAddressDto: CreateAddressDto,
  ) {
    return this.usersService.createAddress(user.id, createAddressDto);
  }

  @Patch('addresses/:id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Update an address',
    description:
      "Update an existing address in the currently authenticated user's address book",
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
  @ApiBody({
    description: 'Address update data',
    examples: {
      update: {
        summary: 'Update address details',
        value: {
          street: '456 Oak Ave',
          city: 'Los Angeles',
          state: 'CA',
          postalCode: '90210',
          isDefault: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Address updated successfully',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: '123e4567-e89b-12d3-a456-426614174000',
            },
            street: { type: 'string', example: '456 Oak Ave' },
            city: { type: 'string', example: 'Los Angeles' },
            state: { type: 'string', example: 'CA' },
            postalCode: { type: 'string', example: '90210' },
            country: { type: 'string', example: 'USA' },
            isDefault: { type: 'boolean', example: true },
            userId: {
              type: 'string',
              example: '123e4567-e89b-12d3-a456-426614174001',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2023-01-01T00:00:00Z',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              example: '2023-01-02T00:00:00Z',
            },
          },
        },
      },
    },
  })
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
  ) {
    return this.usersService.updateAddress(user.id, id, updateAddressDto);
  }

  @Delete('addresses/:id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Delete an address',
    description:
      "Remove an address from the currently authenticated user's address book",
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
  @ApiResponse({ status: 200, description: 'Address deleted successfully' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Missing or invalid authentication token',
  })
  @ApiResponse({ status: 404, description: 'Address not found' })
  removeAddress(@CurrentUser() user, @Param('id') id: string) {
    return this.usersService.removeAddress(user.id, id);
  }

  @Post('shipping-addresses')
  @UseGuards(JwtAuthGuard)
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('BUYER', 'VENDOR')
  @ApiOperation({
    summary: 'Create a new shipping address with Amazon-level features',
  })
  @ApiBody({ type: CreateShippingAddressDto })
  @ApiResponse({ status: 201, description: 'Shipping address created' })
  @ApiResponse({ status: 409, description: 'Address already exists' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  createShippingAddress(
    @CurrentUser() user: any,
    @Body() createShippingAddressDto: CreateShippingAddressDto,
  ) {
    return this.usersService.createShippingAddress(
      user.id,
      createShippingAddressDto,
    );
  }

  @Get('shipping-addresses')
  // @UseGuards(JwtAuthGuard)
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('BUYER', 'VENDOR')
  @ApiOperation({
    summary: 'Get all saved shipping addresses with Amazon-level filtering',
  })
  @ApiQuery({ name: 'type', enum: AddressType, required: false })
  @ApiQuery({ name: 'shared', type: Boolean, required: false })
  @ApiResponse({ status: 200, description: 'List of shipping addresses' })
  getShippingAddresses(
    @CurrentUser() user: any,
    @Query('type') type?: AddressType,
    @Query('shared') shared?: boolean,
  ) {
    return this.usersService.getShippingAddresses(user.id, type, shared);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
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
  @UseGuards(JwtAuthGuard)
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('BUYER', 'VENDOR')
  @ApiOperation({ summary: 'Get a specific shipping address' })
  @ApiParam({ name: 'id', description: 'Address ID' })
  @ApiResponse({ status: 200, description: 'Shipping address details' })
  @ApiResponse({ status: 404, description: 'Shipping address not found' })
  getShippingAddress(@CurrentUser() user: any, @Param('id') id: string) {
    return this.usersService.getShippingAddress(user.id, id);
  }

  @Patch('shipping-addresses/:id')
  @UseGuards(JwtAuthGuard)
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('BUYER', 'VENDOR')
  @ApiOperation({
    summary: 'Update a shipping address with Amazon-level features',
  })
  @ApiParam({ name: 'id', description: 'Address ID' })
  @ApiBody({ type: UpdateShippingAddressDto })
  @ApiResponse({ status: 200, description: 'Shipping address updated' })
  @ApiResponse({ status: 404, description: 'Shipping address not found' })
  @ApiResponse({ status: 409, description: 'Address conflict' })
  updateShippingAddress(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() updateShippingAddressDto: UpdateShippingAddressDto,
  ) {
    return this.usersService.updateShippingAddress(
      user.id,
      id,
      updateShippingAddressDto,
    );
  }

  @Delete('shipping-addresses/:id')
  @UseGuards(JwtAuthGuard)
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('BUYER', 'VENDOR')
  @ApiOperation({ summary: 'Delete a shipping address' })
  @ApiParam({ name: 'id', description: 'Address ID' })
  @ApiResponse({ status: 200, description: 'Shipping address deleted' })
  @ApiResponse({ status: 404, description: 'Shipping address not found' })
  deleteShippingAddress(@CurrentUser() user: any, @Param('id') id: string) {
    return this.usersService.deleteShippingAddress(user.id, id);
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
  @Roles('ADMIN')
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
