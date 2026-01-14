import { Test, TestingModule } from '@nestjs/testing';
import { SocialService } from './social.service';
import { PrismaService } from '../prisma/prisma.service';
import { CoreEventEmitter } from '../events/core-event.emitter';

describe('SocialService', () => {
  let service: SocialService;
  let mockPrisma: any;
  let mockEvents: any;

  beforeEach(async () => {
    mockPrisma = {
      follow: {
        create: jest.fn(),
        deleteMany: jest.fn(),
        findUnique: jest.fn(),
      },
      block: {
        create: jest.fn(),
        deleteMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
      },
    };
    mockEvents = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SocialService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: CoreEventEmitter,
          useValue: mockEvents,
        },
      ],
    }).compile();

    service = module.get<SocialService>(SocialService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('follow', () => {
    it('should throw for same user', async () => {
      await expect(service.follow('user1', 'user1')).rejects.toThrow(
        'cannot_follow_self',
      );
    });

    it('should throw if blocked', async () => {
      mockPrisma.block.findFirst.mockResolvedValue({ blockerId: 'user2' });
      await expect(service.follow('user1', 'user2')).rejects.toThrow('blocked');
    });

    it('should return already followed if exists', async () => {
      mockPrisma.block.findFirst.mockResolvedValue(null);
      mockPrisma.follow.findUnique.mockResolvedValueOnce({
        followerId: 'user1',
      }); // hasFollow true
      mockPrisma.follow.findUnique.mockResolvedValueOnce(null); // mutual false
      const result = await service.follow('user1', 'user2');
      expect(result).toEqual({
        ok: true,
        mutual: false,
        alreadyFollowed: true,
      });
      expect(mockPrisma.follow.create).not.toHaveBeenCalled();
    });

    it('should create follow and emit events', async () => {
      mockPrisma.block.findFirst.mockResolvedValue(null);
      mockPrisma.follow.findUnique.mockResolvedValue(null); // not following
      mockPrisma.follow.create.mockResolvedValue({});
      mockPrisma.follow.findUnique.mockResolvedValue(null); // no mutual
      const result = await service.follow('user1', 'user2');
      expect(result).toEqual({
        ok: true,
        mutual: false,
        alreadyFollowed: false,
      });
      expect(mockPrisma.follow.create).toHaveBeenCalledWith({
        data: { followerId: 'user1', followeeId: 'user2' },
      });
      expect(mockEvents.emit).toHaveBeenCalledWith('social.follow.created', {
        followerId: 'user1',
        followeeId: 'user2',
      });
    });
  });

  describe('unfollow', () => {
    it('should throw for same user', async () => {
      await expect(service.unfollow('user1', 'user1')).rejects.toThrow(
        'cannot_unfollow_self',
      );
    });

    it('should delete follow and emit if exists', async () => {
      mockPrisma.follow.deleteMany.mockResolvedValue({ count: 1 });
      const result = await service.unfollow('user1', 'user2');
      expect(result).toEqual({ ok: true, deleted: 1 });
      expect(mockEvents.emit).toHaveBeenCalledWith('social.follow.deleted', {
        followerId: 'user1',
        followeeId: 'user2',
        reason: 'unfollow',
      });
    });

    it('should return deleted 0 if not following', async () => {
      mockPrisma.follow.deleteMany.mockResolvedValue({ count: 0 });
      const result = await service.unfollow('user1', 'user2');
      expect(result).toEqual({ ok: true, deleted: 0 });
      expect(mockEvents.emit).not.toHaveBeenCalled();
    });
  });

  describe('block', () => {
    it('should throw for same user', async () => {
      await expect(service.block('user1', 'user1')).rejects.toThrow(
        'cannot_block_self',
      );
    });

    it('should create block if not exists and cleanup follows', async () => {
      mockPrisma.block.findUnique.mockResolvedValue(null); // not blocked
      mockPrisma.block.create.mockResolvedValue({});
      mockPrisma.follow.deleteMany.mockResolvedValueOnce({ count: 1 }); // a2b
      mockPrisma.follow.deleteMany.mockResolvedValueOnce({ count: 0 }); // b2a
      await service.block('user1', 'user2');
      expect(mockPrisma.block.create).toHaveBeenCalledWith({
        data: { blockerId: 'user1', blockeeId: 'user2' },
      });
      expect(mockEvents.emit).toHaveBeenCalledWith('social.block.created', {
        blockerId: 'user1',
        blockeeId: 'user2',
      });
      expect(mockEvents.emit).toHaveBeenCalledWith('social.follow.deleted', {
        followerId: 'user1',
        followeeId: 'user2',
        reason: 'blocked',
      });
    });

    it('should not create if already blocked', async () => {
      mockPrisma.block.findUnique.mockResolvedValue({ blockerId: 'user1' });
      mockPrisma.follow.deleteMany.mockResolvedValue({ count: 0 });
      await service.block('user1', 'user2');
      expect(mockPrisma.block.create).not.toHaveBeenCalled();
      expect(mockEvents.emit).not.toHaveBeenCalledWith(
        'social.block.created',
        expect.anything(),
      );
    });
  });

  it('should not throw for different users', () => {
    expect(() =>
      service['ensureNotSelf']('user1', 'user2', 'cannot follow self'),
    ).not.toThrow();
  });

  it('should throw for same user', () => {
    expect(() =>
      service['ensureNotSelf']('user1', 'user1', 'cannot follow self'),
    ).toThrow('cannot follow self');
  });
});
