import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateShippingDto } from './dto/create-shipping.dto';
import { ShippingStatus } from '@prisma/client';

// src/shipping/shipping.service.ts
@Injectable()
export class ShippingService {
  constructor(private prisma: PrismaService) {}

  // async createShippingMethod(data: CreateShippingDto) {
  //   return this.prisma.shipping.create({ data });
  // }

  // async getVendorShippingMethods(vendorId: string) {
  //   return this.prisma.shipping.findMany({ where: { vendorId } });
  // }

  // async updateOrderItemShipping(orderItemId: string, status: ShippingStatus) {
  //   return this.prisma.orderItem.update({
  //     where: { id: orderItemId },
  //     data: { shippingStatus: status },
  //   });
  // }

  // async getOrderShippingDetails(orderId: string) {
  //   return this.prisma.orderShipping.findMany({
  //     where: { orderId },
  //     include: { shipping: true, vendor: true },
  //   });
  // }
}
