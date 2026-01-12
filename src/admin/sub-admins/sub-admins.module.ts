import { Module } from '@nestjs/common';
import { SubAdminsService } from './sub-admins.service';
import { SubAdminsController } from './sub-admins.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [SubAdminsController],
    providers: [SubAdminsService],
    exports: [SubAdminsService],
})
export class SubAdminsModule { }
