import { PartialType } from '@nestjs/mapped-types';
import { CreateRealTimeDto } from './create-real-time.dto';

export class UpdateRealTimeDto extends PartialType(CreateRealTimeDto) {
  id: number;
}
