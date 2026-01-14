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
import { PositionsService } from './positions.service';
import { CreatePositionDto } from './dto/create-position.dto';
import { UpdatePositionDto } from './dto/update-position.dto';
import { AssignPermissionsDto } from './dto/assign-permissions.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@ApiTags('admin/positions')
@Controller('admin/positions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth()
export class PositionsController {
    constructor(private readonly positionsService: PositionsService) { }

    @Post()
    @ApiOperation({ summary: 'Create a new position' })
    @ApiResponse({ status: 201, description: 'Position created successfully' })
    @ApiResponse({ status: 409, description: 'Position already exists' })
    create(@Body() createPositionDto: CreatePositionDto) {
        return this.positionsService.create(createPositionDto);
    }

    @Get()
    @ApiOperation({ summary: 'Get all positions' })
    @ApiQuery({ name: 'page', required: false, example: 1 })
    @ApiQuery({ name: 'limit', required: false, example: 10 })
    @ApiQuery({ name: 'search', required: false })
    @ApiResponse({ status: 200, description: 'Returns paginated positions' })
    findAll(
        @Query('page') page?: number,
        @Query('limit') limit?: number,
        @Query('search') search?: string,
    ) {
        return this.positionsService.findAll({ page, limit, search });
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get position by ID with permissions' })
    @ApiParam({ name: 'id', description: 'Position ID' })
    @ApiResponse({ status: 200, description: 'Returns position details' })
    @ApiResponse({ status: 404, description: 'Position not found' })
    findOne(@Param('id') id: string) {
        return this.positionsService.findOne(id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update a position' })
    @ApiParam({ name: 'id', description: 'Position ID' })
    @ApiResponse({ status: 200, description: 'Position updated successfully' })
    @ApiResponse({ status: 404, description: 'Position not found' })
    update(@Param('id') id: string, @Body() updatePositionDto: UpdatePositionDto) {
        return this.positionsService.update(id, updatePositionDto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete a position' })
    @ApiParam({ name: 'id', description: 'Position ID' })
    @ApiResponse({ status: 200, description: 'Position deleted successfully' })
    @ApiResponse({ status: 404, description: 'Position not found' })
    @ApiResponse({ status: 409, description: 'Cannot delete - position is in use' })
    remove(@Param('id') id: string) {
        return this.positionsService.remove(id);
    }

    @Post(':id/permissions')
    @ApiOperation({ summary: 'Assign permissions to position' })
    @ApiParam({ name: 'id', description: 'Position ID' })
    @ApiResponse({
        status: 200,
        description: 'Permissions assigned successfully',
    })
    @ApiResponse({ status: 404, description: 'Position not found' })
    assignPermissions(
        @Param('id') id: string,
        @Body() assignPermissionsDto: AssignPermissionsDto,
    ) {
        return this.positionsService.assignPermissions(id, assignPermissionsDto);
    }

    @Delete(':id/permissions/:permissionId')
    @ApiOperation({ summary: 'Remove permission from position' })
    @ApiParam({ name: 'id', description: 'Position ID' })
    @ApiParam({ name: 'permissionId', description: 'Permission ID' })
    @ApiResponse({
        status: 200,
        description: 'Permission removed successfully',
    })
    @ApiResponse({ status: 404, description: 'Position or permission not found' })
    removePermission(
        @Param('id') positionId: string,
        @Param('permissionId') permissionId: string,
    ) {
        return this.positionsService.removePermission(positionId, permissionId);
    }
}
