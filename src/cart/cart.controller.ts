import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { CartService } from "./cart.service";
import { AddToCartDto } from "./dto/add-to-cart.dto";
import { UpdateCartItemDto } from "./dto/update-cart-item.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";

@ApiTags("cart")
@Controller("cart")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: "Get user cart" })
  @ApiResponse({ status: 200, description: "Returns the user cart" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  getCart(@CurrentUser() user) {
    return this.cartService.getCart(user.id);
  }

  @Post()
  @ApiOperation({ summary: "Add item to cart" })
  @ApiResponse({ status: 201, description: "Item added to cart successfully" })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Product not found" })
  addToCart(@Body() addToCartDto: AddToCartDto, @CurrentUser() user) {
    return this.cartService.addToCart(user.id, addToCartDto);
  }

  @Patch(":itemId")
  @ApiOperation({ summary: "Update cart item quantity" })
  @ApiParam({ name: "itemId", description: "Cart item ID" })
  @ApiResponse({ status: 200, description: "Cart item updated successfully" })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Cart item not found" })
  updateCartItem(
    @Param("itemId") itemId: string,
    @Body() updateCartItemDto: UpdateCartItemDto,
    @CurrentUser() user,
  ) {
    return this.cartService.updateCartItem(user.id, itemId, updateCartItemDto);
  }

  @Delete(":itemId")
  @ApiOperation({ summary: "Remove item from cart" })
  @ApiParam({ name: "itemId", description: "Cart item ID" })
  @ApiResponse({ status: 200, description: "Cart item removed successfully" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Cart item not found" })
  removeFromCart(@Param("itemId") itemId: string, @CurrentUser() user) {
    return this.cartService.removeFromCart(user.id, itemId);
  }

  @Delete()
  @ApiOperation({ summary: "Clear cart" })
  @ApiResponse({ status: 200, description: "Cart cleared successfully" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  clearCart(@CurrentUser() user) {
    return this.cartService.clearCart(user.id);
  }
}
