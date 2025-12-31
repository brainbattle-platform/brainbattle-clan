import { Test, TestingModule } from '@nestjs/testing';
import { CommunityService } from './community.service';
import { PrismaService } from '../prisma/prisma.service';
import { CoreEventEmitter } from '../events/core-event.emitter';

describe('CommunityService', () => {
  let service: CommunityService;
  let mockPrisma: any;
  let mockEvents: any;

  beforeEach(async () => {
    mockPrisma = {
      clan: {
        create: jest.fn(),
        findUnique: jest.fn(),
      },
      clanMember: {
        create: jest.fn(),
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
      clanJoinRequest: {
        findFirst: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
    };
    mockEvents = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommunityService,
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

    service = module.get<CommunityService>(CommunityService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createClan', () => {
    it('should throw for invalid visibility', async () => {
      await expect(service.createClan('user1', { name: 'Test Clan', visibility: 'invalid' as any })).rejects.toThrow('invalid_visibility');
    });

    it('should create clan and member', async () => {
      mockPrisma.clan.create.mockResolvedValue({ id: 'clan1', name: 'Test Clan', slug: 'test-clan-abc', visibility: 'public', createdBy: 'user1' });
      mockPrisma.clanMember.create.mockResolvedValue({});
      const result = await service.createClan('user1', { name: 'Test Clan', visibility: 'public' });
      expect(result).toEqual({ id: 'clan1', name: 'Test Clan', slug: 'test-clan-abc', visibility: 'public', createdBy: 'user1' });
      expect(mockPrisma.clan.create).toHaveBeenCalled();
      expect(mockPrisma.clanMember.create).toHaveBeenCalledWith({
        data: { clanId: 'clan1', userId: 'user1', role: 'leader', status: 'active' },
      });
      expect(mockEvents.emit).toHaveBeenCalledWith('clan.created', { clanId: 'clan1', leaderId: 'user1' });
    });
  });

  describe('requestJoin', () => {
    it('should throw if clan not found', async () => {
      mockPrisma.clan.findUnique.mockResolvedValue(null);
      await expect(service.requestJoin('user1', 'clan1')).rejects.toThrow('Clan not found');
    });

    it('should throw if already active member', async () => {
      mockPrisma.clan.findUnique.mockResolvedValue({ id: 'clan1', visibility: 'public' });
      mockPrisma.clanMember.findUnique.mockResolvedValue({ status: 'active' });
      await expect(service.requestJoin('user1', 'clan1')).rejects.toThrow('already_in_clan');
    });

    it('should throw if banned', async () => {
      mockPrisma.clan.findUnique.mockResolvedValue({ id: 'clan1', visibility: 'public' });
      mockPrisma.clanMember.findUnique.mockResolvedValue({ status: 'banned' });
      await expect(service.requestJoin('user1', 'clan1')).rejects.toThrow('banned');
    });

    it('should join public clan directly', async () => {
      mockPrisma.clan.findUnique.mockResolvedValue({ id: 'clan1', visibility: 'public' });
      mockPrisma.clanMember.findUnique.mockResolvedValue(null);
      mockPrisma.clanMember.upsert.mockResolvedValue({});
      const result = await service.requestJoin('user1', 'clan1');
      expect(result).toEqual({ ok: true, joined: true, pending: false });
      expect(mockEvents.emit).toHaveBeenCalledWith('clan.member.joined', {
        clanId: 'clan1',
        userId: 'user1',
        by: 'auto-public',
      });
    });

    it('should create pending request for private clan', async () => {
      mockPrisma.clan.findUnique.mockResolvedValue({ id: 'clan1', visibility: 'private' });
      mockPrisma.clanMember.findUnique.mockResolvedValue(null);
      mockPrisma.clanJoinRequest.findFirst.mockResolvedValue(null);
      mockPrisma.clanJoinRequest.create.mockResolvedValue({ id: 'req1' });
      const result = await service.requestJoin('user1', 'clan1');
      expect(result).toEqual({ ok: true, joined: false, pending: true, requestId: 'req1' });
    });

    it('should update existing rejected request to pending', async () => {
      mockPrisma.clan.findUnique.mockResolvedValue({ id: 'clan1', visibility: 'private' });
      mockPrisma.clanMember.findUnique.mockResolvedValue(null);
      mockPrisma.clanJoinRequest.findFirst.mockResolvedValue({ id: 'req1', status: 'rejected' });
      mockPrisma.clanJoinRequest.update.mockResolvedValue({});
      const result = await service.requestJoin('user1', 'clan1');
      expect(result).toEqual({ ok: true, joined: false, pending: true, requestId: 'req1' });
      expect(mockPrisma.clanJoinRequest.update).toHaveBeenCalledWith({
        where: { id: 'req1' },
        data: { status: 'pending', reviewedBy: null, reviewedAt: null },
      });
    });
  });

  it('should return pong', () => {
    expect(service.ping()).toBe('pong');
  });

  it('should validate clan name successfully', () => {
    expect(() => service.validateClanName('Valid Clan')).not.toThrow();
  });

  it('should throw for invalid clan name', () => {
    expect(() => service.validateClanName('')).toThrow('Clan name must be at least 3 characters');
    expect(() => service.validateClanName('ab')).toThrow('Clan name must be at least 3 characters');
  });

  it('should normalize clan slug', () => {
    expect(service.normalizeClanSlug('My Clan Name')).toBe('my-clan-name');
    expect(service.normalizeClanSlug('Test Clan!')).toBe('test-clan');
  });

  it('should check valid role', () => {
    expect(service.isValidRole('leader')).toBe(true);
    expect(service.isValidRole('member')).toBe(true);
    expect(service.isValidRole('officer')).toBe(true);
    expect(service.isValidRole('admin')).toBe(false);
  });
});
