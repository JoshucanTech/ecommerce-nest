import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@prisma/client';

@Injectable()
export class AnalyticsService {
    constructor(private prisma: PrismaService) { }

    async getDashboardStats(user: any, params: { startDate?: string; endDate?: string } = {}) {
        await this.hydrateUser(user);

        const { startDate, endDate } = params;
        const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), 0, 1);
        const end = endDate ? new Date(endDate) : new Date();

        const where: any = {
            createdAt: { gte: start, lte: end },
        };

        // RBAC logic
        if (user.role === UserRole.VENDOR) {
            where.vendorId = user.vendor.id;
        } else if (user.role === UserRole.SUB_ADMIN) {
            const permissions = user.roles.flatMap(r => r.permissions.map(rp => rp.permission));
            const analyticsPermissions = permissions.filter(p =>
                (p.resource === 'ANALYTICS' || p.resource === 'DASHBOARD') &&
                (p.action === 'READ' || p.action === 'MANAGE')
            );

            if (analyticsPermissions.length === 0) {
                throw new ForbiddenException('No permission to access analytics');
            }

            const hasGlobal = analyticsPermissions.some(p => !p.scope);
            if (!hasGlobal) {
                const vendorIds = analyticsPermissions.flatMap(p => (p.scope as any)?.vendors || []);
                if (vendorIds.length > 0) {
                    where.vendorId = { in: vendorIds };
                } else {
                    return this.getEmptyStats();
                }
            }
        }

        // Parallel queries for performance
        const [
            totalOrders,
            salesAgg,
            customersGroup,
            monthlySales,
            categoriesData,
            topProducts,
            prevPeriodSales
        ] = await Promise.all([
            // Summary
            this.prisma.order.count({ where }),
            this.prisma.order.aggregate({
                where,
                _sum: { totalAmount: true }
            }),
            this.prisma.order.groupBy({
                by: ['userId'],
                where
            }),
            // Trends
            this.prisma.order.findMany({
                where,
                select: { createdAt: true, totalAmount: true }
            }),
            // Categories
            this.prisma.orderItem.groupBy({
                by: ['productId'],
                where: { order: where },
                _sum: { totalPrice: true }
            }),
            // Top Products
            this.prisma.orderItem.groupBy({
                by: ['productId'],
                where: { order: where },
                _sum: { totalPrice: true, quantity: true },
                orderBy: { _sum: { totalPrice: 'desc' } },
                take: 10
            }),
            // Growth comparison
            this.getPreviousPeriodSales(where, start, end)
        ]);

        const totalSales = salesAgg._sum.totalAmount || 0;
        const totalCustomers = customersGroup.length;
        const prevSales = prevPeriodSales._sum.totalAmount || 0;
        const salesGrowth = prevSales > 0 ? ((totalSales - prevSales) / prevSales) * 100 : 0;

        // Process Trends (Monthly)
        const trendsByMonth = this.groupSalesByMonth(monthlySales);

        // Process Categories (needs another step to get category names)
        const processedCategories = await this.enrichCategoryStats(categoriesData);

        // Process Top Products
        const enrichedProducts = await this.enrichProductStats(topProducts);

        return {
            summary: {
                totalSales,
                totalOrders,
                totalCustomers,
                salesGrowth: Number(salesGrowth.toFixed(1)),
                ordersGrowth: 0, // Simplified
                customersGrowth: 0, // Simplified
            },
            salesTrends: trendsByMonth,
            categoryDistribution: processedCategories,
            productPerformance: enrichedProducts,
        };
    }

    private async getPreviousPeriodSales(where: any, start: Date, end: Date) {
        const diff = end.getTime() - start.getTime();
        const prevStart = new Date(start.getTime() - diff);
        const prevEnd = new Date(start.getTime());

        const prevWhere = { ...where, createdAt: { gte: prevStart, lte: prevEnd } };
        return this.prisma.order.aggregate({
            where: prevWhere,
            _sum: { totalAmount: true }
        });
    }

    private groupSalesByMonth(orders: any[]) {
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const stats: Record<string, { name: string, sales: number, orders: number }> = {};

        // Initialize
        months.forEach(m => stats[m] = { name: m, sales: 0, orders: 0 });

        orders.forEach(o => {
            const m = months[new Date(o.createdAt).getMonth()];
            stats[m].sales += o.totalAmount;
            stats[m].orders += 1;
        });

        return Object.values(stats);
    }

    private async enrichCategoryStats(data: any[]) {
        if (data.length === 0) return [];

        // This is a bit tricky because order items are linked to products which have categories.
        // group by categoryId would be better.
        const productIds = data.map(d => d.productId);
        const products = await this.prisma.product.findMany({
            where: { id: { in: productIds } },
            include: { category: true }
        });

        const categories: Record<string, number> = {};
        data.forEach(d => {
            const p = products.find(prod => prod.id === d.productId);
            if (p && p.category.length > 0) {
                const catName = p.category[0].name;
                categories[catName] = (categories[catName] || 0) + (d._sum.totalPrice || 0);
            }
        });

        const total = Object.values(categories).reduce((a, b) => a + b, 0);
        return Object.entries(categories).map(([name, value]) => ({
            name,
            value: total > 0 ? Number(((value / total) * 100).toFixed(0)) : 0
        })).sort((a, b) => b.value - a.value).slice(0, 5);
    }

    private async enrichProductStats(data: any[]) {
        if (data.length === 0) return [];

        const productIds = data.map(d => d.productId);
        const products = await this.prisma.product.findMany({
            where: { id: { in: productIds } },
            select: { id: true, name: true }
        });

        return data.map(d => {
            const p = products.find(prod => prod.id === d.productId);
            return {
                name: p?.name || 'Unknown',
                sales: d._sum.quantity || 0,
                revenue: d._sum.totalPrice || 0
            };
        });
    }

    private getEmptyStats() {
        return {
            summary: { totalSales: 0, totalOrders: 0, totalCustomers: 0, salesGrowth: 0, ordersGrowth: 0, customersGrowth: 0 },
            salesTrends: [],
            categoryDistribution: [],
            productPerformance: [],
        };
    }

    private async hydrateUser(user: any) {
        if (user.role === UserRole.VENDOR && !user.vendor) {
            const fullUser = await this.prisma.user.findUnique({
                where: { id: user.id },
                include: { vendor: true },
            });
            if (fullUser?.vendor) user.vendor = fullUser.vendor;
        } else if (user.role === UserRole.SUB_ADMIN && !user.roles) {
            const fullUser = await this.prisma.user.findUnique({
                where: { id: user.id },
                include: { roles: { include: { permissions: { include: { permission: true } } } } },
            });
            if (fullUser?.roles) user.roles = fullUser.roles;
        }
    }
}
