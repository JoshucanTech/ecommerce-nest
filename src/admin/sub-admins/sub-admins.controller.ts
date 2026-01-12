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
import { SubAdminsService } from './sub-admins.service';
import { CreateSubAdminDto } from './dto/create-sub-admin.dto';
import { UpdateSubAdminDto } from './dto/update-sub-admin.dto';
import { AssignRolesDto } from './dto/assign-roles.dto';
import { UpdateScopeDto } from './dto/update-scope.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@ApiTags('admin/sub-admins')
@Controller('admin/sub-admins')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth()
export class SubAdminsController {
    constructor(private readonly subAdminsService: SubAdminsService) { }

    @Post()
    @ApiOperation({ summary: 'Create a new sub-admin' })
    @ApiResponse({ status: 201, description: 'Sub-admin created successfully' })
    @ApiResponse({ status: 409, description: 'User already exists' })
    create(@Body() createSubAdminDto: CreateSubAdminDto) {
        return this.subAdminsService.create(createSubAdminDto);
    }

    @Get()
    @ApiOperation({ summary: 'Get all sub-admins' })
    @ApiQuery({ name: 'page', required: false, example: 1 })
    @ApiQuery({ name: 'limit', required: false, example: 10 })
    @ApiQuery({ name: 'search', required: false })
    @ApiResponse({ status: 200, description: 'Returns paginated sub-admins' })
    findAll(
        @Query('page') page?: number,
        @Query('limit') limit?: number,
        @Query('search') search?: string,
    ) {
        return this.subAdminsService.findAll({ page, limit, search });
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get sub-admin by ID with full details' })
    @ApiParam({ name: 'id', description: 'Sub-admin ID' })
    @ApiResponse({ status: 200, description: 'Returns sub-admin details' })
    @ApiResponse({ status: 404, description: 'Sub-admin not found' })
    findOne(@Param('id') id: string) {
        return this.subAdminsService.findOne(id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update a sub-admin' })
    @ApiParam({ name: 'id', description: 'Sub-admin ID' })
    @ApiResponse({ status: 200, description: 'Sub-admin updated successfully' })
    @ApiResponse({ status: 404, description: 'Sub-admin not found' })
    update(
        @Param('id') id: string,
        @Body() updateSubAdminDto: UpdateSubAdminDto,
    ) {
        return this.subAdminsService.update(id, updateSubAdminDto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Deactivate a sub-admin' })
    @ApiParam({ name: 'id', description: 'Sub-admin ID' })
    @ApiResponse({
        status: 200,
        description: 'Sub-admin deactivated successfully',
    })
    @ApiResponse({ status: 404, description: 'Sub-admin not found' })
    remove(@Param('id') id: string) {
        return this.subAdminsService.remove(id);
    }

    @Post(':id/roles')
    @ApiOperation({ summary: 'Assign roles to sub-admin' })
    @ApiParam({ name: 'id', description: 'Sub-admin ID' })
    @ApiResponse({ status: 200, description: 'Roles assigned successfully' })
    @ApiResponse({ status: 404, description: 'Sub-admin not found' })
    assignRoles(@Param('id') id: string, @Body() assignRolesDto: AssignRolesDto) {
        return this.subAdminsService.assignRoles(id, assignRolesDto);
    }

    @Delete(':id/roles/:roleId')
    @ApiOperation({ summary: 'Remove role from sub-admin' })
    @ApiParam({ name: 'id', description: 'Sub-admin ID' })
    @ApiParam({ name: 'roleId', description: 'Role ID' })
    @ApiResponse({ status: 200, description: 'Role removed successfully' })
    @ApiResponse({ status: 404, description: 'Sub-admin or role not found' })
    removeRole(@Param('id') id: string, @Param('roleId') roleId: string) {
        return this.subAdminsService.removeRole(id, roleId);
    }

    @Patch(':id/scope')
    @ApiOperation({ summary: 'Update sub-admin scope configuration' })
    @ApiParam({ name: 'id', description: 'Sub-admin ID' })
    @ApiResponse({ status: 200, description: 'Scope updated successfully' })
    @ApiResponse({ status: 404, description: 'Sub-admin not found' })
    updateScope(@Param('id') id: string, @Body() updateScopeDto: UpdateScopeDto) {
        return this.subAdminsService.updateScope(id, updateScopeDto);
    }

    @Get(':id/activity')
    @ApiOperation({ summary: 'Get sub-admin activity log' })
    @ApiParam({ name: 'id', description: 'Sub-admin ID' })
    @ApiQuery({ name: 'page', required: false, example: 1 })
    @ApiQuery({ name: 'limit', required: false, example: 10 })
    @ApiQuery({ name: 'action', required: false })
    @ApiResponse({ status: 200, description: 'Returns activity logs' })
    @ApiResponse({ status: 404, description: 'Sub-admin not found' })
    getActivity(
        @Param('id') id: string,
        @Query('page') page?: number,
        @Query('limit') limit?: number,
        @Query('action') action?: string,
    ) {
        return this.subAdminsService.getActivity(id, { page, limit, action });
    }
}
