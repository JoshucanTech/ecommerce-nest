import { Controller, Get, Post, Body, Delete, HttpStatus } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiTags } from '@nestjs/swagger';
import { Public } from 'src/auth/decorators/public.decorator';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AppException } from './exceptions/app.exception';

@ApiTags('app')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @Public()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  @Public()
  healthCheck() {
    return { status: 'healthy', timestamp: Date.now() };
  }

  // Endpoint to clear application cache (if any)
  @Delete('cache')
  clearCache(): { message: string } {
    // This is where you would implement cache clearing logic
    // depending on what caching mechanism you're using
    return { message: 'Cache cleared successfully' };
  }
}

// Test endpoints for error handling verification
@Controller('test')
export class TestController {
  constructor(private readonly appService: AppService) {}

  @Get('client-error')
  testClientError() {
    throw new BadRequestException('This is a client error for testing');
  }

  @Get('not-found')
  testNotFoundError() {
    throw new NotFoundException('This resource was not found');
  }

  @Get('server-error')
  testServerError() {
    // This will cause a TypeError that should be handled as a server error
    const obj: any = undefined;
    return obj.someProperty; // This will throw "Cannot read properties of undefined"
  }

  @Post('validation-error')
  testValidationError(@Body() body: any) {
    // This endpoint is for testing validation errors
    // The ValidationPipe will automatically throw BadRequestException for invalid data
    return {
      message: 'Validation passed',
      data: body,
    };
  }

  @Get('app-exception')
  testAppException() {
    throw new AppException(
      'This is a custom application exception',
      HttpStatus.BAD_REQUEST,
      { 
        errorCode: 'CUSTOM_ERROR_001',
        additionalInfo: 'This is additional context for debugging' 
      }
    );
  }
}