import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProductValidationService {
  constructor(private prisma: PrismaService) {}

  async validateProductsAndInventory(items: any[]) {
    const productIds = items.map((item) => item.productId);
    const products = await this.prisma.product.findMany({
      where: {
        id: { in: productIds },
        isPublished: true,
      },
      include: {
        vendor: true,
        inventory: true,
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
        ProductVariant: true,
      },
    });

    if (products.length !== productIds.length) {
      throw new BadRequestException(
        'Some products do not exist or are not published',
      );
    }

    // Check inventory
    const validationErrors = [];
    for (const item of items) {
      const product = products.find((p) => p.id === item.productId);

      // If variant is specified, check variant inventory
      if (item.variantId) {
        const variant = product.ProductVariant.find(
          (v) => v.id === item.variantId,
        );
        if (!variant || variant.quantity < item.quantity) {
          validationErrors.push(
            `Product variant ${product.name} has insufficient inventory`,
          );
        }
      } else {
        // Check base product inventory
        if (!product.inventory || product.inventory.quantity < item.quantity) {
          validationErrors.push(
            `Product ${product.name} has insufficient inventory`,
          );
        }
      }
    }

    return { products, validationErrors };
  }

  calculateProductPrice(product: any, variantId?: string): number {
    let unitPrice;
    if (variantId) {
      const variants = product.ProductVariant || [];
      const variant = variants.find((v) => v.id === variantId);
      unitPrice = variant?.discountPrice || variant?.price || product.price;
    } else {
      unitPrice = product.discountPrice || product.price;
    }

    // Check for flash sale
    const flashSaleItems = product.flashSaleItems || [];
    const activeFlashSale = flashSaleItems.find(
      (fsi) => fsi.flashSale !== null && fsi.flashSale.isActive,
    );

    const finalPrice = activeFlashSale
      ? unitPrice * (1 - activeFlashSale.discountPercentage / 100)
      : unitPrice;

    return finalPrice;
  }
}
