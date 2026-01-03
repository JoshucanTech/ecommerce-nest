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
import { CreateVendorApplicationDto } from './dto/create-vendor-application.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';
import { UpdateVendorApplicationDto } from './dto/update-vendor-application.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('vendors')
@Controller('vendors')
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) { }

  @Get('dashboard/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('VENDOR')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get vendor dashboard statistics' })
  @ApiResponse({
    status: 200,
    description: 'Returns filtered dashboard statistics including sales, orders, and customer counts'
  })
  getDashboardStats(@CurrentUser() user) {
    return this.vendorsService.getDashboardStats(user.id);
  }

  @Post('apply')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Apply to become a vendor',
    description:
      'Submit a vendor application to become a seller on the platform. Users can only have one application at a time.',
  })
  @ApiHeader({
    name: 'Authorization',
    description: 'Bearer token for authentication',
    required: true,
    example: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @ApiBody({
    description: 'Vendor application data',
    type: CreateVendorApplicationDto,
    examples: {
      basic: {
        summary: 'Basic vendor application',
        value: {
          userId: '123e4567-e89b-12d3-a456-426614174000',
          businessName: 'Tech Gadgets Store',
          businessEmail: 'contact@techgadgets.com',
          businessPhone: '+1234567890',
          businessAddress: {
            street: '123 Business St',
            city: 'New York',
            state: 'NY',
            postalCode: '10001',
            country: 'USA',
          },
          businessLogo: 'https://example.com/logo.jpg',
          description: 'We sell high-quality tech gadgets and accessories.',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Application submitted successfully',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: '123e4567-e89b-12d3-a456-426614174000',
            },
            userId: {
              type: 'string',
              example: '123e4567-e89b-12d3-a456-426614174001',
            },
            businessName: { type: 'string', example: 'Tech Gadgets Store' },
            businessEmail: {
              type: 'string',
              example: 'contact@techgadgets.com',
            },
            businessPhone: { type: 'string', example: '+1234567890' },
            businessLogo: {
              type: 'string',
              example: 'https://example.com/logo.jpg',
            },
            description: {
              type: 'string',
              example: 'We sell high-quality tech gadgets and accessories.',
            },
            status: { type: 'string', example: 'PENDING' },
            documents: {
              type: 'array',
              items: { type: 'string' },
              example: [
                'https://example.com/doc1.pdf',
                'https://example.com/doc2.pdf',
              ],
            },
            businessAddress: {
              type: 'object',
              properties: {
                street: { type: 'string', example: '123 Business St' },
                city: { type: 'string', example: 'New York' },
                state: { type: 'string', example: 'NY' },
                postalCode: { type: 'string', example: '10001' },
                country: { type: 'string', example: 'USA' },
              },
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
  @ApiResponse({
    status: 409,
    description: 'Conflict - User already has an application or is a vendor',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            statusCode: { type: 'number', example: 409 },
            message: {
              type: 'string',
              example: 'User already has a vendor application',
            },
            error: { type: 'string', example: 'Conflict' },
          },
        },
      },
    },
  })
  apply(
    @Body() createVendorApplicationDto: CreateVendorApplicationDto,
    @CurrentUser() user,
  ) {
    return this.vendorsService.apply(createVendorApplicationDto, user.id);
  }

  @Get('applications')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get all vendor applications (admin only)',
    description:
      'Retrieve a paginated list of vendor applications. Only accessible by administrators.',
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
    name: 'status',
    required: false,
    type: String,
    description: 'Filter applications by status (PENDING, APPROVED, REJECTED)',
    example: 'PENDING',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated vendor applications',
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
                  userId: {
                    type: 'string',
                    example: '123e4567-e89b-12d3-a456-426614174001',
                  },
                  businessName: {
                    type: 'string',
                    example: 'Tech Gadgets Store',
                  },
                  businessEmail: {
                    type: 'string',
                    example: 'contact@techgadgets.com',
                  },
                  businessPhone: { type: 'string', example: '+1234567890' },
                  businessLogo: {
                    type: 'string',
                    example: 'https://example.com/logo.jpg',
                  },
                  description: {
                    type: 'string',
                    example:
                      'We sell high-quality tech gadgets and accessories.',
                  },
                  status: { type: 'string', example: 'PENDING' },
                  documents: {
                    type: 'array',
                    items: { type: 'string' },
                    example: [
                      'https://example.com/doc1.pdf',
                      'https://example.com/doc2.pdf',
                    ],
                  },
                  businessAddress: {
                    type: 'object',
                    properties: {
                      street: { type: 'string', example: '123 Business St' },
                      city: { type: 'string', example: 'New York' },
                      state: { type: 'string', example: 'NY' },
                      postalCode: { type: 'string', example: '10001' },
                      country: { type: 'string', example: 'USA' },
                    },
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
                  user: {
                    type: 'object',
                    properties: {
                      id: {
                        type: 'string',
                        example: '123e4567-e89b-12d3-a456-426614174001',
                      },
                      firstName: { type: 'string', example: 'John' },
                      lastName: { type: 'string', example: 'Doe' },
                      email: {
                        type: 'string',
                        example: 'john.doe@example.com',
                      },
                    },
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
  getApplications(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
  ) {
    return this.vendorsService.getApplications({
      page: page || 1,
      limit: limit || 10,
      status,
    });
  }

  @Get('applications/my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Get current user's vendor application",
    description:
      'Retrieve the vendor application submitted by the currently authenticated user.',
  })
  @ApiHeader({
    name: 'Authorization',
    description: 'Bearer token for authentication',
    required: true,
    example: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @ApiResponse({
    status: 200,
    description: "Returns the user's vendor application",
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: '123e4567-e89b-12d3-a456-426614174000',
            },
            userId: {
              type: 'string',
              example: '123e4567-e89b-12d3-a456-426614174001',
            },
            businessName: { type: 'string', example: 'Tech Gadgets Store' },
            businessEmail: {
              type: 'string',
              example: 'contact@techgadgets.com',
            },
            businessPhone: { type: 'string', example: '+1234567890' },
            businessLogo: {
              type: 'string',
              example: 'https://example.com/logo.jpg',
            },
            description: {
              type: 'string',
              example: 'We sell high-quality tech gadgets and accessories.',
            },
            status: { type: 'string', example: 'PENDING' },
            documents: {
              type: 'array',
              items: { type: 'string' },
              example: [
                'https://example.com/doc1.pdf',
                'https://example.com/doc2.pdf',
              ],
            },
            businessAddress: {
              type: 'object',
              properties: {
                street: { type: 'string', example: '123 Business St' },
                city: { type: 'string', example: 'New York' },
                state: { type: 'string', example: 'NY' },
                postalCode: { type: 'string', example: '10001' },
                country: { type: 'string', example: 'USA' },
              },
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
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Missing or invalid authentication token',
  })
  @ApiResponse({ status: 404, description: 'Application not found' })
  getMyApplication(@CurrentUser() user) {
    return this.vendorsService.getApplicationByUserId(user.id);
  }

  @Get('applications/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get a vendor application by ID (admin only)',
    description:
      'Retrieve detailed information about a specific vendor application by its ID. Only accessible by administrators.',
  })
  @ApiHeader({
    name: 'Authorization',
    description: 'Bearer token for authentication',
    required: true,
    example: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @ApiParam({
    name: 'id',
    description: 'Unique identifier of the vendor application',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the vendor application',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: '123e4567-e89b-12d3-a456-426614174000',
            },
            userId: {
              type: 'string',
              example: '123e4567-e89b-12d3-a456-426614174001',
            },
            businessName: { type: 'string', example: 'Tech Gadgets Store' },
            businessEmail: {
              type: 'string',
              example: 'contact@techgadgets.com',
            },
            businessPhone: { type: 'string', example: '+1234567890' },
            businessLogo: {
              type: 'string',
              example: 'https://example.com/logo.jpg',
            },
            description: {
              type: 'string',
              example: 'We sell high-quality tech gadgets and accessories.',
            },
            status: { type: 'string', example: 'PENDING' },
            documents: {
              type: 'array',
              items: { type: 'string' },
              example: [
                'https://example.com/doc1.pdf',
                'https://example.com/doc2.pdf',
              ],
            },
            businessAddress: {
              type: 'object',
              properties: {
                street: { type: 'string', example: '123 Business St' },
                city: { type: 'string', example: 'New York' },
                state: { type: 'string', example: 'NY' },
                postalCode: { type: 'string', example: '10001' },
                country: { type: 'string', example: 'USA' },
              },
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
            user: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  example: '123e4567-e89b-12d3-a456-426614174001',
                },
                firstName: { type: 'string', example: 'John' },
                lastName: { type: 'string', example: 'Doe' },
                email: { type: 'string', example: 'john.doe@example.com' },
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
  @ApiResponse({ status: 404, description: 'Application not found' })
  getApplication(@Param('id') id: string) {
    return this.vendorsService.getApplicationById(id);
  }

  @Patch('applications/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a vendor application (admin only)' })
  @ApiParam({ name: 'id', description: 'Application ID' })
  @ApiResponse({ status: 200, description: 'Application updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Application not found' })
  updateApplication(
    @Param('id') id: string,
    @Body() updateVendorApplicationDto: UpdateVendorApplicationDto,
  ) {
    return this.vendorsService.updateApplication(
      id,
      updateVendorApplicationDto,
    );
  }

  @Post('applications/:id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approve a vendor application (admin only)' })
  @ApiParam({ name: 'id', description: 'Application ID' })
  @ApiResponse({
    status: 200,
    description: 'Application approved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Application not found' })
  approveApplication(@Param('id') id: string) {
    return this.vendorsService.approveApplication(id);
  }

  @Post('applications/:id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reject a vendor application (admin only)' })
  @ApiParam({ name: 'id', description: 'Application ID' })
  @ApiResponse({
    status: 200,
    description: 'Application rejected successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Application not found' })
  rejectApplication(@Param('id') id: string, @Body() body: { notes?: string }) {
    return this.vendorsService.rejectApplication(id, body.notes);
  }

  @Get('featured')
  @Public()
  @ApiOperation({ summary: 'Get featured vendors' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns featured vendors from active advertisements.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'spotlight', required: false, type: Boolean })
  async getFeaturedVendors(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('spotlight') spotlight = false,
  ) {
    return this.vendorsService.getFeaturedVendors({
      page: +page,
      limit: +limit,
      spotlight: spotlight === true,
    });
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all vendors with pagination' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search term',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    type: String,
    description: 'Sort field',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    type: String,
    description: 'Sort order (asc/desc)',
  })
  @ApiResponse({ status: 200, description: 'Returns paginated vendors' })
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
  @ApiOperation({ summary: 'Get a vendor by ID or slug' })
  @ApiParam({ name: 'id', description: 'Vendor ID or slug' })
  @ApiResponse({ status: 200, description: 'Returns the vendor' })
  @ApiResponse({ status: 404, description: 'Vendor not found' })
  findOne(@Param('id') id: string) {
    return this.vendorsService.findOne(id);
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('VENDOR')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update vendor profile' })
  @ApiResponse({
    status: 200,
    description: 'Vendor profile updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Vendor not found' })
  updateProfile(@CurrentUser() user, @Body() updateVendorDto: UpdateVendorDto) {
    return this.vendorsService.updateProfile(user.id, updateVendorDto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
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
}
