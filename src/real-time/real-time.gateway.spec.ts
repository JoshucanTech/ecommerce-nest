import { Test, TestingModule } from '@nestjs/testing';
import { RealTimeGateway } from './real-time.gateway';
import { RealTimeService } from './real-time.service';

describe('RealTimeGateway', () => {
  let gateway: RealTimeGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RealTimeGateway, RealTimeService],
    }).compile();

    gateway = module.get<RealTimeGateway>(RealTimeGateway);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
});
