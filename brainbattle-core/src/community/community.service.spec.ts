import { Test, TestingModule } from '@nestjs/testing';
import { CommunityService } from './community.service';
import { PrismaService } from '../prisma/prisma.service';
import { CoreEventEmitter } from '../events/core-event.emitter';

describe('CommunityService', () => {
  let service: CommunityService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommunityService,
        {
          provide: PrismaService,
          useValue: {}, // mock
        },
        {
          provide: CoreEventEmitter,
          useValue: {}, // mock
        },
      ],
    }).compile();

    service = module.get<CommunityService>(CommunityService);
  });

  it('should return pong', () => {
    expect(service.ping()).toBe('pong');
  });
});
