import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';

import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';

import { CartService } from './cart.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { AnonymousOrJwtAuthGuard } from '../auth/guards/anonymous-or-jwt-auth.guard';
import { SessionOrUser } from '../auth/decorators/session-or-user.decorator';
import { Public } from 'src/auth/decorators/public.decorator';
import { Session } from 'src/auth/decorators/session-id.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';

@ApiTags('cart')
@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @Session()
  @ApiOperation({ summary: 'Get user cart' })
  @ApiResponse({ status: 200, description: 'Returns the user cart' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getCart(@SessionOrUser() { userId, sessionId }) {
    return this.cartService.getCart({ userId, sessionId });
  }

  @Post()
  @Session()
  @ApiOperation({ summary: 'Add item to cart' })
  @ApiResponse({ status: 201, description: 'Item added to cart successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  addToCart(
    @Body() addToCartDto: AddToCartDto,
    @SessionOrUser() { userId, sessionId },
  ) {
    return this.cartService.addToCart({ userId, sessionId, ...addToCartDto });
  }

  @Patch(':itemId')
  @Session()
  @ApiOperation({ summary: 'Update cart item quantity' })
  @ApiParam({ name: 'itemId', description: 'Cart item ID' })
  @ApiResponse({ status: 200, description: 'Cart item updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Cart item not found' })
  updateCartItem(
    @Param('itemId') itemId: string,
    @Body() updateCartItemDto: UpdateCartItemDto,
    @SessionOrUser() { userId, sessionId },
  ) {
    return this.cartService.updateCartItem({
      userId,
      sessionId,
      itemId,
      ...updateCartItemDto,
    });
  }

  @Delete(':itemId')
  @Session()
  @ApiOperation({ summary: 'Remove item from cart' })
  @ApiParam({ name: 'itemId', description: 'Cart item ID' })
  @ApiResponse({ status: 200, description: 'Cart item removed successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Cart item not found' })
  removeFromCart(
    @Param('itemId') itemId: string,
    @SessionOrUser() { userId, sessionId },
  ) {
    return this.cartService.removeFromCart({ userId, sessionId, itemId });
  }

  @Delete()
  @Session()
  @ApiOperation({ summary: 'Clear cart' })
  @ApiResponse({ status: 200, description: 'Cart cleared successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  clearCart(@SessionOrUser() { userId, sessionId }) {
    return this.cartService.clearCart({ userId, sessionId });
  }
}
