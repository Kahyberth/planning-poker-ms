import { Test, TestingModule } from '@nestjs/testing';
import { MagicLinkServiceService } from './magic-link-service.service';

describe('MagicLinkServiceService', () => {
  let service: MagicLinkServiceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MagicLinkServiceService],
    }).compile();

    service = module.get<MagicLinkServiceService>(MagicLinkServiceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
