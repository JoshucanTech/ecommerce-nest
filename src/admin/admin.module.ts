import { Module } from '@nestjs/common';
import { PermissionsModule } from './permissions/permissions.module';
import { PositionsModule } from './positions/positions.module';
import { SubAdminsModule } from './sub-admins/sub-admins.module';

@Module({
    imports: [PermissionsModule, PositionsModule, SubAdminsModule],
    exports: [PermissionsModule, PositionsModule, SubAdminsModule],
})
export class AdminModule { }
