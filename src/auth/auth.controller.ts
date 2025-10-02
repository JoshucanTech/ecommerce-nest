// backend/src/auth/auth.controller.ts
import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Get,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiHeader,
  ApiProperty,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UserTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Public()
  @ApiOperation({
    summary: 'Register a new user now',
    description:
      'Create a new user account with email and password. The user will be assigned the BUYER role by default unless specified otherwise.',
  })
  @ApiBody({
    description: 'User registration data',
    type: RegisterDto,
    examples: {
      buyer: {
        summary: 'Register as a buyer',
        value: {
          email: 'john.doe@example.com',
          password: 'Password123!',
          firstName: 'John',
          lastName: 'Doe',
          phone: '+1234567890',
        },
      },
      vendor: {
        summary: 'Register as a vendor',
        value: {
          email: 'vendor@example.com',
          password: 'VendorPass123!',
          firstName: 'Jane',
          lastName: 'Smith',
          phone: '+1987654321',
          role: 'VENDOR',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  example: '123e4567-e89b-12d3-a456-426614174000',
                },
                email: { type: 'string', example: 'john.doe@example.com' },
                firstName: { type: 'string', example: 'John' },
                lastName: { type: 'string', example: 'Doe' },
                phone: { type: 'string', example: '+1234567890' },
                avatar: {
                  type: 'string',
                  example: 'https://example.com/avatar.jpg',
                },
                role: { type: 'string', example: 'BUYER' },
                isActive: { type: 'boolean', example: true },
                emailVerified: { type: 'boolean', example: false },
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
            accessToken: {
              type: 'string',
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            },
            refreshToken: {
              type: 'string',
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid input data' })
  @ApiResponse({ status: 409, description: 'Conflict - Email already exists' })
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Login a user',
    description:
      'Authenticate a user with email and password to obtain access and refresh tokens.',
  })
  @ApiBody({
    description: 'User login credentials',
    type: LoginDto,
    examples: {
      basic: {
        summary: 'Basic login',
        value: {
          email: 'john.doe@example.com',
          password: 'Password123!',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'User logged in successfully',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  example: '123e4567-e89b-12d3-a456-426614174000',
                },
                email: { type: 'string', example: 'john.doe@example.com' },
                firstName: { type: 'string', example: 'John' },
                lastName: { type: 'string', example: 'Doe' },
                phone: { type: 'string', example: '+1234567890' },
                avatar: {
                  type: 'string',
                  example: 'https://example.com/avatar.jpg',
                },
                role: { type: 'string', example: 'BUYER' },
                isActive: { type: 'boolean', example: true },
                emailVerified: { type: 'boolean', example: true },
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
            accessToken: {
              type: 'string',
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            },
            refreshToken: {
              type: 'string',
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid credentials',
  })
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Refresh access token',
    description:
      'Obtain a new access token using a valid refresh token. This extends the user session without requiring re-authentication.',
  })
  @ApiHeader({
    name: 'Authorization',
    description: 'Bearer token for authentication',
    required: true,
    example: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @ApiBody({
    description: 'Refresh token',
    type: UserTokenDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Token refreshed successfully',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            accessToken: {
              type: 'string',
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            },
            refreshToken: {
              type: 'string',
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid refresh token',
  })
  refreshToken(@CurrentUser() user, @Body() userTokenDto: UserTokenDto) {
    return this.authService.refreshToken(userTokenDto, user);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get current user profile',
    description:
      'Retrieve the profile information of the currently authenticated user, including associated data like addresses, settings, and role-specific information.',
  })
  @ApiHeader({
    name: 'Authorization',
    description: 'Bearer token for authentication',
    required: true,
    example: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the current user profile',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: '123e4567-e89b-12d3-a456-426614174000',
            },
            email: { type: 'string', example: 'john.doe@example.com' },
            firstName: { type: 'string', example: 'John' },
            lastName: { type: 'string', example: 'Doe' },
            phone: { type: 'string', example: '+1234567890' },
            avatar: {
              type: 'string',
              example: 'https://example.com/avatar.jpg',
            },
            role: { type: 'string', example: 'BUYER' },
            isActive: { type: 'boolean', example: true },
            emailVerified: { type: 'boolean', example: true },
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
            profile: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  example: '123e4567-e89b-12d3-a456-426614174001',
                },
                bio: { type: 'string', example: 'Tech enthusiast' },
                avatar: {
                  type: 'string',
                  example: 'https://example.com/avatar.jpg',
                },
                gender: { type: 'string', example: 'MALE' },
                birthDate: {
                  type: 'string',
                  format: 'date',
                  example: '1990-01-01',
                },
                userId: {
                  type: 'string',
                  example: '123e4567-e89b-12d3-a456-426614174000',
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
            addresses: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: {
                    type: 'string',
                    example: '123e4567-e89b-12d3-a456-426614174002',
                  },
                  street: { type: 'string', example: '123 Main St' },
                  city: { type: 'string', example: 'New York' },
                  state: { type: 'string', example: 'NY' },
                  postalCode: { type: 'string', example: '10001' },
                  country: { type: 'string', example: 'USA' },
                  isDefault: { type: 'boolean', example: true },
                  userId: {
                    type: 'string',
                    example: '123e4567-e89b-12d3-a456-426614174000',
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
            settings: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  example: '123e4567-e89b-12d3-a456-426614174003',
                },
                language: { type: 'string', example: 'en' },
                currency: { type: 'string', example: 'USD' },
                darkMode: { type: 'boolean', example: false },
                emailNotifications: { type: 'boolean', example: true },
                pushNotifications: { type: 'boolean', example: true },
                smsNotifications: { type: 'boolean', example: false },
                userId: {
                  type: 'string',
                  example: '123e4567-e89b-12d3-a456-426614174000',
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
            vendor: {
              type: 'object',
              nullable: true,
              properties: {
                id: {
                  type: 'string',
                  example: '123e4567-e89b-12d3-a456-426614174004',
                },
                businessName: { type: 'string', example: 'Tech Store' },
                slug: { type: 'string', example: 'tech-store' },
                isVerified: { type: 'boolean', example: true },
              },
            },
            rider: {
              type: 'object',
              nullable: true,
              properties: {
                id: {
                  type: 'string',
                  example: '123e4567-e89b-12d3-a456-426614174005',
                },
                isVerified: { type: 'boolean', example: true },
                isAvailable: { type: 'boolean', example: true },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getProfile(@CurrentUser() user) {
    return this.authService.getProfile(user.id);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Logout a user',
    description:
      'Invalidate the refresh token for the currently authenticated user, effectively logging them out of the application.',
  })
  @ApiHeader({
    name: 'Authorization',
    description: 'Bearer token for authentication',
    required: true,
    example: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @ApiBody({
    description: 'Refresh token to invalidate',
    schema: {
      type: 'object',
      properties: {
        refreshToken: {
          type: 'string',
          example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'User logged out successfully',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Logged out successfully' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  logout(@CurrentUser() user, @Body() body: { refreshToken: string }) {
    return this.authService.logout(user.id, body.refreshToken);
  }

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  @Public()
  @ApiOperation({
    summary: 'Login with Google',
    description:
      'Initiate the Google OAuth2 authentication flow. This endpoint redirects the user to Google for authentication.',
  })
  @ApiResponse({
    status: 302,
    description: 'Redirects to Google for authentication',
  })
  googleAuth() {
    // initiates the Google OAuth2 login flow
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({
    summary: 'Google OAuth2 callback',
    description:
      'Handle the callback from Google OAuth2 authentication and return access and refresh tokens.',
  })
  @ApiResponse({
    status: 200,
    description: "Returns the user's access and refresh tokens",
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  example: '123e4567-e89b-12d3-a456-426614174000',
                },
                email: { type: 'string', example: 'john.doe@gmail.com' },
                firstName: { type: 'string', example: 'John' },
                lastName: { type: 'string', example: 'Doe' },
                phone: { type: 'string', example: null },
                avatar: {
                  type: 'string',
                  example: 'https://lh3.googleusercontent.com/...',
                },
                role: { type: 'string', example: 'BUYER' },
                isActive: { type: 'boolean', example: true },
                emailVerified: { type: 'boolean', example: true },
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
            accessToken: {
              type: 'string',
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            },
            refreshToken: {
              type: 'string',
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  googleAuthRedirect(@Req() req) {
    return this.authService.login(req.user);
  }
}
