import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import  { PrismaService } from "../prisma/prisma.service";
import { AddToCartDto } from "./dto/add-to-cart.dto";
import { UpdateCartItemDto } from "./dto/update-cart-item.dto";

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}

  async getCart(userId: string) {
    // Get or create cart
    let cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                price: true,
                discountPrice: true,
                images: true,
                vendor: {
                  select: {
                    id: true,
                    businessName: true,
                    slug: true,
                  },
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
          },
        },
      },
    });

    if (!cart) {
      cart = await this.prisma.cart.create({
        data: {
          userId,
        },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  price: true,
                  discountPrice: true,
                  images: true,
                  vendor: {
                    select: {
                      id: true,
                      businessName: true,
                      slug: true,
                    },
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
            },
          },
        },
      });
    }

    // Calculate total and apply flash sale discounts
    const items = cart.items.map((item) => {
      const activeFlashSale = item.product.flashSaleItems.find(
        (fsi) => fsi.flashSale !== null,
      );
      const price = item.product.discountPrice || item.product.price;
      const flashSalePrice = activeFlashSale
        ? price * (1 - activeFlashSale.discountPercentage / 100)
        : null;

      const finalPrice = flashSalePrice || price;

      return {
        id: item.id,
        quantity: item.quantity,
        product: {
          id: item.product.id,
          name: item.product.name,
          slug: item.product.slug,
          price: item.product.price,
          discountPrice: item.product.discountPrice,
          finalPrice,
          images: item.product.images,
          vendor: item.product.vendor,
        },
        totalPrice: finalPrice * item.quantity,
        flashSale: activeFlashSale
          ? {
              id: activeFlashSale.flashSaleId,
              discountPercentage: activeFlashSale.discountPercentage,
            }
          : null,
      };
    });

    const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);

    return {
      id: cart.id,
      items,
      itemCount: items.length,
      subtotal,
    };
  }

  async addToCart(userId: string, addToCartDto: AddToCartDto) {
    const { productId, quantity } = addToCartDto;

    // Check if product exists
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        inventory: true,
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    // Check if product is in stock
    if (!product.inventory || product.inventory.quantity < quantity) {
      throw new BadRequestException(
        "Product is out of stock or has insufficient quantity",
      );
    }

    // Get or create cart
    let cart = await this.prisma.cart.findUnique({
      where: { userId },
    });

    if (!cart) {
      cart = await this.prisma.cart.create({
        data: {
          userId,
        },
      });
    }

    // Check if product is already in cart
    const existingCartItem = await this.prisma.cartItem.findUnique({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId,
        },
      },
    });

    if (existingCartItem) {
      // Update quantity
      return this.prisma.cartItem.update({
        where: { id: existingCartItem.id },
        data: {
          quantity: existingCartItem.quantity + quantity,
        },
      });
    }

    // Add new item to cart
    return this.prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productId,
        quantity,
      },
    });
  }

  async updateCartItem(
    userId: string,
    itemId: string,
    updateCartItemDto: UpdateCartItemDto,
  ) {
    // Check if cart item exists and belongs to user
    const cartItem = await this.prisma.cartItem.findFirst({
      where: {
        id: itemId,
        cart: {
          userId,
        },
      },
      include: {
        product: {
          include: {
            inventory: true,
          },
        },
      },
    });

    if (!cartItem) {
      throw new NotFoundException(`Cart item with ID ${itemId} not found`);
    }

    // Check if product has enough inventory
    if (
      !cartItem.product.inventory ||
      cartItem.product.inventory.quantity < updateCartItemDto.quantity
    ) {
      throw new BadRequestException("Product has insufficient quantity");
    }

    // Update cart item
    return this.prisma.cartItem.update({
      where: { id: itemId },
      data: {
        quantity: updateCartItemDto.quantity,
      },
    });
  }

  async removeFromCart(userId: string, itemId: string) {
    // Check if cart item exists and belongs to user
    const cartItem = await this.prisma.cartItem.findFirst({
      where: {
        id: itemId,
        cart: {
          userId,
        },
      },
    });

    if (!cartItem) {
      throw new NotFoundException(`Cart item with ID ${itemId} not found`);
    }

    // Remove cart item
    await this.prisma.cartItem.delete({
      where: { id: itemId },
    });

    return { message: "Item removed from cart successfully" };
  }

  async clearCart(userId: string) {
    // Get cart
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
    });

    if (!cart) {
      return { message: "Cart is already empty" };
    }

    // Delete all cart items
    await this.prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    });

    return { message: "Cart cleared successfully" };
  }
}
