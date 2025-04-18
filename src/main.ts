import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, ConsoleLogger } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { ConfigService } from "@nestjs/config";
import { LoggingInterceptor } from './logging.interceptor';


async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  // Enable CORS
  app.enableCors();

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Set global prefix
  app.setGlobalPrefix("api");

  // Swagger documentation setup
  const config = new DocumentBuilder()
    .setTitle("Multi-Vendor E-commerce API")
    .setDescription(
      "API documentation for the Multi-Vendor E-commerce platform",
    )
    .setVersion("1.0")
    .addBearerAuth()
    .addTag("auth", "Authentication endpoints")
    .addTag("users", "User management endpoints")
    .addTag("products", "Product management endpoints")
    .addTag("categories", "Category management endpoints")
    .addTag("vendors", "Vendor management endpoints")
    .addTag("riders", "Rider management endpoints")
    .addTag("orders", "Order management endpoints")
    .addTag("deliveries", "Delivery management endpoints")
    .addTag("payments", "Payment management endpoints")
    .addTag("notifications", "Notification management endpoints")
    .addTag("cart", "Shopping cart endpoints")
    .addTag("wishlist", "Wishlist endpoints")
    .addTag("reviews", "Product reviews endpoints")
    .addTag("comments", "Product comments endpoints")
    .addTag("flash-sales", "Flash sales endpoints")
    .build();

  app.useGlobalInterceptors(new LoggingInterceptor());


  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, document);

  
  const port = configService.get<number>("PORT") || 3000;
  await app.listen(port);
  // await app.listen(process.env.PORT ?? 3000);
  console.log(`Application is running on: http://localhost:${port}`);
  console.log(
    `Swagger documentation available at: http://localhost:${port}/api/docs`,
  );
}
bootstrap();
