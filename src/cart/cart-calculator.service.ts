import { Injectable } from '@nestjs/common';

@Injectable()
export class CartCalculatorService {
  calculateCartItemPrice(item: any) {
    const basePrice = item.productVariant?.price ?? item.product.price;
    const discountPrice =
      item.productVariant?.discountPrice ?? item.product.discountPrice;
    const price = discountPrice || basePrice;

    // Ensure flashSaleItems array exists before calling find
    const _flashSaleItems = item.product.flashSaleItems || [];
    const activeFlashSale = _flashSaleItems.find(
      (fsi) => fsi.flashSale?.isActive,
    );
    const flashSalePrice = activeFlashSale
      ? price * (1 - activeFlashSale.discountPercentage / 100)
      : null;

    return flashSalePrice ?? price;
  }

  calculateCartTotals(items: any[]) {
    const processedItems = items.map((item) => {
      const finalPrice = this.calculateCartItemPrice(item);

      return {
        id: item.id,
        quantity: item.quantity,
        product: {
          id: item.product.id,
          name: item.product.name,
          slug: item.product.slug,
          shortDescription: item.product.shortDescription,
          images: item.product.images?.slice(0, 1) ?? [],
          price: item.product.price,
          discountPrice: item.product.discountPrice ?? null,
          vendorId: item.product.vendorId,
          vendor: item.product.vendor,
        },
        originalPrice: item.productVariant?.price ?? item.product.price,
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
      };
    });

    // Calculate subtotal based on final prices
    const subtotal = processedItems.reduce(
      (sum, item) => sum + item.finalPrice * item.quantity,
      0,
    );

    return {
      items: processedItems,
      itemCount: processedItems.reduce((sum, item) => sum + item.quantity, 0),
      subtotal,
    };
  }
}
