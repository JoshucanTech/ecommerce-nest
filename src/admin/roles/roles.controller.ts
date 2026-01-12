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
    ApiQuery,
} from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { AssignPermissionsDto } from './dto/assign-permissions.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@ApiTags('admin/roles')
@Controller('admin/roles')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth()
export class RolesController {
    constructor(private readonly rolesService: RolesService) { }

    @Post()
    @ApiOperation({ summary: 'Create a new role' })
    @ApiResponse({ status: 201, description: 'Role created successfully' })
    @ApiResponse({ status: 409, description: 'Role already exists' })
    create(@Body() createRoleDto: CreateRoleDto) {
        return this.rolesService.create(createRoleDto);
    }

    @Get()
    @ApiOperation({ summary: 'Get all roles' })
    @ApiQuery({ name: 'page', required: false, example: 1 })
    @ApiQuery({ name: 'limit', required: false, example: 10 })
    @ApiQuery({ name: 'search', required: false })
    @ApiResponse({ status: 200, description: 'Returns paginated roles' })
    findAll(
        @Query('page') page?: number,
        @Query('limit') limit?: number,
        @Query('search') search?: string,
    ) {
        return this.rolesService.findAll({ page, limit, search });
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get role by ID with permissions' })
    @ApiParam({ name: 'id', description: 'Role ID' })
    @ApiResponse({ status: 200, description: 'Returns role details' })
    @ApiResponse({ status: 404, description: 'Role not found' })
    findOne(@Param('id') id: string) {
        return this.rolesService.findOne(id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update a role' })
    @ApiParam({ name: 'id', description: 'Role ID' })
    @ApiResponse({ status: 200, description: 'Role updated successfully' })
    @ApiResponse({ status: 404, description: 'Role not found' })
    update(@Param('id') id: string, @Body() updateRoleDto: UpdateRoleDto) {
        return this.rolesService.update(id, updateRoleDto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete a role' })
    @ApiParam({ name: 'id', description: 'Role ID' })
    @ApiResponse({ status: 200, description: 'Role deleted successfully' })
    @ApiResponse({ status: 404, description: 'Role not found' })
    @ApiResponse({ status: 409, description: 'Cannot delete - role is in use' })
    remove(@Param('id') id: string) {
        return this.rolesService.remove(id);
    }

    @Post(':id/permissions')
    @ApiOperation({ summary: 'Assign permissions to role' })
    @ApiParam({ name: 'id', description: 'Role ID' })
    @ApiResponse({
        status: 200,
        description: 'Permissions assigned successfully',
    })
    @ApiResponse({ status: 404, description: 'Role not found' })
    assignPermissions(
        @Param('id') id: string,
        @Body() assignPermissionsDto: AssignPermissionsDto,
    ) {
        return this.rolesService.assignPermissions(id, assignPermissionsDto);
    }

    @Delete(':id/permissions/:permissionId')
    @ApiOperation({ summary: 'Remove permission from role' })
    @ApiParam({ name: 'id', description: 'Role ID' })
    @ApiParam({ name: 'permissionId', description: 'Permission ID' })
    @ApiResponse({
        status: 200,
        description: 'Permission removed successfully',
    })
    @ApiResponse({ status: 404, description: 'Role or permission not found' })
    removePermission(
        @Param('id') roleId: string,
        @Param('permissionId') permissionId: string,
    ) {
        return this.rolesService.removePermission(roleId, permissionId);
    }
}
