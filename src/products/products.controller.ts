import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { ProductsService } from "./products.service";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Public } from "../auth/decorators/public.decorator";

@ApiTags("products")
@Controller("products")
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("VENDOR", "ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create a new product" })
  @ApiResponse({ status: 201, description: "Product created successfully" })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Insufficient permissions",
  })
  create(@Body() createProductDto: CreateProductDto, @CurrentUser() user) {
    return this.productsService.create(createProductDto, user.id);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: "Get all products with filtering and pagination" })
  @ApiQuery({
    name: "page",
    required: false,
    type: Number,
    description: "Page number",
  })
  @ApiQuery({
    name: "limit",
    required: false,
    type: Number,
    description: "Items per page",
  })
  @ApiQuery({
    name: "search",
    required: false,
    type: String,
    description: "Search term",
  })
  @ApiQuery({
    name: "category",
    required: false,
    type: String,
    description: "Category ID or slug",
  })
  @ApiQuery({
    name: "vendor",
    required: false,
    type: String,
    description: "Vendor ID or slug",
  })
  @ApiQuery({
    name: "minPrice",
    required: false,
    type: Number,
    description: "Minimum price",
  })
  @ApiQuery({
    name: "maxPrice",
    required: false,
    type: Number,
    description: "Maximum price",
  })
  @ApiQuery({
    name: "sortBy",
    required: false,
    type: String,
    description: "Sort field",
  })
  @ApiQuery({
    name: "sortOrder",
    required: false,
    type: String,
    description: "Sort order (asc/desc)",
  })
  @ApiResponse({ status: 200, description: "Returns paginated products" })
  findAll(
    @Query("page") page?: number,
    @Query("limit") limit?: number,
    @Query("search") search?: string,
    @Query("category") category?: string,
    @Query("vendor") vendor?: string,
    @Query("minPrice") minPrice?: number,
    @Query("maxPrice") maxPrice?: number,
    @Query("sortBy") sortBy?: string,
    @Query("sortOrder") sortOrder?: "asc" | "desc",
  ) {
    return this.productsService.findAll({
      page: page || 1,
      limit: limit || 10,
      search,
      category,
      vendor,
      minPrice,
      maxPrice,
      sortBy,
      sortOrder,
    });
  }

  @Get(":id")
  @Public()
  @ApiOperation({ summary: "Get a product by ID or slug" })
  @ApiParam({ name: "id", description: "Product ID or slug" })
  @ApiResponse({ status: 200, description: "Returns the product" })
  @ApiResponse({ status: 404, description: "Product not found" })
  findOne(@Param("id") id: string) {
    return this.productsService.findOne(id);
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("VENDOR", "ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update a product" })
  @ApiParam({ name: "id", description: "Product ID" })
  @ApiResponse({ status: 200, description: "Product updated successfully" })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Insufficient permissions",
  })
  @ApiResponse({ status: 404, description: "Product not found" })
  update(
    @Param("id") id: string,
    @Body() updateProductDto: UpdateProductDto,
    @CurrentUser() user,
  ) {
    return this.productsService.update(id, updateProductDto, user);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("VENDOR", "ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Delete a product" })
  @ApiParam({ name: "id", description: "Product ID" })
  @ApiResponse({ status: 200, description: "Product deleted successfully" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Insufficient permissions",
  })
  @ApiResponse({ status: 404, description: "Product not found" })
  remove(@Param("id") id: string, @CurrentUser() user) {
    return this.productsService.remove(id, user);
  }
}
