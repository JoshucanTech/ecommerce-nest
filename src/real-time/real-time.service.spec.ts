import { Test, TestingModule } from '@nestjs/testing';
import { RealTimeService } from './real-time.service';

describe('RealTimeService', () => {
  let service: RealTimeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RealTimeService],
    }).compile();

    service = module.get<RealTimeService>(RealTimeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
