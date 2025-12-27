import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
} from '@nestjs/websockets';
import { RealTimeService } from './real-time.service';
import { CreateRealTimeDto } from './dto/create-real-time.dto';
import { UpdateRealTimeDto } from './dto/update-real-time.dto';

@WebSocketGateway()
export class RealTimeGateway {
  constructor(private readonly realTimeService: RealTimeService) {}

  @SubscribeMessage('createRealTime')
  create(@MessageBody() createRealTimeDto: CreateRealTimeDto) {
    return this.realTimeService.create(createRealTimeDto);
  }

  @SubscribeMessage('findAllRealTime')
  findAll() {
    return this.realTimeService.findAll();
  }

  @SubscribeMessage('findOneRealTime')
  findOne(@MessageBody() id: number) {
    return this.realTimeService.findOne(id);
  }

  @SubscribeMessage('updateRealTime')
  update(@MessageBody() updateRealTimeDto: UpdateRealTimeDto) {
    return this.realTimeService.update(updateRealTimeDto.id, updateRealTimeDto);
  }

  @SubscribeMessage('removeRealTime')
  remove(@MessageBody() id: number) {
    return this.realTimeService.remove(id);
  }
}
