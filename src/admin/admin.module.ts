import { Module } from '@nestjs/common';
import { PermissionsModule } from './permissions/permissions.module';
import { RolesModule } from './roles/roles.module';
import { SubAdminsModule } from './sub-admins/sub-admins.module';

@Module({
    imports: [PermissionsModule, RolesModule, SubAdminsModule],
    exports: [PermissionsModule, RolesModule, SubAdminsModule],
})
export class AdminModule { }
