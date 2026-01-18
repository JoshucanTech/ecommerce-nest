# RBAC Service Usage Guide

The `RbacService` provides a centralized, reusable way to handle Role-Based Access Control (RBAC) across all services in the application.

## Quick Start

### 1. Import RbacModule in your feature module

```typescript
import { Module } from '@nestjs/common';
import { RbacModule } from '../common/rbac';
import { YourService } from './your.service';

@Module({
  imports: [RbacModule],
  providers: [YourService],
})
export class YourModule {}
```

### 2. Inject RbacService in your service

```typescript
import { Injectable } from '@nestjs/common';
import { RbacService } from '../common/rbac';
import { PermissionResource, PermissionAction } from '@prisma/client';

@Injectable()
export class YourService {
  constructor(private readonly rbacService: RbacService) {}
}
```

## Common Use Cases

### Use Case 1: Check if user has permission

```typescript
async someMethod(userId: string) {
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
    include: {
      positions: {
        include: {
          positionPermissions: {
            include: { permission: true },
          },
        },
      },
      subAdminProfile: true,
    },
  });

  // This will throw ForbiddenException if user lacks permission
  this.rbacService.checkPermission(
    user,
    PermissionResource.PRODUCTS,
    [PermissionAction.VIEW]
  );

  // Continue with your logic...
}
```

### Use Case 2: Build scope filter for list queries

```typescript
async findAll(userId: string, filters: any) {
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
    include: {
      positions: {
        include: {
          positionPermissions: {
            include: { permission: true },
          },
        },
      },
      subAdminProfile: true,
    },
  });

  let where: any = { ...filters };

  if (user.role === UserRole.SUB_ADMIN) {
    // Check permissions
    this.rbacService.checkPermission(
      user,
      PermissionResource.PRODUCTS,
      [PermissionAction.VIEW]
    );

    // Build scope filter
    const scopeFilter = this.rbacService.buildScopeFilter(
      user,
      PermissionResource.PRODUCTS,
      [PermissionAction.VIEW],
      {
        includeLocation: true,
        includeOrganization: false,
      }
    );

    if (scopeFilter) {
      where = { ...where, ...scopeFilter };
    }
  }

  return this.prisma.product.findMany({ where });
}
```

### Use Case 3: Validate access to a specific entity

```typescript
async updateProduct(userId: string, productId: string, updateDto: any) {
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
    include: {
      positions: {
        include: {
          positionPermissions: {
            include: { permission: true },
          },
        },
      },
      subAdminProfile: true,
    },
  });

  const product = await this.prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) {
    throw new NotFoundException('Product not found');
  }

  if (user.role === UserRole.SUB_ADMIN) {
    // Validate that this specific product is within user's scope
    await this.rbacService.validateResourceAccess(
      user,
      PermissionResource.PRODUCTS,
      [PermissionAction.EDIT],
      product,
      {
        includeLocation: true,
        userFields: {
          city: 'city',
          state: 'state',
          country: 'country',
        }
      }
    );
  }

  // Proceed with update...
  return this.prisma.product.update({
    where: { id: productId },
    data: updateDto,
  });
}
```

### Use Case 4: Orders with nested address fields

```typescript
async findOrders(userId: string) {
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
    include: {
      positions: {
        include: {
          positionPermissions: {
            include: { permission: true },
          },
        },
      },
      subAdminProfile: true,
    },
  });

  let where: any = {};

  if (user.role === UserRole.SUB_ADMIN) {
    this.rbacService.checkPermission(
      user,
      PermissionResource.ORDERS,
      [PermissionAction.VIEW]
    );

    const scopeFilter = this.rbacService.buildScopeFilter(
      user,
      PermissionResource.ORDERS,
      [PermissionAction.VIEW],
      {
        addressField: 'shippingAddress', // For nested address objects
        includeLocation: true,
      }
    );

    if (scopeFilter) {
      // Apply to both shippingAddress and address fields
      where.OR = [
        { shippingAddress: scopeFilter },
        { address: scopeFilter }
      ];
    }
  }

  return this.prisma.order.findMany({ where });
}
```

### Use Case 5: Users with custom field mappings

```typescript
async findUsers(userId: string) {
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
    include: {
      positions: {
        include: {
          positionPermissions: {
            include: { permission: true },
          },
        },
      },
      subAdminProfile: true,
    },
  });

  let where: any = {};

  if (user.role === UserRole.SUB_ADMIN) {
    this.rbacService.checkPermission(
      user,
      PermissionResource.USERS,
      [PermissionAction.VIEW]
    );

    const scopeFilter = this.rbacService.buildScopeFilter(
      user,
      PermissionResource.USERS,
      [PermissionAction.VIEW],
      {
        includeLocation: true,
        includeOrganization: true,
        includeLevel: true,
        userFields: {
          city: 'assignedCity',      // Custom field names
          state: 'assignedState',
          region: 'assignedRegion',
          country: 'assignedCountry',
          department: 'department',
          team: 'team',
        }
      }
    );

    if (scopeFilter) {
      where = { ...where, ...scopeFilter };
    }
  }

  return this.prisma.user.findMany({ where });
}
```

## Filter Options

### RbacFilterOptions

```typescript
interface RbacFilterOptions {
  // Include location-based filtering (cities, states, regions, countries)
  includeLocation?: boolean;
  
  // Include organization-based filtering (departments, teams)
  includeOrganization?: boolean;
  
  // Include permission level filtering (hierarchical RBAC)
  includeLevel?: boolean;
  
  // For nested address objects (e.g., 'shippingAddress', 'address')
  addressField?: string;
  
  // Custom field name mappings
  userFields?: {
    city?: string;
    state?: string;
    country?: string;
    region?: string;
    department?: string;
    team?: string;
  };
}
```

## Benefits

1. **DRY**: Write RBAC logic once, use everywhere
2. **Consistency**: Same security rules across all modules
3. **Maintainability**: Update RBAC rules in one place
4. **Type Safety**: Full TypeScript support
5. **Flexibility**: Configurable for different use cases
6. **Testability**: Easy to unit test centralized logic

## Migration from Old Code

### Before (Duplicated Logic)

```typescript
// 60+ lines of filter building code in every service
const permissions = user.positions.flatMap(p => ...);
const orderPermissions = permissions.filter(p => ...);
const profileCities = user.subAdminProfile?.allowedCities || [];
// ... many more lines
```

### After (Using RbacService)

```typescript
// 5-10 lines using RbacService
this.rbacService.checkPermission(user, PermissionResource.ORDERS, [PermissionAction.VIEW]);
const scopeFilter = this.rbacService.buildScopeFilter(user, PermissionResource.ORDERS, [PermissionAction.VIEW]);
if (scopeFilter) where = { ...where, ...scopeFilter };
```

## Testing

```typescript
describe('RbacService', () => {
  let service: RbacService;

  beforeEach(() => {
    service = new RbacService();
  });

  it('should check permissions correctly', () => {
    const user = {
      // ... mock user with permissions
    };

    expect(() => 
      service.checkPermission(user, PermissionResource.ORDERS, [PermissionAction.VIEW])
    ).not.toThrow();
  });

  it('should build scope filters correctly', () => {
    const user = {
      // ... mock user with scoped permissions
    };

    const filter = service.buildScopeFilter(
      user,
      PermissionResource.ORDERS,
      [PermissionAction.VIEW],
      { includeLocation: true }
    );

    expect(filter).toBeDefined();
    expect(filter.AND).toBeDefined();
  });
});
```
