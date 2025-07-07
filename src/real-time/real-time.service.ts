import { Injectable } from '@nestjs/common';
import { CreateRealTimeDto } from './dto/create-real-time.dto';
import { UpdateRealTimeDto } from './dto/update-real-time.dto';

@Injectable()
export class RealTimeService {
  create(createRealTimeDto: CreateRealTimeDto) {
    return 'This action adds a new realTime';
  }

  findAll() {
    return `This action returns all realTime`;
  }

  findOne(id: number) {
    return `This action returns a #${id} realTime`;
  }

  update(id: number, updateRealTimeDto: UpdateRealTimeDto) {
    return `This action updates a #${id} realTime`;
  }

  remove(id: number) {
    return `This action removes a #${id} realTime`;
  }
}
