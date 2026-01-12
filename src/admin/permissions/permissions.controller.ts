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
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiParam,
} from '@nestjs/swagger';
import { PermissionsService } from './permissions.service';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import { FilterPermissionsDto } from './dto/filter-permissions.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@ApiTags('admin/permissions')
@Controller('admin/permissions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth()
export class PermissionsController {
    constructor(private readonly permissionsService: PermissionsService) { }

    @Post()
    @ApiOperation({ summary: 'Create a new permission' })
    @ApiResponse({ status: 201, description: 'Permission created successfully' })
    @ApiResponse({ status: 409, description: 'Permission already exists' })
    create(@Body() createPermissionDto: CreatePermissionDto) {
        return this.permissionsService.create(createPermissionDto);
    }

    @Get()
    @ApiOperation({ summary: 'Get all permissions with filters' })
    @ApiResponse({ status: 200, description: 'Returns paginated permissions' })
    findAll(@Query() filters: FilterPermissionsDto) {
        return this.permissionsService.findAll(filters);
    }

    @Get('resources')
    @ApiOperation({ summary: 'Get all available resource types' })
    @ApiResponse({ status: 200, description: 'Returns list of resources' })
    getResources() {
        return this.permissionsService.getResources();
    }

    @Get('actions')
    @ApiOperation({ summary: 'Get all available action types' })
    @ApiResponse({ status: 200, description: 'Returns list of actions' })
    getActions() {
        return this.permissionsService.getActions();
    }

    @Get('categories')
    @ApiOperation({ summary: 'Get all permission categories' })
    @ApiResponse({ status: 200, description: 'Returns list of categories' })
    getCategories() {
        return this.permissionsService.getCategories();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get permission by ID' })
    @ApiParam({ name: 'id', description: 'Permission ID' })
    @ApiResponse({ status: 200, description: 'Returns permission details' })
    @ApiResponse({ status: 404, description: 'Permission not found' })
    findOne(@Param('id') id: string) {
        return this.permissionsService.findOne(id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update a permission' })
    @ApiParam({ name: 'id', description: 'Permission ID' })
    @ApiResponse({ status: 200, description: 'Permission updated successfully' })
    @ApiResponse({ status: 404, description: 'Permission not found' })
    update(
        @Param('id') id: string,
        @Body() updatePermissionDto: UpdatePermissionDto,
    ) {
        return this.permissionsService.update(id, updatePermissionDto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete a permission' })
    @ApiParam({ name: 'id', description: 'Permission ID' })
    @ApiResponse({ status: 200, description: 'Permission deleted successfully' })
    @ApiResponse({ status: 404, description: 'Permission not found' })
    @ApiResponse({
        status: 409,
        description: 'Cannot delete - permission is in use',
    })
    remove(@Param('id') id: string) {
        return this.permissionsService.remove(id);
    }
}
