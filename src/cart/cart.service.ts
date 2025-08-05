import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { OnEvent } from "@nestjs/event-emitter";

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}

  private getCartWhereClause(userId?: string, sessionId?: string) {
    if (userId) return { userId };
    if (sessionId) return { sessionId };
    throw new BadRequestException("User ID or Session ID must be provided.");
  }

  async getCart({ userId, sessionId }: { userId?: string; sessionId?: string }) {
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

    const items = cart.items.map((item) => {
      const basePrice = item.productVariant?.price ?? item.product.price;
      const discountPrice =
        item.productVariant?.discountPrice ?? item.product.discountPrice;
      const price = discountPrice || basePrice;

      const activeFlashSale = item.product.flashSaleItems.find(
        (fsi) => fsi.flashSale?.isActive,
      );
      const flashSalePrice = activeFlashSale
        ? price * (1 - activeFlashSale.discountPercentage / 100)
        : null;

      const finalPrice = flashSalePrice ?? price;

      return {
        id: item.id,
        quantity: item.quantity,
        product: {
          id: item.product.id,
          name: item.product.name,
          slug: item.product.slug,
          images: item.product.images,
          vendor: item.product.vendor,
        },
        variant: item.productVariant
          ? {
              id: item.productVariant.id,
              color: item.productVariant.color,
              size: item.productVariant.size,
              price: item.productVariant.price,
              discountPrice: item.productVariant.discountPrice,
            }
          : null,
        finalPrice,
        totalPrice: finalPrice * item.quantity,
      };
    });

    const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);

    return {
      id: cart.id,
      items,
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
      subtotal,
    };
  }

  async addToCart({
    userId,
    sessionId,
    productId,
    variantId,
    quantity,
  }: {
    userId?: string;
    sessionId?: string;
    productId: string;
    variantId?: string;
    quantity: number;
  }) {
    const where = this.getCartWhereClause(userId, sessionId);

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    if (variantId) {
      const variant = await this.prisma.productVariant.findUnique({
        where: { id: variantId },
      });
      if (!variant || variant.productId !== productId) {
        throw new NotFoundException(`Variant with ID ${variantId} not found for this product`);
      }
      if (variant.quantity < quantity) {
        throw new BadRequestException("Variant is out of stock or has insufficient quantity");
      }
    } else {
      // This logic assumes products without variants have their quantity on the main product record
      if (product.quantity < quantity) {
        throw new BadRequestException("Product is out of stock or has insufficient quantity");
      }
    }

    const cart = await this.prisma.cart.upsert({
      where,
      create: where,
      update: {},
    });

    const existingCartItem = await this.prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        productId,
        productVariantId: variantId, // This will be null for products without variants
      },
    });

    if (existingCartItem) {
      return this.prisma.cartItem.update({
        where: { id: existingCartItem.id },
        data: { quantity: existingCartItem.quantity + quantity },
      });
    }

    return this.prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productId,
        productVariantId: variantId,
        quantity,
      },
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
    const cartItem = await this.prisma.cartItem.findFirst({
      where: { 
        id: itemId,
        cart: where
      },
      include: { product: true, productVariant: true },
    });

    if (!cartItem) {
      throw new NotFoundException(`Cart item with ID ${itemId} not found`);
    }
    
    if (quantity <= 0) {
      return this.removeFromCart({ userId, sessionId, itemId });
    }

    const stockQuantity = cartItem.productVariant?.quantity ?? cartItem.product.quantity;
    if (stockQuantity < quantity) {
      throw new BadRequestException("Insufficient stock");
    }

    return this.prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity },
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
    const cartItem = await this.prisma.cartItem.findFirst({
      where: { 
        id: itemId,
        cart: where
      },
    });

    if (!cartItem) {
      // To prevent errors, just confirm success if item is already gone
      return { message: "Item already removed from cart" };
    }

    await this.prisma.cartItem.delete({ where: { id: itemId } });
    return { message: "Item removed from cart successfully" };
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
      return { message: "Cart is already empty" };
    }

    await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    return { message: "Cart cleared successfully" };
  }

  @OnEvent("user.login")
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
        include: { items: true }
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
