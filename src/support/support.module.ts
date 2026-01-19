import { Module } from '@nestjs/common';
import { SupportService } from './support.service';
import { SupportController } from './support.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { RbacModule } from '../common/rbac';

@Module({
    imports: [PrismaModule, RbacModule],
    controllers: [SupportController],
    providers: [SupportService],
    exports: [SupportService],
})
export class SupportModule { }
