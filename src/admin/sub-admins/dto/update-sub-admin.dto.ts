import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateSubAdminDto } from './create-sub-admin.dto';

export class UpdateSubAdminDto extends PartialType(
    OmitType(CreateSubAdminDto, ['password', 'email'] as const),
) { }
