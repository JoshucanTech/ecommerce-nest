import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OnEvent } from '@nestjs/event-emitter';
import { CartItemService } from './cart-item.service';
import { CartCalculatorService } from './cart-calculator.service';

@Injectable()
export class CartService {
  constructor(
    private prisma: PrismaService,
    private cartItemService: CartItemService,
    private cartCalculatorService: CartCalculatorService,
  ) {}

  private getCartWhereClause(userId?: string, sessionId?: string) {
    if (userId) return { userId };
    if (sessionId) return { sessionId };
    throw new BadRequestException('User ID or Session ID must be provided.');
  }

  async getCart({
    userId,
    sessionId,
  }: {
    userId?: string;
    sessionId?: string;
  }) {
    const where = this.getCartWhereClause(userId, sessionId);
    let cart = await this.prisma.cart.findUnique({
      where,
      include: {
        items: {
          include: {
            product: {
              include: {
                vendor: {
                  select: { id: true, businessName: true, slug: true },
                },
                flashSaleItems: {
                  include: {
                    flashSale: {
                      select: {
                        isActive: true,
                        startDate: true,
                        endDate: true,
                      },
                    },
                  },
                },
              },
            },
            productVariant: true,
          },
        },
      },
    });

    if (!cart) {
      // If no cart, create one and return the empty structure
      const createdCart = await this.prisma.cart.create({
        data: where,
      });
      return {
        id: createdCart.id,
        items: [],
        itemCount: 0,
        subtotal: 0,
      };
    }

    const { items, subtotal, itemCount } = this.cartCalculatorService.calculateCartTotals(cart.items);

    return {
      id: cart.id,
      items,
      itemCount,
      subtotal,
    };
  }

  async addToCart({
    userId,
    sessionId,
    productId,
    variantId,
    quantity,
    shippingId,
  }: {
    userId?: string;
    sessionId?: string;
    productId: string;
    variantId?: string;
    quantity: number;
    shippingId?: string;
  }) {
    const where = this.getCartWhereClause(userId, sessionId);

    const cart = await this.prisma.cart.upsert({
      where,
      create: where,
      update: {},
    });

    return this.cartItemService.validateAndAddItem({
      cartId: cart.id,
      productId,
      variantId,
      quantity,
      shippingId,
    });
  }

  async updateCartItem({
    userId,
    sessionId,
    itemId,
    quantity,
  }: {
    userId?: string;
    sessionId?: string;
    itemId: string;
    quantity: number;
  }) {
    const where = this.getCartWhereClause(userId, sessionId);
    const cart = await this.prisma.cart.findUnique({ where });

    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    if (quantity <= 0) {
      return this.cartItemService.removeItem({
        cartId: cart.id,
        itemId,
      });
    }

    return this.cartItemService.updateQuantity({
      cartId: cart.id,
      itemId,
      quantity,
    });
  }

  async removeFromCart({
    userId,
    sessionId,
    itemId,
  }: {
    userId?: string;
    sessionId?: string;
    itemId: string;
  }) {
    const where = this.getCartWhereClause(userId, sessionId);
    const cart = await this.prisma.cart.findUnique({ where });

    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    return this.cartItemService.removeItem({
      cartId: cart.id,
      itemId,
    });
  }

  async clearCart({
    userId,
    sessionId,
  }: {
    userId?: string;
    sessionId?: string;
  }) {
    const where = this.getCartWhereClause(userId, sessionId);
    const cart = await this.prisma.cart.findUnique({ where });

    if (!cart) {
      return { message: 'Cart is already empty' };
    }

    await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    return { message: 'Cart cleared successfully' };
  }

  @OnEvent('user.login')
  async handleUserLogin({
    userId,
    sessionId,
  }: {
    userId: string;
    sessionId: string;
  }) {
    await this.mergeCarts(userId, sessionId);
  }

  async mergeCarts(userId: string, sessionId: string) {
    const sessionCart = await this.prisma.cart.findUnique({
      where: { sessionId },
      include: { items: true },
    });

    if (!sessionCart?.items.length) {
      if (sessionCart) {
        await this.prisma.cart.delete({ where: { sessionId } }).catch();
      }
      return;
    }

    const userCart = await this.prisma.cart.upsert({
      where: { userId },
      create: { userId },
      update: {},
      include: { items: true },
    });

    for (const sessionItem of sessionCart.items) {
      const userCartItem = userCart.items.find(
        (item) =>
          item.productId === sessionItem.productId &&
          item.productVariantId === sessionItem.productVariantId,
      );

      if (userCartItem) {
        // If item exists in user's cart, add quantity and delete session item
        await this.prisma.cartItem.update({
          where: { id: userCartItem.id },
          data: { quantity: userCartItem.quantity + sessionItem.quantity },
        });
        await this.prisma.cartItem.delete({ where: { id: sessionItem.id } });
      } else {
        // If item doesn't exist, just move it to the user's cart
        await this.prisma.cartItem.update({
          where: { id: sessionItem.id },
          data: { cartId: userCart.id },
        });
      }
    }

    // Clean up the now-empty session cart
    await this.prisma.cart.delete({ where: { sessionId } }).catch();
  }
}