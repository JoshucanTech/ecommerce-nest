import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { WishlistService } from './wishlist.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('wishlist')
@Controller('wishlist')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) { }

  @Get()
  @Roles('BUYER', 'VENDOR', 'ADMIN', 'RIDER')
  @ApiOperation({ summary: 'Get user wishlist' })
  @ApiQuery({ name: 'userId', required: false, description: 'User ID to fetch wishlist for (Admin only)' })
  @ApiResponse({ status: 200, description: 'Returns the user wishlist' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getWishlist(@CurrentUser() user, @Query('userId') userId?: string) {
    const targetUserId = user.role === 'ADMIN' && userId ? userId : user.id;
    return this.wishlistService.getWishlist(targetUserId);
  }

  @Post(':productId')
  @Roles('BUYER', 'VENDOR', 'ADMIN', 'RIDER')
  @ApiOperation({ summary: 'Add product to wishlist' })
  @ApiParam({ name: 'productId', description: 'Product ID' })
  @ApiQuery({ name: 'userId', required: false, description: 'User ID to manage wishlist for (Admin only)' })
  @ApiResponse({
    status: 201,
    description: 'Product added to wishlist successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  addToWishlist(
    @Param('productId') productId: string,
    @CurrentUser() user,
    @Query('userId') userId?: string,
  ) {
    const targetUserId = user.role === 'ADMIN' && userId ? userId : user.id;
    return this.wishlistService.addToWishlist(targetUserId, productId);
  }

  @Delete(':productId')
  @Roles('BUYER', 'VENDOR', 'ADMIN', 'RIDER')
  @ApiOperation({ summary: 'Remove product from wishlist' })
  @ApiParam({ name: 'productId', description: 'Product ID' })
  @ApiQuery({ name: 'userId', required: false, description: 'User ID to manage wishlist for (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Product removed from wishlist successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Product not found in wishlist' })
  removeFromWishlist(
    @Param('productId') productId: string,
    @CurrentUser() user,
    @Query('userId') userId?: string,
  ) {
    const targetUserId = user.role === 'ADMIN' && userId ? userId : user.id;
    return this.wishlistService.removeFromWishlist(targetUserId, productId);
  }

  @Delete()
  @Roles('BUYER', 'VENDOR', 'ADMIN', 'RIDER')
  @ApiOperation({ summary: 'Clear wishlist' })
  @ApiQuery({ name: 'userId', required: false, description: 'User ID to clear wishlist for (Admin only)' })
  @ApiResponse({ status: 200, description: 'Wishlist cleared successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  clearWishlist(@CurrentUser() user, @Query('userId') userId?: string) {
    const targetUserId = user.role === 'ADMIN' && userId ? userId : user.id;
    return this.wishlistService.clearWishlist(targetUserId);
  }
}
