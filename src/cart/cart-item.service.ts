import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CartItemService {
  constructor(private prisma: PrismaService) {}

  async validateAndAddItem({
    cartId,
    productId,
    variantId,
    quantity,
    shippingId,
  }: {
    cartId: string;
    productId: string;
    variantId?: string;
    quantity: number;
    shippingId?: string;
  }) {
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
        throw new NotFoundException(
          `Variant with ID ${variantId} not found for this product`,
        );
      }
      if (variant.quantity < quantity) {
        throw new BadRequestException(
          'Variant is out of stock or has insufficient quantity',
        );
      }
    } else {
      // This logic assumes products without variants have their quantity on the main product record
      if (product.quantity < quantity) {
        throw new BadRequestException(
          'Product is out of stock or has insufficient quantity',
        );
      }
    }

    if (shippingId) {
      const shippingMethod = await this.prisma.shipping.findFirst({
        where: { id: shippingId, Vendor: { some: { id: product.vendorId } } },
      });
      if (!shippingMethod) {
        throw new BadRequestException(
          "Invalid shipping method for this product's vendor.",
        );
      }
    }

    const existingCartItem = await this.prisma.cartItem.findFirst({
      where: {
        cartId,
        productId,
        productVariantId: variantId, // This will be null for products without variants
      },
    });

    if (existingCartItem) {
      return this.prisma.cartItem.update({
        where: { id: existingCartItem.id },
        data: {
          quantity: existingCartItem.quantity + quantity,
          shippingId: shippingId ?? existingCartItem.shippingId,
        },
      });
    }

    return this.prisma.cartItem.create({
      data: {
        cartId,
        productId,
        productVariantId: variantId,
        quantity,
        shippingId,
      },
    });
  }

  async updateQuantity({
    cartId,
    itemId,
    quantity,
  }: {
    cartId: string;
    itemId: string;
    quantity: number;
  }) {
    const cartItem = await this.prisma.cartItem.findFirst({
      where: {
        id: itemId,
        cartId,
      },
      include: { product: true, productVariant: true },
    });

    if (!cartItem) {
      throw new NotFoundException(`Cart item with ID ${itemId} not found`);
    }

    const stockQuantity =
      cartItem.productVariant?.quantity ?? cartItem.product.quantity;
    if (stockQuantity < quantity) {
      throw new BadRequestException('Insufficient stock');
    }

    return this.prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity },
    });
  }

  async removeItem({ cartId, itemId }: { cartId: string; itemId: string }) {
    const cartItem = await this.prisma.cartItem.findFirst({
      where: {
        id: itemId,
        cartId,
      },
    });

    if (!cartItem) {
      // To prevent errors, just confirm success if item is already gone
      return { message: 'Item already removed from cart' };
    }

    await this.prisma.cartItem.delete({ where: { id: itemId } });
    return { message: 'Item removed from cart successfully' };
  }
}
