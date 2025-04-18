import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from "@nestjs/common"
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth, ApiOkResponse } from "@nestjs/swagger"
import { CategoriesService } from "./categories.service"
import  { CreateCategoryDto } from "./dto/create-category.dto"
import  { UpdateCategoryDto } from "./dto/update-category.dto"
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard"
import { RolesGuard } from "../auth/guards/roles.guard"
import { Roles } from "../auth/decorators/roles.decorator"
import { Public } from "../auth/decorators/public.decorator"
import { CurrentUser } from "src/auth/decorators/current-user.decorator"

@ApiTags("categories")
@Controller("categories")
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

@Post()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth()
@ApiOperation({ summary: 'Create a new category' })
@ApiResponse({ status: 201, description: 'Category created successfully' })
@ApiResponse({ status: 400, description: 'Bad request' })
@ApiResponse({ status: 401, description: 'Unauthorized' })
@ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
@ApiOkResponse({ type: CreateCategoryDto })

create(@CurrentUser() user, @Body() createCategoryDto: CreateCategoryDto) {
  return this.categoriesService.create(user.id, createCategoryDto);
}

  @Get()
  @Public()
  @ApiOperation({ summary: "Get all categories" })
  @ApiResponse({ status: 200, description: "Returns all categories" })
  @ApiOkResponse({ type: [CreateCategoryDto] })

  findAll() {
    return this.categoriesService.findAll()
  }

  @Get(':id')
@Public()
@ApiOperation({ summary: 'Get a category by ID or slug' })
@ApiParam({ name: 'id', description: 'Category ID or slug' })
@ApiResponse({ status: 200, description: 'Returns the category' })
@ApiResponse({ status: 404, description: 'Category not found' })
findOne(@Param('id') id: string) {
  return this.categoriesService.findOne(id);
}

  @Patch(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update a category" })
  @ApiParam({ name: "id", description: "Category ID" })
  @ApiResponse({ status: 200, description: "Category updated successfully" })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - Insufficient permissions" })
  @ApiResponse({ status: 404, description: "Category not found" })
  update(@Param('id') id: string, @Body() updateCategoryDto: UpdateCategoryDto) {
    return this.categoriesService.update(id, updateCategoryDto)
  }

  @Delete(':id')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth()
@ApiOperation({ summary: 'Delete a category' })
@ApiParam({ name: 'id', description: 'Category ID' })
@ApiResponse({ status: 200, description: 'Category deleted successfully' })
@ApiResponse({ status: 401, description: 'Unauthorized' })
@ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
@ApiResponse({ status: 404, description: 'Category not found' })
remove(@Param('id') id: string) {
  return this.categoriesService.remove(id);
}
}
