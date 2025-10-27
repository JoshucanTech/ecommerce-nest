import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, ConsoleLogger, LogLevel } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { EnhancedLoggingInterceptor } from './interceptors/enhanced-logging.interceptor';
import { DetailedExceptionFilter } from './exceptions/detailed-exception.filter';
import { ValidationExceptionFilter } from './exceptions/validation-exception.filter';

async function bootstrap() {
  // Set log levels for more detailed logging
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug', 'verbose'] as LogLevel[],
  });

  const configService = app.get(ConfigService);

  // Enable CORS with proper configuration for credentials
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:2000',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:2000',
      'https://staging-mkthub.vercel.app/',
      // For Render deployment
      /\.onrender\.com$/,
    ],
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Accept, Authorization, x-anonymous-id',
    exposedHeaders: 'Authorization, x-anonymous-id',
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Use our exception filters
  app.useGlobalFilters(
    new ValidationExceptionFilter(), // Handle validation errors first
    new DetailedExceptionFilter(), // Handle all other errors
  );

  // Use our enhanced logging interceptor
  app.useGlobalInterceptors(new EnhancedLoggingInterceptor());

  // Set global prefix
  app.setGlobalPrefix('api');

  // Swagger documentation setup
  const config = new DocumentBuilder()
    .setTitle('Multi-Vendor E-commerce API')
    .setDescription(
      'API documentation for the Multi-Vendor E-commerce platform',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication endpoints')
    .addTag('users', 'User management endpoints')
    .addTag('products', 'Product management endpoints')
    .addTag('categories', 'Category management endpoints')
    .addTag('vendors', 'Vendor management endpoints')
    .addTag('riders', 'Rider management endpoints')
    .addTag('orders', 'Order management endpoints')
    .addTag('deliveries', 'Delivery management endpoints')
    .addTag('payments', 'Payment management endpoints')
    .addTag('notifications', 'Notification management endpoints')
    .addTag('cart', 'Shopping cart endpoints')
    .addTag('wishlist', 'Wishlist endpoints')
    .addTag('reviews', 'Product reviews endpoints')
    .addTag('comments', 'Product comments endpoints')
    .addTag('flash-sales', 'Flash sales endpoints')
    .addTag('locations', 'Location management endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  // Use PORT environment variable provided by Render, with fallback to 3000
  const port = parseInt(process.env.PORT, 10) || 3000;
  // Bind to all interfaces (0.0.0.0) instead of localhost only for Render compatibility
  await app.listen(port, '0.0.0.0');
  console.log(`Application is running on: http://0.0.0.0:${port}`);
  console.log(
    `Swagger documentation available at: http://0.0.0.0:${port}/api/docs`,
  );
}
bootstrap();
