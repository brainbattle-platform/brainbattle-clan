import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { CommunityController } from '../community/community.controller';
import { CommunityService } from '../community/community.service';
import { CreateClanDto } from '../community/dto/create-clan.dto';
import { ApproveJoinDto } from '../community/dto/approve-join.dto';
import { ModerationController } from '../moderation/moderation.controller';
import { ModerationService } from '../moderation/moderation.service';
import { CreateReportDto } from '../moderation/dto/create-report.dto';
import { ResolveReportDto } from '../moderation/dto/resolve-report.dto';
import { SocialController } from '../social/social.controller';
import { SocialService } from '../social/social.service';
import { JwtGuard } from '../security/jwt.guard';

import { Request } from 'express';

type AuthedRequest = Request & { user?: { id: string; role?: string } };

// Fixtures
const makeUser = (overrides?: Partial<{ id: string; role?: string }>) => ({ id: 'user-123', ...overrides });
const makeReq = (overrides?: Partial<{ id: string; role?: string }>) => ({ user: makeUser(overrides) } as unknown as AuthedRequest);
const makeCreateClanDto = (): CreateClanDto => ({ name: 'Test Clan', visibility: 'public' as const });
const makeApproveJoinDto = (): ApproveJoinDto => ({ userId: 'target-user-456' });
const makeCreateReportDto = (): CreateReportDto => ({ subjectType: 'user', subjectId: 'target-789', reason: 'Spam content' });
const makeResolveReportDto = (): ResolveReportDto => ({ status: 'resolved' });

// Helper to create test module with mocked guards
async function createControllerTestModule<T>(
  ControllerClass: new (...args: any[]) => T,
  providers: any[]
): Promise<{ controller: T; module: TestingModule }> {
  const module: TestingModule = await Test.createTestingModule({
    controllers: [ControllerClass],
    providers,
  })
    .overrideGuard(JwtGuard)
    .useValue({ canActivate: () => true })
    .compile();

  const controller = module.get<T>(ControllerClass);
  return { controller, module };
}

// BR30 - Create Clan
describe('BR30 - Create Clan', () => {
  let controller: CommunityController;
  let mockService: jest.Mocked<CommunityService>;

  beforeEach(async () => {
    mockService = {
      createClan: jest.fn(),
    } as any;

    const { controller: ctrl } = await createControllerTestModule(CommunityController, [
      { provide: CommunityService, useValue: mockService },
    ]);
    controller = ctrl;
  });

  // TC0080-CLAN-BR30-T1
  it('TC0080-CLAN-BR30-T1 - happy path', async () => {
    const dto = makeCreateClanDto();
    const expected = { id: 'clan-1', name: dto.name, visibility: dto.visibility, slug: 'test-clan-1234', createdBy: makeUser().id };
    mockService.createClan.mockResolvedValue(expected);
    const result = await controller.create(makeReq(), dto);
    expect(result).toEqual(expected);
    expect(mockService.createClan).toHaveBeenCalledWith(makeUser().id, dto);
    expect(mockService.createClan).toHaveBeenCalledTimes(1);
  });

  // TC0081-CLAN-BR30-T2
  it('TC0081-CLAN-BR30-T2 - validation fail', async () => {
    const dto = makeCreateClanDto();
    mockService.createClan.mockRejectedValue(new BadRequestException('Invalid name'));
    await expect(controller.create(makeReq(), dto)).rejects.toThrow(BadRequestException);
    expect(mockService.createClan).toHaveBeenCalledWith(makeUser().id, dto);
  });

  // TC0082-CLAN-BR30-T3
  it('TC0082-CLAN-BR30-T3 - forbidden', async () => {
    const dto = makeCreateClanDto();
    mockService.createClan.mockRejectedValue(new ForbiddenException('Not allowed'));
    await expect(controller.create(makeReq(), dto)).rejects.toThrow(ForbiddenException);
  });
});

// BR31 - Get Clan
describe('BR31 - Get Clan', () => {
  let controller: CommunityController;
  let mockService: jest.Mocked<CommunityService>;

  beforeEach(async () => {
    mockService = {
      getClan: jest.fn(),
    } as any;

    const { controller: ctrl } = await createControllerTestModule(CommunityController, [
      { provide: CommunityService, useValue: mockService },
    ]);
    controller = ctrl;
  });

  // TC0083-CLAN-BR31-T1
  it('TC0083-CLAN-BR31-T1 - happy path', async () => {
    const clanId = 'clan-1';
    const expected = { id: clanId, name: 'Test Clan', visibility: 'public', slug: 'test-clan', createdBy: 'creator' };
    mockService.getClan.mockResolvedValue(expected);
    const result = await controller.get(clanId);
    expect(result).toEqual(expected);
    expect(mockService.getClan).toHaveBeenCalledWith(clanId);
    expect(mockService.getClan).toHaveBeenCalledTimes(1);
  });

  // TC0084-CLAN-BR31-T2
  it('TC0084-CLAN-BR31-T2 - not found', async () => {
    const clanId = 'clan-1';
    mockService.getClan.mockRejectedValue(new NotFoundException('Clan not found'));
    await expect(controller.get(clanId)).rejects.toThrow(NotFoundException);
    expect(mockService.getClan).toHaveBeenCalledWith(clanId);
  });

  // TC0085-CLAN-BR31-T3
  it('TC0085-CLAN-BR31-T3 - forbidden', async () => {
    const clanId = 'clan-1';
    mockService.getClan.mockRejectedValue(new ForbiddenException('Access denied'));
    await expect(controller.get(clanId)).rejects.toThrow(ForbiddenException);
  });
});

// BR32 - List Members
describe('BR32 - List Members', () => {
  let controller: CommunityController;
  let mockService: jest.Mocked<CommunityService>;

  beforeEach(async () => {
    mockService = {
      listMembers: jest.fn(),
    } as any;

    const { controller: ctrl } = await createControllerTestModule(CommunityController, [
      { provide: CommunityService, useValue: mockService },
    ]);
    controller = ctrl;
  });

  // TC0086-CLAN-BR32-T1
  it('TC0086-CLAN-BR32-T1 - happy path', async () => {
    const clanId = 'clan-1';
    const expected = [{ clanId, userId: 'user-1', role: 'member', status: 'active' }];
    mockService.listMembers.mockResolvedValue(expected);
    const result = await controller.members(clanId);
    expect(result).toEqual(expected);
    expect(mockService.listMembers).toHaveBeenCalledWith(clanId);
    expect(mockService.listMembers).toHaveBeenCalledTimes(1);
  });

  // TC0087-CLAN-BR32-T2
  it('TC0087-CLAN-BR32-T2 - not found', async () => {
    const clanId = 'clan-1';
    mockService.listMembers.mockRejectedValue(new NotFoundException('Clan not found'));
    await expect(controller.members(clanId)).rejects.toThrow(NotFoundException);
    expect(mockService.listMembers).toHaveBeenCalledWith(clanId);
  });
});

// BR33 - Join Clan
describe('BR33 - Join Clan', () => {
  let controller: CommunityController;
  let mockService: jest.Mocked<CommunityService>;

  beforeEach(async () => {
    mockService = {
      requestJoin: jest.fn(),
    } as any;

    const { controller: ctrl } = await createControllerTestModule(CommunityController, [
      { provide: CommunityService, useValue: mockService },
    ]);
    controller = ctrl;
  });

  // TC0088-CLAN-BR33-T1
  it('TC0088-CLAN-BR33-T1 - happy path', async () => {
    const clanId = 'clan-1';
    const expected = { ok: true, joined: true, pending: false };
    mockService.requestJoin.mockResolvedValue(expected);
    const result = await controller.join(makeReq(), clanId);
    expect(result).toEqual(expected);
    expect(mockService.requestJoin).toHaveBeenCalledWith(makeUser().id, clanId);
    expect(mockService.requestJoin).toHaveBeenCalledTimes(1);
  });

  // TC0089-CLAN-BR33-T2
  it('TC0089-CLAN-BR33-T2 - validation fail', async () => {
    const clanId = 'clan-1';
    mockService.requestJoin.mockRejectedValue(new BadRequestException('Already member'));
    await expect(controller.join(makeReq(), clanId)).rejects.toThrow(BadRequestException);
    expect(mockService.requestJoin).toHaveBeenCalledWith(makeUser().id, clanId);
  });
});

// BR34 - Approve Join
describe('BR34 - Approve Join', () => {
  let controller: CommunityController;
  let mockService: jest.Mocked<CommunityService>;

  beforeEach(async () => {
    mockService = {
      approveJoin: jest.fn(),
    } as any;

    const { controller: ctrl } = await createControllerTestModule(CommunityController, [
      { provide: CommunityService, useValue: mockService },
    ]);
    controller = ctrl;
  });

  // TC0090-CLAN-BR34-T1
  it('TC0090-CLAN-BR34-T1 - happy path', async () => {
    const clanId = 'clan-1';
    const dto = makeApproveJoinDto();
    const expected = { ok: true };
    mockService.approveJoin.mockResolvedValue(expected);
    const result = await controller.approve(makeReq(), clanId, dto);
    expect(result).toEqual(expected);
    expect(mockService.approveJoin).toHaveBeenCalledWith(makeUser().id, clanId, dto.userId);
    expect(mockService.approveJoin).toHaveBeenCalledTimes(1);
  });

  // TC0091-CLAN-BR34-T2
  it('TC0091-CLAN-BR34-T2 - forbidden', async () => {
    const clanId = 'clan-1';
    const dto = makeApproveJoinDto();
    mockService.approveJoin.mockRejectedValue(new ForbiddenException('Not leader'));
    await expect(controller.approve(makeReq(), clanId, dto)).rejects.toThrow(ForbiddenException);
    expect(mockService.approveJoin).toHaveBeenCalledWith(makeUser().id, clanId, dto.userId);
  });
});

// BR35 - Leave Clan
describe('BR35 - Leave Clan', () => {
  let controller: CommunityController;
  let mockService: jest.Mocked<CommunityService>;

  beforeEach(async () => {
    mockService = {
      leaveClan: jest.fn(),
    } as any;

    const { controller: ctrl } = await createControllerTestModule(CommunityController, [
      { provide: CommunityService, useValue: mockService },
    ]);
    controller = ctrl;
  });

  // TC0092-CLAN-BR35-T1
  it('TC0092-CLAN-BR35-T1 - happy path', async () => {
    const clanId = 'clan-1';
    const expected = { ok: true };
    mockService.leaveClan.mockResolvedValue(expected);
    const result = await controller.leave(makeReq(), clanId);
    expect(result).toEqual(expected);
    expect(mockService.leaveClan).toHaveBeenCalledWith(makeUser().id, clanId);
    expect(mockService.leaveClan).toHaveBeenCalledTimes(1);
  });

  // TC0093-CLAN-BR35-T2
  it('TC0093-CLAN-BR35-T2 - validation fail', async () => {
    const clanId = 'clan-1';
    mockService.leaveClan.mockRejectedValue(new BadRequestException('Cannot leave as leader'));
    await expect(controller.leave(makeReq(), clanId)).rejects.toThrow(BadRequestException);
    expect(mockService.leaveClan).toHaveBeenCalledWith(makeUser().id, clanId);
  });
});

// BR36 - Ban Member
describe('BR36 - Ban Member', () => {
  let controller: CommunityController;
  let mockService: jest.Mocked<CommunityService>;

  beforeEach(async () => {
    mockService = {
      banMember: jest.fn(),
    } as any;

    const { controller: ctrl } = await createControllerTestModule(CommunityController, [
      { provide: CommunityService, useValue: mockService },
    ]);
    controller = ctrl;
  });

  // TC0094-CLAN-BR36-T1
  it('TC0094-CLAN-BR36-T1 - happy path', async () => {
    const clanId = 'clan-1';
    const userId = 'target-user';
    const expected = { ok: true };
    mockService.banMember.mockResolvedValue(expected);
    const result = await controller.ban(makeReq(), clanId, userId);
    expect(result).toEqual(expected);
    expect(mockService.banMember).toHaveBeenCalledWith(makeUser().id, clanId, userId);
    expect(mockService.banMember).toHaveBeenCalledTimes(1);
  });

  // TC0095-CLAN-BR36-T2
  it('TC0095-CLAN-BR36-T2 - forbidden', async () => {
    const clanId = 'clan-1';
    const userId = 'target-user';
    mockService.banMember.mockRejectedValue(new ForbiddenException('Not leader'));
    await expect(controller.ban(makeReq(), clanId, userId)).rejects.toThrow(ForbiddenException);
    expect(mockService.banMember).toHaveBeenCalledWith(makeUser().id, clanId, userId);
  });

  // TC0096-CLAN-BR36-T3
  it('TC0096-CLAN-BR36-T3 - not found', async () => {
    const clanId = 'clan-1';
    const userId = 'target-user';
    mockService.banMember.mockRejectedValue(new NotFoundException('User not found'));
    await expect(controller.ban(makeReq(), clanId, userId)).rejects.toThrow(NotFoundException);
  });
});

// BR37 - Create Report
describe('BR37 - Create Report', () => {
  let controller: ModerationController;
  let mockService: jest.Mocked<ModerationService>;

  beforeEach(async () => {
    mockService = {
      create: jest.fn(),
    } as any;

    const { controller: ctrl } = await createControllerTestModule(ModerationController, [
      { provide: ModerationService, useValue: mockService },
    ]);
    controller = ctrl;
  });

  // TC0097-CLAN-BR37-T1
  it('TC0097-CLAN-BR37-T1 - happy path', async () => {
    const dto = makeCreateReportDto();
    const expected = { id: 'report-1', subjectType: dto.subjectType, subjectId: dto.subjectId, reason: dto.reason, reporterId: makeUser().id, status: 'open' };
    mockService.create.mockResolvedValue(expected);
    const result = await controller.create(makeReq(), dto);
    expect(result).toEqual(expected);
    expect(mockService.create).toHaveBeenCalledWith(dto, makeUser().id);
    expect(mockService.create).toHaveBeenCalledTimes(1);
  });

  // TC0098-CLAN-BR37-T2
  it('TC0098-CLAN-BR37-T2 - validation fail', async () => {
    const dto = makeCreateReportDto();
    mockService.create.mockRejectedValue(new BadRequestException('Invalid report'));
    await expect(controller.create(makeReq(), dto)).rejects.toThrow(BadRequestException);
    expect(mockService.create).toHaveBeenCalledWith(dto, makeUser().id);
  });
});

// BR38 - Resolve Report
describe('BR38 - Resolve Report', () => {
  let controller: ModerationController;
  let mockService: jest.Mocked<ModerationService>;

  beforeEach(async () => {
    mockService = {
      resolve: jest.fn(),
    } as any;

    const { controller: ctrl } = await createControllerTestModule(ModerationController, [
      { provide: ModerationService, useValue: mockService },
    ]);
    controller = ctrl;
  });

  // TC0099-CLAN-BR38-T1
  it('TC0099-CLAN-BR38-T1 - happy path', async () => {
    const id = 'report-1';
    const dto = makeResolveReportDto();
    const expected = { id, status: dto.status, resolvedAt: expect.any(Date) };
    mockService.resolve.mockResolvedValue(expected);
    const result = await controller.resolve(id, dto);
    expect(result).toEqual(expected);
    expect(mockService.resolve).toHaveBeenCalledWith(id, dto.status);
    expect(mockService.resolve).toHaveBeenCalledTimes(1);
  });

  // TC0100-CLAN-BR38-T2
  it('TC0100-CLAN-BR38-T2 - forbidden', async () => {
    const id = 'report-1';
    const dto = makeResolveReportDto();
    mockService.resolve.mockRejectedValue(new ForbiddenException('Not moderator'));
    await expect(controller.resolve(id, dto)).rejects.toThrow(ForbiddenException);
    expect(mockService.resolve).toHaveBeenCalledWith(id, dto.status);
  });
});

// BR39 - List Reports
describe('BR39 - List Reports', () => {
  let controller: ModerationController;
  let mockService: jest.Mocked<ModerationService>;

  beforeEach(async () => {
    mockService = {
      list: jest.fn(),
    } as any;

    const { controller: ctrl } = await createControllerTestModule(ModerationController, [
      { provide: ModerationService, useValue: mockService },
    ]);
    controller = ctrl;
  });

  // TC0101-CLAN-BR39-T1
  it('TC0101-CLAN-BR39-T1 - happy path', async () => {
    const expected = [{ id: 'report-1', subjectType: 'user', subjectId: 'user-1', reason: 'Spam', reporterId: 'reporter', status: 'open' }];
    mockService.list.mockResolvedValue(expected);
    const result = await controller.list();
    expect(result).toEqual(expected);
    expect(mockService.list).toHaveBeenCalledWith();
    expect(mockService.list).toHaveBeenCalledTimes(1);
  });

  // TC0102-CLAN-BR39-T2
  it('TC0102-CLAN-BR39-T2 - forbidden', async () => {
    mockService.list.mockRejectedValue(new ForbiddenException('Access denied'));
    await expect(controller.list()).rejects.toThrow(ForbiddenException);
    expect(mockService.list).toHaveBeenCalledWith();
  });
});

// BR40 - Follow User
describe('BR40 - Follow User', () => {
  let controller: SocialController;
  let mockService: jest.Mocked<SocialService>;

  beforeEach(async () => {
    mockService = {
      follow: jest.fn(),
    } as any;

    const { controller: ctrl } = await createControllerTestModule(SocialController, [
      { provide: SocialService, useValue: mockService },
    ]);
    controller = ctrl;
  });

  // TC0103-CLAN-BR40-T1
  it('TC0103-CLAN-BR40-T1 - happy path', async () => {
    const userId = 'target-user';
    const expected = { ok: true, mutual: false, alreadyFollowed: false };
    mockService.follow.mockResolvedValue(expected);
    const result = await controller.follow(makeReq(), userId);
    expect(result).toEqual(expected);
    expect(mockService.follow).toHaveBeenCalledWith(makeUser().id, userId);
    expect(mockService.follow).toHaveBeenCalledTimes(1);
  });

  // TC0104-CLAN-BR40-T2
  it('TC0104-CLAN-BR40-T2 - validation fail', async () => {
    const userId = 'target-user';
    mockService.follow.mockRejectedValue(new BadRequestException('Cannot follow self'));
    await expect(controller.follow(makeReq(), userId)).rejects.toThrow(BadRequestException);
    expect(mockService.follow).toHaveBeenCalledWith(makeUser().id, userId);
  });

  // TC0105-CLAN-BR40-T3
  it('TC0105-CLAN-BR40-T3 - not found', async () => {
    const userId = 'target-user';
    mockService.follow.mockRejectedValue(new NotFoundException('User not found'));
    await expect(controller.follow(makeReq(), userId)).rejects.toThrow(NotFoundException);
  });
});

// BR41 - Unfollow User
describe('BR41 - Unfollow User', () => {
  let controller: SocialController;
  let mockService: jest.Mocked<SocialService>;

  beforeEach(async () => {
    mockService = {
      unfollow: jest.fn(),
    } as any;

    const { controller: ctrl } = await createControllerTestModule(SocialController, [
      { provide: SocialService, useValue: mockService },
    ]);
    controller = ctrl;
  });

  // TC0106-CLAN-BR41-T1
  it('TC0106-CLAN-BR41-T1 - happy path', async () => {
    const userId = 'target-user';
    const expected = { ok: true, deleted: 1 };
    mockService.unfollow.mockResolvedValue(expected);
    const result = await controller.unfollow(makeReq(), userId);
    expect(result).toEqual(expected);
    expect(mockService.unfollow).toHaveBeenCalledWith(makeUser().id, userId);
    expect(mockService.unfollow).toHaveBeenCalledTimes(1);
  });

  // TC0107-CLAN-BR41-T2
  it('TC0107-CLAN-BR41-T2 - validation fail', async () => {
    const userId = 'target-user';
    mockService.unfollow.mockRejectedValue(new BadRequestException('Not following'));
    await expect(controller.unfollow(makeReq(), userId)).rejects.toThrow(BadRequestException);
    expect(mockService.unfollow).toHaveBeenCalledWith(makeUser().id, userId);
  });

  // TC0108-CLAN-BR41-T3
  it('TC0108-CLAN-BR41-T3 - not found', async () => {
    const userId = 'target-user';
    mockService.unfollow.mockRejectedValue(new NotFoundException('User not found'));
    await expect(controller.unfollow(makeReq(), userId)).rejects.toThrow(NotFoundException);
  });
});

// BR42 - Block User
describe('BR42 - Block User', () => {
  let controller: SocialController;
  let mockService: jest.Mocked<SocialService>;

  beforeEach(async () => {
    mockService = {
      block: jest.fn(),
    } as any;

    const { controller: ctrl } = await createControllerTestModule(SocialController, [
      { provide: SocialService, useValue: mockService },
    ]);
    controller = ctrl;
  });

  // TC0109-CLAN-BR42-T1
  it('TC0109-CLAN-BR42-T1 - happy path', async () => {
    const userId = 'target-user';
    const expected = { ok: true, alreadyBlocked: false, removedFollows: { a2b: 0, b2a: 0 } };
    mockService.block.mockResolvedValue(expected);
    const result = await controller.block(makeReq(), userId);
    expect(result).toEqual(expected);
    expect(mockService.block).toHaveBeenCalledWith(makeUser().id, userId);
    expect(mockService.block).toHaveBeenCalledTimes(1);
  });

  // TC0110-CLAN-BR42-T2
  it('TC0110-CLAN-BR42-T2 - validation fail', async () => {
    const userId = 'target-user';
    mockService.block.mockRejectedValue(new BadRequestException('Cannot block self'));
    await expect(controller.block(makeReq(), userId)).rejects.toThrow(BadRequestException);
    expect(mockService.block).toHaveBeenCalledWith(makeUser().id, userId);
  });

  // TC0111-CLAN-BR42-T3
  it('TC0111-CLAN-BR42-T3 - not found', async () => {
    const userId = 'target-user';
    mockService.block.mockRejectedValue(new NotFoundException('User not found'));
    await expect(controller.block(makeReq(), userId)).rejects.toThrow(NotFoundException);
  });
});

// BR43 - Create Clan (repeat)
describe('BR43 - Create Clan', () => {
  let controller: CommunityController;
  let mockService: jest.Mocked<CommunityService>;

  beforeEach(async () => {
    mockService = {
      createClan: jest.fn(),
    } as any;

    const { controller: ctrl } = await createControllerTestModule(CommunityController, [
      { provide: CommunityService, useValue: mockService },
    ]);
    controller = ctrl;
  });

  // TC0112-CLAN-BR43-T1
  it('TC0112-CLAN-BR43-T1 - happy path', async () => {
    const dto = makeCreateClanDto();
    const expected = { id: 'clan-1', name: dto.name, visibility: dto.visibility, slug: 'test-clan-1234', createdBy: makeUser().id };
    mockService.createClan.mockResolvedValue(expected);
    const result = await controller.create(makeReq(), dto);
    expect(result).toEqual(expected);
    expect(mockService.createClan).toHaveBeenCalledWith(makeUser().id, dto);
    expect(mockService.createClan).toHaveBeenCalledTimes(1);
  });

  // TC0113-CLAN-BR43-T2
  it('TC0113-CLAN-BR43-T2 - validation fail', async () => {
    const dto = makeCreateClanDto();
    mockService.createClan.mockRejectedValue(new BadRequestException('Invalid name'));
    await expect(controller.create(makeReq(), dto)).rejects.toThrow(BadRequestException);
    expect(mockService.createClan).toHaveBeenCalledWith(makeUser().id, dto);
  });

  // TC0114-CLAN-BR43-T3
  it('TC0114-CLAN-BR43-T3 - forbidden', async () => {
    const dto = makeCreateClanDto();
    mockService.createClan.mockRejectedValue(new ForbiddenException('Not allowed'));
    await expect(controller.create(makeReq(), dto)).rejects.toThrow(ForbiddenException);
  });
});

// BR44 - Get Clan (repeat)
describe('BR44 - Get Clan', () => {
  let controller: CommunityController;
  let mockService: jest.Mocked<CommunityService>;

  beforeEach(async () => {
    mockService = {
      getClan: jest.fn(),
    } as any;

    const { controller: ctrl } = await createControllerTestModule(CommunityController, [
      { provide: CommunityService, useValue: mockService },
    ]);
    controller = ctrl;
  });

  // TC0115-CLAN-BR44-T1
  it('TC0115-CLAN-BR44-T1 - happy path', async () => {
    const clanId = 'clan-1';
    const expected = { id: clanId, name: 'Test Clan', visibility: 'public', slug: 'test-clan', createdBy: 'creator' };
    mockService.getClan.mockResolvedValue(expected);
    const result = await controller.get(clanId);
    expect(result).toEqual(expected);
    expect(mockService.getClan).toHaveBeenCalledWith(clanId);
    expect(mockService.getClan).toHaveBeenCalledTimes(1);
  });

  // TC0116-CLAN-BR44-T2
  it('TC0116-CLAN-BR44-T2 - not found', async () => {
    const clanId = 'clan-1';
    mockService.getClan.mockRejectedValue(new NotFoundException('Clan not found'));
    await expect(controller.get(clanId)).rejects.toThrow(NotFoundException);
    expect(mockService.getClan).toHaveBeenCalledWith(clanId);
  });
});

// BR45 - Follow User (repeat)
describe('BR45 - Follow User', () => {
  let controller: SocialController;
  let mockService: jest.Mocked<SocialService>;

  beforeEach(async () => {
    mockService = {
      follow: jest.fn(),
    } as any;

    const { controller: ctrl } = await createControllerTestModule(SocialController, [
      { provide: SocialService, useValue: mockService },
    ]);
    controller = ctrl;
  });

  // TC0117-CLAN-BR45-T1
  it('TC0117-CLAN-BR45-T1 - happy path', async () => {
    const userId = 'target-user';
    const expected = { ok: true, mutual: false, alreadyFollowed: false };
    mockService.follow.mockResolvedValue(expected);
    const result = await controller.follow(makeReq(), userId);
    expect(result).toEqual(expected);
    expect(mockService.follow).toHaveBeenCalledWith(makeUser().id, userId);
    expect(mockService.follow).toHaveBeenCalledTimes(1);
  });

  // TC0118-CLAN-BR45-T2
  it('TC0118-CLAN-BR45-T2 - validation fail', async () => {
    const userId = 'target-user';
    mockService.follow.mockRejectedValue(new BadRequestException('Cannot follow self'));
    await expect(controller.follow(makeReq(), userId)).rejects.toThrow(BadRequestException);
    expect(mockService.follow).toHaveBeenCalledWith(makeUser().id, userId);
  });
});

// BR46 - Create Clan (repeat)
describe('BR46 - Create Clan', () => {
  let controller: CommunityController;
  let mockService: jest.Mocked<CommunityService>;

  beforeEach(async () => {
    mockService = {
      createClan: jest.fn(),
    } as any;

    const { controller: ctrl } = await createControllerTestModule(CommunityController, [
      { provide: CommunityService, useValue: mockService },
    ]);
    controller = ctrl;
  });

  // TC0119-CLAN-BR46-T1
  it('TC0119-CLAN-BR46-T1 - happy path', async () => {
    const dto = makeCreateClanDto();
    const expected = { id: 'clan-1', name: dto.name, visibility: dto.visibility, slug: 'test-clan-1234', createdBy: makeUser().id };
    mockService.createClan.mockResolvedValue(expected);
    const result = await controller.create(makeReq(), dto);
    expect(result).toEqual(expected);
    expect(mockService.createClan).toHaveBeenCalledWith(makeUser().id, dto);
    expect(mockService.createClan).toHaveBeenCalledTimes(1);
  });

  // TC0120-CLAN-BR46-T2
  it('TC0120-CLAN-BR46-T2 - validation fail', async () => {
    const dto = makeCreateClanDto();
    mockService.createClan.mockRejectedValue(new BadRequestException('Invalid name'));
    await expect(controller.create(makeReq(), dto)).rejects.toThrow(BadRequestException);
    expect(mockService.createClan).toHaveBeenCalledWith(makeUser().id, dto);
  });
});

// BR47 - Get Clan (repeat)
describe('BR47 - Get Clan', () => {
  let controller: CommunityController;
  let mockService: jest.Mocked<CommunityService>;

  beforeEach(async () => {
    mockService = {
      getClan: jest.fn(),
    } as any;

    const { controller: ctrl } = await createControllerTestModule(CommunityController, [
      { provide: CommunityService, useValue: mockService },
    ]);
    controller = ctrl;
  });

  // TC0121-CLAN-BR47-T1
  it('TC0121-CLAN-BR47-T1 - happy path', async () => {
    const clanId = 'clan-1';
    const expected = { id: clanId, name: 'Test Clan', visibility: 'public', slug: 'test-clan', createdBy: 'creator' };
    mockService.getClan.mockResolvedValue(expected);
    const result = await controller.get(clanId);
    expect(result).toEqual(expected);
    expect(mockService.getClan).toHaveBeenCalledWith(clanId);
    expect(mockService.getClan).toHaveBeenCalledTimes(1);
  });

  // TC0122-CLAN-BR47-T2
  it('TC0122-CLAN-BR47-T2 - not found', async () => {
    const clanId = 'clan-1';
    mockService.getClan.mockRejectedValue(new NotFoundException('Clan not found'));
    await expect(controller.get(clanId)).rejects.toThrow(NotFoundException);
    expect(mockService.getClan).toHaveBeenCalledWith(clanId);
  });
});

// BR48 - Follow User (repeat)
describe('BR48 - Follow User', () => {
  let controller: SocialController;
  let mockService: jest.Mocked<SocialService>;

  beforeEach(async () => {
    mockService = {
      follow: jest.fn(),
    } as any;

    const { controller: ctrl } = await createControllerTestModule(SocialController, [
      { provide: SocialService, useValue: mockService },
    ]);
    controller = ctrl;
  });

  // TC0123-CLAN-BR48-T1
  it('TC0123-CLAN-BR48-T1 - happy path', async () => {
    const userId = 'target-user';
    const expected = { ok: true, mutual: false, alreadyFollowed: false };
    mockService.follow.mockResolvedValue(expected);
    const result = await controller.follow(makeReq(), userId);
    expect(result).toEqual(expected);
    expect(mockService.follow).toHaveBeenCalledWith(makeUser().id, userId);
    expect(mockService.follow).toHaveBeenCalledTimes(1);
  });

  // TC0124-CLAN-BR48-T2
  it('TC0124-CLAN-BR48-T2 - validation fail', async () => {
    const userId = 'target-user';
    mockService.follow.mockRejectedValue(new BadRequestException('Cannot follow self'));
    await expect(controller.follow(makeReq(), userId)).rejects.toThrow(BadRequestException);
    expect(mockService.follow).toHaveBeenCalledWith(makeUser().id, userId);
  });
});

// BR49 - Create Clan
describe('BR49 - Create Clan', () => {
  let controller: CommunityController;
  let mockService: jest.Mocked<CommunityService>;

  beforeEach(async () => {
    mockService = {
      createClan: jest.fn(),
    } as any;

    const { controller: ctrl } = await createControllerTestModule(CommunityController, [
      { provide: CommunityService, useValue: mockService },
    ]);
    controller = ctrl;
  });

  // TC0125-CLAN-BR49-T1
  it('TC0125-CLAN-BR49-T1 - happy path', async () => {
    const dto = makeCreateClanDto();
    const expected = { id: 'clan-1', name: dto.name, visibility: dto.visibility, slug: 'test-clan-1234', createdBy: makeUser().id };
    mockService.createClan.mockResolvedValue(expected);
    const result = await controller.create(makeReq(), dto);
    expect(result).toEqual(expected);
    expect(mockService.createClan).toHaveBeenCalledWith(makeUser().id, dto);
    expect(mockService.createClan).toHaveBeenCalledTimes(1);
  });

  // TC0126-CLAN-BR49-T2
  it('TC0126-CLAN-BR49-T2 - validation fail', async () => {
    const dto = makeCreateClanDto();
    mockService.createClan.mockRejectedValue(new BadRequestException('Invalid name'));
    await expect(controller.create(makeReq(), dto)).rejects.toThrow(BadRequestException);
    expect(mockService.createClan).toHaveBeenCalledWith(makeUser().id, dto);
  });

  // TC0127-CLAN-BR49-T3
  it('TC0127-CLAN-BR49-T3 - forbidden', async () => {
    const dto = makeCreateClanDto();
    mockService.createClan.mockRejectedValue(new ForbiddenException('Not allowed'));
    await expect(controller.create(makeReq(), dto)).rejects.toThrow(ForbiddenException);
  });
});

// BR50 - Get Clan
describe('BR50 - Get Clan', () => {
  let controller: CommunityController;
  let mockService: jest.Mocked<CommunityService>;

  beforeEach(async () => {
    mockService = {
      getClan: jest.fn(),
    } as any;

    const { controller: ctrl } = await createControllerTestModule(CommunityController, [
      { provide: CommunityService, useValue: mockService },
    ]);
    controller = ctrl;
  });

  // TC0128-CLAN-BR50-T1
  it('TC0128-CLAN-BR50-T1 - happy path', async () => {
    const clanId = 'clan-1';
    const expected = { id: clanId, name: 'Test Clan', visibility: 'public', slug: 'test-clan', createdBy: 'creator' };
    mockService.getClan.mockResolvedValue(expected);
    const result = await controller.get(clanId);
    expect(result).toEqual(expected);
    expect(mockService.getClan).toHaveBeenCalledWith(clanId);
    expect(mockService.getClan).toHaveBeenCalledTimes(1);
  });

  // TC0129-CLAN-BR50-T2
  it('TC0129-CLAN-BR50-T2 - not found', async () => {
    const clanId = 'clan-1';
    mockService.getClan.mockRejectedValue(new NotFoundException('Clan not found'));
    await expect(controller.get(clanId)).rejects.toThrow(NotFoundException);
    expect(mockService.getClan).toHaveBeenCalledWith(clanId);
  });
});

// BR51 - List Members
describe('BR51 - List Members', () => {
  let controller: CommunityController;
  let mockService: jest.Mocked<CommunityService>;

  beforeEach(async () => {
    mockService = {
      listMembers: jest.fn(),
    } as any;

    const { controller: ctrl } = await createControllerTestModule(CommunityController, [
      { provide: CommunityService, useValue: mockService },
    ]);
    controller = ctrl;
  });

  // TC0130-CLAN-BR51-T1
  it('TC0130-CLAN-BR51-T1 - happy path', async () => {
    const clanId = 'clan-1';
    const expected = [{ id: 'member-1', userId: 'user-1', role: 'member' }];
    mockService.listMembers.mockResolvedValue(expected);
    const result = await controller.members(clanId);
    expect(result).toEqual(expected);
    expect(mockService.listMembers).toHaveBeenCalledWith(clanId);
    expect(mockService.listMembers).toHaveBeenCalledTimes(1);
  });

  // TC0131-CLAN-BR51-T2
  it('TC0131-CLAN-BR51-T2 - not found', async () => {
    const clanId = 'clan-1';
    mockService.listMembers.mockRejectedValue(new NotFoundException('Clan not found'));
    await expect(controller.members(clanId)).rejects.toThrow(NotFoundException);
    expect(mockService.listMembers).toHaveBeenCalledWith(clanId);
  });
});

// BR52 - Join Clan
describe('BR52 - Join Clan', () => {
  let controller: CommunityController;
  let mockService: jest.Mocked<CommunityService>;

  beforeEach(async () => {
    mockService = {
      requestJoin: jest.fn(),
    } as any;

    const { controller: ctrl } = await createControllerTestModule(CommunityController, [
      { provide: CommunityService, useValue: mockService },
    ]);
    controller = ctrl;
  });

  // TC0132-CLAN-BR52-T1
  it('TC0132-CLAN-BR52-T1 - happy path', async () => {
    const clanId = 'clan-1';
    const expected = { ok: true, joined: true, pending: false };
    mockService.requestJoin.mockResolvedValue(expected);
    const result = await controller.join(makeReq(), clanId);
    expect(result).toEqual(expected);
    expect(mockService.requestJoin).toHaveBeenCalledWith(makeUser().id, clanId);
    expect(mockService.requestJoin).toHaveBeenCalledTimes(1);
  });

  // TC0133-CLAN-BR52-T2
  it('TC0133-CLAN-BR52-T2 - validation fail', async () => {
    const clanId = 'clan-1';
    mockService.requestJoin.mockRejectedValue(new BadRequestException('Already member'));
    await expect(controller.join(makeReq(), clanId)).rejects.toThrow(BadRequestException);
    expect(mockService.requestJoin).toHaveBeenCalledWith(makeUser().id, clanId);
  });
});

// BR53 - Approve Join
describe('BR53 - Approve Join', () => {
  let controller: CommunityController;
  let mockService: jest.Mocked<CommunityService>;

  beforeEach(async () => {
    mockService = {
      approveJoin: jest.fn(),
    } as any;

    const { controller: ctrl } = await createControllerTestModule(CommunityController, [
      { provide: CommunityService, useValue: mockService },
    ]);
    controller = ctrl;
  });

  // TC0134-CLAN-BR53-T1
  it('TC0134-CLAN-BR53-T1 - happy path', async () => {
    const clanId = 'clan-1';
    const dto = makeApproveJoinDto();
    const expected = { ok: true };
    mockService.approveJoin.mockResolvedValue(expected);
    const result = await controller.approve(makeReq(), clanId, dto);
    expect(result).toEqual(expected);
    expect(mockService.approveJoin).toHaveBeenCalledWith(makeUser().id, clanId, dto.userId);
    expect(mockService.approveJoin).toHaveBeenCalledTimes(1);
  });

  // TC0135-CLAN-BR53-T2
  it('TC0135-CLAN-BR53-T2 - forbidden', async () => {
    const clanId = 'clan-1';
    const dto = makeApproveJoinDto();
    mockService.approveJoin.mockRejectedValue(new ForbiddenException('Not leader'));
    await expect(controller.approve(makeReq(), clanId, dto)).rejects.toThrow(ForbiddenException);
    expect(mockService.approveJoin).toHaveBeenCalledWith(makeUser().id, clanId, dto.userId);
  });
});

// BR54 - Leave Clan
describe('BR54 - Leave Clan', () => {
  let controller: CommunityController;
  let mockService: jest.Mocked<CommunityService>;

  beforeEach(async () => {
    mockService = {
      leaveClan: jest.fn(),
    } as any;

    const { controller: ctrl } = await createControllerTestModule(CommunityController, [
      { provide: CommunityService, useValue: mockService },
    ]);
    controller = ctrl;
  });

  // TC0136-CLAN-BR54-T1
  it('TC0136-CLAN-BR54-T1 - happy path', async () => {
    const clanId = 'clan-1';
    const expected = { ok: true };
    mockService.leaveClan.mockResolvedValue(expected);
    const result = await controller.leave(makeReq(), clanId);
    expect(result).toEqual(expected);
    expect(mockService.leaveClan).toHaveBeenCalledWith(makeUser().id, clanId);
    expect(mockService.leaveClan).toHaveBeenCalledTimes(1);
  });

  // TC0137-CLAN-BR54-T2
  it('TC0137-CLAN-BR54-T2 - validation fail', async () => {
    const clanId = 'clan-1';
    mockService.leaveClan.mockRejectedValue(new BadRequestException('Cannot leave as leader'));
    await expect(controller.leave(makeReq(), clanId)).rejects.toThrow(BadRequestException);
    expect(mockService.leaveClan).toHaveBeenCalledWith(makeUser().id, clanId);
  });
});

// BR55 - Ban Member
describe('BR55 - Ban Member', () => {
  let controller: CommunityController;
  let mockService: jest.Mocked<CommunityService>;

  beforeEach(async () => {
    mockService = {
      banMember: jest.fn(),
    } as any;

    const { controller: ctrl } = await createControllerTestModule(CommunityController, [
      { provide: CommunityService, useValue: mockService },
    ]);
    controller = ctrl;
  });

  // TC0138-CLAN-BR55-T1
  it('TC0138-CLAN-BR55-T1 - happy path', async () => {
    const clanId = 'clan-1';
    const userId = 'target-user';
    const expected = { ok: true };
    mockService.banMember.mockResolvedValue(expected);
    const result = await controller.ban(makeReq(), clanId, userId);
    expect(result).toEqual(expected);
    expect(mockService.banMember).toHaveBeenCalledWith(makeUser().id, clanId, userId);
    expect(mockService.banMember).toHaveBeenCalledTimes(1);
  });

  // TC0139-CLAN-BR55-T2
  it('TC0139-CLAN-BR55-T2 - forbidden', async () => {
    const clanId = 'clan-1';
    const userId = 'target-user';
    mockService.banMember.mockRejectedValue(new ForbiddenException('Not leader'));
    await expect(controller.ban(makeReq(), clanId, userId)).rejects.toThrow(ForbiddenException);
    expect(mockService.banMember).toHaveBeenCalledWith(makeUser().id, clanId, userId);
  });

  // TC0140-CLAN-BR55-T3
  it('TC0140-CLAN-BR55-T3 - not found', async () => {
    const clanId = 'clan-1';
    const userId = 'target-user';
    mockService.banMember.mockRejectedValue(new NotFoundException('User not found'));
    await expect(controller.ban(makeReq(), clanId, userId)).rejects.toThrow(NotFoundException);
  });
});

// BR56 - Create Report
describe('BR56 - Create Report', () => {
  let controller: ModerationController;
  let mockService: jest.Mocked<ModerationService>;

  beforeEach(async () => {
    mockService = {
      create: jest.fn(),
    } as any;

    const { controller: ctrl } = await createControllerTestModule(ModerationController, [
      { provide: ModerationService, useValue: mockService },
    ]);
    controller = ctrl;
  });

  // TC0141-CLAN-BR56-T1
  it('TC0141-CLAN-BR56-T1 - happy path', async () => {
    const dto = makeCreateReportDto();
    const expected = { id: 'report-1', subjectType: dto.subjectType, subjectId: dto.subjectId, reason: dto.reason, reporterId: makeUser().id, status: 'open' };
    mockService.create.mockResolvedValue(expected);
    const result = await controller.create(makeReq(), dto);
    expect(result).toEqual(expected);
    expect(mockService.create).toHaveBeenCalledWith(dto, makeUser().id);
    expect(mockService.create).toHaveBeenCalledTimes(1);
  });

  // TC0142-CLAN-BR56-T2
  it('TC0142-CLAN-BR56-T2 - validation fail', async () => {
    const dto = makeCreateReportDto();
    mockService.create.mockRejectedValue(new BadRequestException('Invalid report'));
    await expect(controller.create(makeReq(), dto)).rejects.toThrow(BadRequestException);
    expect(mockService.create).toHaveBeenCalledWith(dto, makeUser().id);
  });
});

// BR57 - Resolve Report
describe('BR57 - Resolve Report', () => {
  let controller: ModerationController;
  let mockService: jest.Mocked<ModerationService>;

  beforeEach(async () => {
    mockService = {
      resolve: jest.fn(),
    } as any;

    const { controller: ctrl } = await createControllerTestModule(ModerationController, [
      { provide: ModerationService, useValue: mockService },
    ]);
    controller = ctrl;
  });

  // TC0143-CLAN-BR57-T1
  it('TC0143-CLAN-BR57-T1 - happy path', async () => {
    const id = 'report-1';
    const dto = makeResolveReportDto();
    const expected = { id, status: dto.status, resolvedAt: expect.any(Date) };
    mockService.resolve.mockResolvedValue(expected);
    const result = await controller.resolve(id, dto);
    expect(result).toEqual(expected);
    expect(mockService.resolve).toHaveBeenCalledWith(id, dto.status);
    expect(mockService.resolve).toHaveBeenCalledTimes(1);
  });

  // TC0144-CLAN-BR57-T2
  it('TC0144-CLAN-BR57-T2 - forbidden', async () => {
    const id = 'report-1';
    const dto = makeResolveReportDto();
    mockService.resolve.mockRejectedValue(new ForbiddenException('Not moderator'));
    await expect(controller.resolve(id, dto)).rejects.toThrow(ForbiddenException);
    expect(mockService.resolve).toHaveBeenCalledWith(id, dto.status);
  });
});

// BR58 - List Reports
describe('BR58 - List Reports', () => {
  let controller: ModerationController;
  let mockService: jest.Mocked<ModerationService>;

  beforeEach(async () => {
    mockService = {
      list: jest.fn(),
    } as any;

    const { controller: ctrl } = await createControllerTestModule(ModerationController, [
      { provide: ModerationService, useValue: mockService },
    ]);
    controller = ctrl;
  });

  // TC0145-CLAN-BR58-T1
  it('TC0145-CLAN-BR58-T1 - happy path', async () => {
    const expected = [{ id: 'report-1', subjectType: 'user', subjectId: 'user-1', reason: 'Spam', reporterId: 'reporter', status: 'open' }];
    mockService.list.mockResolvedValue(expected);
    const result = await controller.list();
    expect(result).toEqual(expected);
    expect(mockService.list).toHaveBeenCalledWith();
    expect(mockService.list).toHaveBeenCalledTimes(1);
  });

  // TC0146-CLAN-BR58-T2
  it('TC0146-CLAN-BR58-T2 - forbidden', async () => {
    mockService.list.mockRejectedValue(new ForbiddenException('Access denied'));
    await expect(controller.list()).rejects.toThrow(ForbiddenException);
    expect(mockService.list).toHaveBeenCalledWith();
  });
});

// BR59 - Follow User
describe('BR59 - Follow User', () => {
  let controller: SocialController;
  let mockService: jest.Mocked<SocialService>;

  beforeEach(async () => {
    mockService = {
      follow: jest.fn(),
    } as any;

    const { controller: ctrl } = await createControllerTestModule(SocialController, [
      { provide: SocialService, useValue: mockService },
    ]);
    controller = ctrl;
  });

  // TC0147-CLAN-BR59-T1
  it('TC0147-CLAN-BR59-T1 - happy path', async () => {
    const userId = 'target-user';
    const expected = { ok: true, mutual: false, alreadyFollowed: false };
    mockService.follow.mockResolvedValue(expected);
    const result = await controller.follow(makeReq(), userId);
    expect(result).toEqual(expected);
    expect(mockService.follow).toHaveBeenCalledWith(makeUser().id, userId);
    expect(mockService.follow).toHaveBeenCalledTimes(1);
  });

  // TC0148-CLAN-BR59-T2
  it('TC0148-CLAN-BR59-T2 - validation fail', async () => {
    const userId = 'target-user';
    mockService.follow.mockRejectedValue(new BadRequestException('Cannot follow self'));
    await expect(controller.follow(makeReq(), userId)).rejects.toThrow(BadRequestException);
    expect(mockService.follow).toHaveBeenCalledWith(makeUser().id, userId);
  });

  // TC0149-CLAN-BR59-T3
  it('TC0149-CLAN-BR59-T3 - not found', async () => {
    const userId = 'target-user';
    mockService.follow.mockRejectedValue(new NotFoundException('User not found'));
    await expect(controller.follow(makeReq(), userId)).rejects.toThrow(NotFoundException);
  });
});

// BR60 - Unfollow User
describe('BR60 - Unfollow User', () => {
  let controller: SocialController;
  let mockService: jest.Mocked<SocialService>;

  beforeEach(async () => {
    mockService = {
      unfollow: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SocialController],
      providers: [
        { provide: SocialService, useValue: mockService },
      ],
    }).compile();

    controller = module.get<SocialController>(SocialController);
  });

  // TC0150-CLAN-BR60-T1
  it('TC0150-CLAN-BR60-T1 - happy path', async () => {
    const userId = 'target-user';
    const expected = { ok: true, deleted: 1 };
    mockService.unfollow.mockResolvedValue(expected);
    const result = await controller.unfollow(makeReq(), userId);
    expect(result).toEqual(expected);
    expect(mockService.unfollow).toHaveBeenCalledWith(makeUser().id, userId);
    expect(mockService.unfollow).toHaveBeenCalledTimes(1);
  });

  // TC0151-CLAN-BR60-T2
  it('TC0151-CLAN-BR60-T2 - validation fail', async () => {
    const userId = 'target-user';
    mockService.unfollow.mockRejectedValue(new BadRequestException('Not following'));
    await expect(controller.unfollow(makeReq(), userId)).rejects.toThrow(BadRequestException);
    expect(mockService.unfollow).toHaveBeenCalledWith(makeUser().id, userId);
  });

  // TC0152-CLAN-BR60-T3
  it('TC0152-CLAN-BR60-T3 - not found', async () => {
    const userId = 'target-user';
    mockService.unfollow.mockRejectedValue(new NotFoundException('User not found'));
    await expect(controller.unfollow(makeReq(), userId)).rejects.toThrow(NotFoundException);
  });
});

// BR61 - Block User
describe('BR61 - Block User', () => {
  let controller: SocialController;
  let mockService: jest.Mocked<SocialService>;

  beforeEach(async () => {
    mockService = {
      block: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SocialController],
      providers: [
        { provide: SocialService, useValue: mockService },
      ],
    }).compile();

    controller = module.get<SocialController>(SocialController);
  });

  // TC0153-CLAN-BR61-T1
  it('TC0153-CLAN-BR61-T1 - happy path', async () => {
    const userId = 'target-user';
    const expected = { ok: true, alreadyBlocked: false, removedFollows: { a2b: 0, b2a: 0 } };
    mockService.block.mockResolvedValue(expected);
    const result = await controller.block(makeReq(), userId);
    expect(result).toEqual(expected);
    expect(mockService.block).toHaveBeenCalledWith(makeUser().id, userId);
    expect(mockService.block).toHaveBeenCalledTimes(1);
  });

  // TC0154-CLAN-BR61-T2
  it('TC0154-CLAN-BR61-T2 - validation fail', async () => {
    const userId = 'target-user';
    mockService.block.mockRejectedValue(new BadRequestException('Cannot block self'));
    await expect(controller.block(makeReq(), userId)).rejects.toThrow(BadRequestException);
    expect(mockService.block).toHaveBeenCalledWith(makeUser().id, userId);
  });

  // TC0155-CLAN-BR61-T3
  it('TC0155-CLAN-BR61-T3 - not found', async () => {
    const userId = 'target-user';
    mockService.block.mockRejectedValue(new NotFoundException('User not found'));
    await expect(controller.block(makeReq(), userId)).rejects.toThrow(NotFoundException);
  });
});

// BR62 - Unblock User
describe('BR62 - Unblock User', () => {
  let controller: SocialController;
  let mockService: jest.Mocked<SocialService>;

  beforeEach(async () => {
    mockService = {
      unblock: jest.fn(),
    } as any;

    const { controller: ctrl } = await createControllerTestModule(SocialController, [
      { provide: SocialService, useValue: mockService },
    ]);
    controller = ctrl;
  });

  // TC0156-CLAN-BR62-T1
  it('TC0156-CLAN-BR62-T1 - happy path', async () => {
    const userId = 'target-user';
    const expected = { ok: true, deleted: 1 };
    mockService.unblock.mockResolvedValue(expected);
    const result = await controller.unblock(makeReq(), userId);
    expect(result).toEqual(expected);
    expect(mockService.unblock).toHaveBeenCalledWith(makeUser().id, userId);
    expect(mockService.unblock).toHaveBeenCalledTimes(1);
  });

  // TC0157-CLAN-BR62-T2
  it('TC0157-CLAN-BR62-T2 - validation fail', async () => {
    const userId = 'target-user';
    mockService.unblock.mockRejectedValue(new BadRequestException('Not blocked'));
    await expect(controller.unblock(makeReq(), userId)).rejects.toThrow(BadRequestException);
    expect(mockService.unblock).toHaveBeenCalledWith(makeUser().id, userId);
  });

  // TC0158-CLAN-BR62-T3
  it('TC0158-CLAN-BR62-T3 - not found', async () => {
    const userId = 'target-user';
    mockService.unblock.mockRejectedValue(new NotFoundException('User not found'));
    await expect(controller.unblock(makeReq(), userId)).rejects.toThrow(NotFoundException);
  });
});

// BR63 - Create Clan (edge cases)
describe('BR63 - Create Clan (edge cases)', () => {
  let controller: CommunityController;
  let mockService: jest.Mocked<CommunityService>;

  beforeEach(async () => {
    mockService = {
      createClan: jest.fn(),
    } as any;

    const { controller: ctrl } = await createControllerTestModule(CommunityController, [
      { provide: CommunityService, useValue: mockService },
    ]);
    controller = ctrl;
  });

  // TC0159-CLAN-BR63-T1
  it('TC0159-CLAN-BR63-T1 - empty name validation', async () => {
    const dto = { name: '', visibility: 'public' as const };
    mockService.createClan.mockRejectedValue(new BadRequestException('Name cannot be empty'));
    await expect(controller.create(makeReq(), dto)).rejects.toThrow(BadRequestException);
  });

  // TC0160-CLAN-BR63-T2
  it('TC0160-CLAN-BR63-T2 - duplicate name', async () => {
    const dto = makeCreateClanDto();
    mockService.createClan.mockRejectedValue(new BadRequestException('Clan name already exists'));
    await expect(controller.create(makeReq(), dto)).rejects.toThrow(BadRequestException);
  });

  // TC0161-CLAN-BR63-T3
  it('TC0161-CLAN-BR63-T3 - private visibility', async () => {
    const dto = { name: 'Private Clan', visibility: 'private' as const };
    const expected = { id: 'clan-2', name: dto.name, visibility: dto.visibility, slug: 'private-clan', createdBy: makeUser().id };
    mockService.createClan.mockResolvedValue(expected);
    const result = await controller.create(makeReq(), dto);
    expect(result).toEqual(expected);
  });
});

// BR64 - Get Clan (edge cases)
describe('BR64 - Get Clan (edge cases)', () => {
  let controller: CommunityController;
  let mockService: jest.Mocked<CommunityService>;

  beforeEach(async () => {
    mockService = {
      getClan: jest.fn(),
    } as any;

    const { controller: ctrl } = await createControllerTestModule(CommunityController, [
      { provide: CommunityService, useValue: mockService },
    ]);
    controller = ctrl;
  });

  // TC0162-CLAN-BR64-T1
  it('TC0162-CLAN-BR64-T1 - invalid clan ID format', async () => {
    const clanId = 'invalid-id-format';
    mockService.getClan.mockRejectedValue(new BadRequestException('Invalid clan ID'));
    await expect(controller.get(clanId)).rejects.toThrow(BadRequestException);
  });

  // TC0163-CLAN-BR64-T2
  it('TC0163-CLAN-BR64-T2 - private clan access denied', async () => {
    const clanId = 'private-clan-1';
    mockService.getClan.mockRejectedValue(new ForbiddenException('Private clan access denied'));
    await expect(controller.get(clanId)).rejects.toThrow(ForbiddenException);
  });

  // TC0164-CLAN-BR64-T3
  it('TC0164-CLAN-BR64-T3 - deleted clan', async () => {
    const clanId = 'deleted-clan-1';
    mockService.getClan.mockRejectedValue(new NotFoundException('Clan has been deleted'));
    await expect(controller.get(clanId)).rejects.toThrow(NotFoundException);
  });
});

// BR65 - Join Clan (edge cases)
describe('BR65 - Join Clan (edge cases)', () => {
  let controller: CommunityController;
  let mockService: jest.Mocked<CommunityService>;

  beforeEach(async () => {
    mockService = {
      requestJoin: jest.fn(),
    } as any;

    const { controller: ctrl } = await createControllerTestModule(CommunityController, [
      { provide: CommunityService, useValue: mockService },
    ]);
    controller = ctrl;
  });

  // TC0165-CLAN-BR65-T1
  it('TC0165-CLAN-BR65-T1 - already pending', async () => {
    const clanId = 'clan-1';
    mockService.requestJoin.mockRejectedValue(new BadRequestException('Join request already pending'));
    await expect(controller.join(makeReq(), clanId)).rejects.toThrow(BadRequestException);
  });

  // TC0166-CLAN-BR65-T2
  it('TC0166-CLAN-BR65-T2 - banned from clan', async () => {
    const clanId = 'clan-1';
    mockService.requestJoin.mockRejectedValue(new ForbiddenException('You are banned from this clan'));
    await expect(controller.join(makeReq(), clanId)).rejects.toThrow(ForbiddenException);
  });

  // TC0167-CLAN-BR65-T3
  it('TC0167-CLAN-BR65-T3 - clan full', async () => {
    const clanId = 'clan-1';
    mockService.requestJoin.mockRejectedValue(new BadRequestException('Clan is full'));
    await expect(controller.join(makeReq(), clanId)).rejects.toThrow(BadRequestException);
  });
});

// BR66 - Approve Join (edge cases)
describe('BR66 - Approve Join (edge cases)', () => {
  let controller: CommunityController;
  let mockService: jest.Mocked<CommunityService>;

  beforeEach(async () => {
    mockService = {
      approveJoin: jest.fn(),
    } as any;

    const { controller: ctrl } = await createControllerTestModule(CommunityController, [
      { provide: CommunityService, useValue: mockService },
    ]);
    controller = ctrl;
  });

  // TC0168-CLAN-BR66-T1
  it('TC0168-CLAN-BR66-T1 - no pending request', async () => {
    const clanId = 'clan-1';
    const dto = makeApproveJoinDto();
    mockService.approveJoin.mockRejectedValue(new NotFoundException('No pending join request'));
    await expect(controller.approve(makeReq(), clanId, dto)).rejects.toThrow(NotFoundException);
  });

  // TC0169-CLAN-BR66-T2
  it('TC0169-CLAN-BR66-T2 - invalid user ID', async () => {
    const clanId = 'clan-1';
    const dto = makeApproveJoinDto();
    mockService.approveJoin.mockRejectedValue(new BadRequestException('Invalid user ID'));
    await expect(controller.approve(makeReq(), clanId, dto)).rejects.toThrow(BadRequestException);
  });

  // TC0170-CLAN-BR66-T3
  it('TC0170-CLAN-BR66-T3 - clan full', async () => {
    const clanId = 'clan-1';
    const dto = makeApproveJoinDto();
    mockService.approveJoin.mockRejectedValue(new BadRequestException('Clan is full'));
    await expect(controller.approve(makeReq(), clanId, dto)).rejects.toThrow(BadRequestException);
  });
});

// BR67 - Leave Clan (edge cases)
describe('BR67 - Leave Clan (edge cases)', () => {
  let controller: CommunityController;
  let mockService: jest.Mocked<CommunityService>;

  beforeEach(async () => {
    mockService = {
      leaveClan: jest.fn(),
    } as any;

    const { controller: ctrl } = await createControllerTestModule(CommunityController, [
      { provide: CommunityService, useValue: mockService },
    ]);
    controller = ctrl;
  });

  // TC0171-CLAN-BR67-T1
  it('TC0171-CLAN-BR67-T1 - not a member', async () => {
    const clanId = 'clan-1';
    mockService.leaveClan.mockRejectedValue(new BadRequestException('You are not a member'));
    await expect(controller.leave(makeReq(), clanId)).rejects.toThrow(BadRequestException);
  });

  // TC0172-CLAN-BR67-T2
  it('TC0172-CLAN-BR67-T2 - last member cannot leave', async () => {
    const clanId = 'clan-1';
    mockService.leaveClan.mockRejectedValue(new BadRequestException('Last member cannot leave'));
    await expect(controller.leave(makeReq(), clanId)).rejects.toThrow(BadRequestException);
  });

  // TC0173-CLAN-BR67-T3
  it('TC0173-CLAN-BR67-T3 - transfer leadership first', async () => {
    const clanId = 'clan-1';
    mockService.leaveClan.mockRejectedValue(new BadRequestException('Transfer leadership before leaving'));
    await expect(controller.leave(makeReq(), clanId)).rejects.toThrow(BadRequestException);
  });
});

// BR68 - Ban Member (edge cases)
describe('BR68 - Ban Member (edge cases)', () => {
  let controller: CommunityController;
  let mockService: jest.Mocked<CommunityService>;

  beforeEach(async () => {
    mockService = {
      banMember: jest.fn(),
    } as any;

    const { controller: ctrl } = await createControllerTestModule(CommunityController, [
      { provide: CommunityService, useValue: mockService },
    ]);
    controller = ctrl;
  });

  // TC0174-CLAN-BR68-T1
  it('TC0174-CLAN-BR68-T1 - cannot ban self', async () => {
    const clanId = 'clan-1';
    const userId = makeUser().id;
    mockService.banMember.mockRejectedValue(new BadRequestException('Cannot ban yourself'));
    await expect(controller.ban(makeReq(), clanId, userId)).rejects.toThrow(BadRequestException);
  });

  // TC0175-CLAN-BR68-T2
  it('TC0175-CLAN-BR68-T2 - cannot ban leader', async () => {
    const clanId = 'clan-1';
    const userId = 'leader-user';
    mockService.banMember.mockRejectedValue(new BadRequestException('Cannot ban leader'));
    await expect(controller.ban(makeReq(), clanId, userId)).rejects.toThrow(BadRequestException);
  });

  // TC0176-CLAN-BR68-T3
  it('TC0176-CLAN-BR68-T3 - already banned', async () => {
    const clanId = 'clan-1';
    const userId = 'target-user';
    mockService.banMember.mockRejectedValue(new BadRequestException('User already banned'));
    await expect(controller.ban(makeReq(), clanId, userId)).rejects.toThrow(BadRequestException);
  });
});

// BR69 - Create Report (edge cases)
describe('BR69 - Create Report (edge cases)', () => {
  let controller: ModerationController;
  let mockService: jest.Mocked<ModerationService>;

  beforeEach(async () => {
    mockService = {
      create: jest.fn(),
    } as any;

    const { controller: ctrl } = await createControllerTestModule(ModerationController, [
      { provide: ModerationService, useValue: mockService },
    ]);
    controller = ctrl;
  });

  // TC0177-CLAN-BR69-T1
  it('TC0177-CLAN-BR69-T1 - duplicate report', async () => {
    const dto = makeCreateReportDto();
    mockService.create.mockRejectedValue(new BadRequestException('Report already exists'));
    await expect(controller.create(makeReq(), dto)).rejects.toThrow(BadRequestException);
  });

  // TC0178-CLAN-BR69-T2
  it('TC0178-CLAN-BR69-T2 - invalid subject type', async () => {
    const dto = { subjectType: 'invalid' as any, subjectId: 'target-789', reason: 'Spam' };
    mockService.create.mockRejectedValue(new BadRequestException('Invalid subject type'));
    await expect(controller.create(makeReq(), dto)).rejects.toThrow(BadRequestException);
  });

  // TC0179-CLAN-BR69-T3
  it('TC0179-CLAN-BR69-T3 - empty reason', async () => {
    const dto = { subjectType: 'user', subjectId: 'target-789', reason: '' };
    mockService.create.mockRejectedValue(new BadRequestException('Reason cannot be empty'));
    await expect(controller.create(makeReq(), dto)).rejects.toThrow(BadRequestException);
  });
});

// BR70 - Resolve Report (edge cases)
describe('BR70 - Resolve Report (edge cases)', () => {
  let controller: ModerationController;
  let mockService: jest.Mocked<ModerationService>;

  beforeEach(async () => {
    mockService = {
      resolve: jest.fn(),
    } as any;

    const { controller: ctrl } = await createControllerTestModule(ModerationController, [
      { provide: ModerationService, useValue: mockService },
    ]);
    controller = ctrl;
  });

  // TC0180-CLAN-BR70-T1
  it('TC0180-CLAN-BR70-T1 - report already resolved', async () => {
    const id = 'report-1';
    const dto = makeResolveReportDto();
    mockService.resolve.mockRejectedValue(new BadRequestException('Report already resolved'));
    await expect(controller.resolve(id, dto)).rejects.toThrow(BadRequestException);
  });

  // TC0181-CLAN-BR70-T2
  it('TC0181-CLAN-BR70-T2 - invalid status', async () => {
    const id = 'report-1';
    const dto = { status: 'invalid' as any };
    mockService.resolve.mockRejectedValue(new BadRequestException('Invalid status'));
    await expect(controller.resolve(id, dto)).rejects.toThrow(BadRequestException);
  });

  // TC0182-CLAN-BR70-T3
  it('TC0182-CLAN-BR70-T3 - report not found', async () => {
    const id = 'non-existent-report';
    const dto = makeResolveReportDto();
    mockService.resolve.mockRejectedValue(new NotFoundException('Report not found'));
    await expect(controller.resolve(id, dto)).rejects.toThrow(NotFoundException);
  });
});

// BR71 - List Reports (edge cases)
describe('BR71 - List Reports (edge cases)', () => {
  let controller: ModerationController;
  let mockService: jest.Mocked<ModerationService>;

  beforeEach(async () => {
    mockService = {
      list: jest.fn(),
    } as any;

    const { controller: ctrl } = await createControllerTestModule(ModerationController, [
      { provide: ModerationService, useValue: mockService },
    ]);
    controller = ctrl;
  });

  // TC0183-CLAN-BR71-T1
  it('TC0183-CLAN-BR71-T1 - empty list', async () => {
    const expected: any[] = [];
    mockService.list.mockResolvedValue(expected);
    const result = await controller.list();
    expect(result).toEqual(expected);
    expect(mockService.list).toHaveBeenCalledTimes(1);
  });

  // TC0184-CLAN-BR71-T2
  it('TC0184-CLAN-BR71-T2 - multiple reports', async () => {
    const expected = [
      { id: 'report-1', subjectType: 'user', subjectId: 'user-1', reason: 'Spam', reporterId: 'reporter', status: 'open' },
      { id: 'report-2', subjectType: 'user', subjectId: 'user-2', reason: 'Harassment', reporterId: 'reporter2', status: 'open' },
    ];
    mockService.list.mockResolvedValue(expected);
    const result = await controller.list();
    expect(result).toEqual(expected);
    expect(result.length).toBe(2);
  });

  // TC0185-CLAN-BR71-T3
  it('TC0185-CLAN-BR71-T3 - unauthorized access', async () => {
    mockService.list.mockRejectedValue(new ForbiddenException('Insufficient permissions'));
    await expect(controller.list()).rejects.toThrow(ForbiddenException);
  });
});

// BR72 - Follow User (edge cases)
describe('BR72 - Follow User (edge cases)', () => {
  let controller: SocialController;
  let mockService: jest.Mocked<SocialService>;

  beforeEach(async () => {
    mockService = {
      follow: jest.fn(),
    } as any;

    const { controller: ctrl } = await createControllerTestModule(SocialController, [
      { provide: SocialService, useValue: mockService },
    ]);
    controller = ctrl;
  });

  // TC0186-CLAN-BR72-T1
  it('TC0186-CLAN-BR72-T1 - already following', async () => {
    const userId = 'target-user';
    const expected = { ok: true, mutual: false, alreadyFollowed: true };
    mockService.follow.mockResolvedValue(expected);
    const result = await controller.follow(makeReq(), userId);
    expect(result).toEqual(expected);
    expect(result.alreadyFollowed).toBe(true);
  });

  // TC0187-CLAN-BR72-T2
  it('TC0187-CLAN-BR72-T2 - mutual follow', async () => {
    const userId = 'target-user';
    const expected = { ok: true, mutual: true, alreadyFollowed: false };
    mockService.follow.mockResolvedValue(expected);
    const result = await controller.follow(makeReq(), userId);
    expect(result).toEqual(expected);
    expect(result.mutual).toBe(true);
  });

  // TC0188-CLAN-BR72-T3
  it('TC0188-CLAN-BR72-T3 - blocked user', async () => {
    const userId = 'target-user';
    mockService.follow.mockRejectedValue(new ForbiddenException('Cannot follow blocked user'));
    await expect(controller.follow(makeReq(), userId)).rejects.toThrow(ForbiddenException);
  });
});

// BR73 - Unfollow User (edge cases)
describe('BR73 - Unfollow User (edge cases)', () => {
  let controller: SocialController;
  let mockService: jest.Mocked<SocialService>;

  beforeEach(async () => {
    mockService = {
      unfollow: jest.fn(),
    } as any;

    const { controller: ctrl } = await createControllerTestModule(SocialController, [
      { provide: SocialService, useValue: mockService },
    ]);
    controller = ctrl;
  });

  // TC0189-CLAN-BR73-T1
  it('TC0189-CLAN-BR73-T1 - idempotent unfollow', async () => {
    const userId = 'target-user';
    const expected = { ok: true, deleted: 0 };
    mockService.unfollow.mockResolvedValue(expected);
    const result = await controller.unfollow(makeReq(), userId);
    expect(result).toEqual(expected);
    expect(result.deleted).toBe(0);
  });

  // TC0190-CLAN-BR73-T2
  it('TC0190-CLAN-BR73-T2 - unfollow blocked user', async () => {
    const userId = 'target-user';
    mockService.unfollow.mockRejectedValue(new BadRequestException('User is blocked'));
    await expect(controller.unfollow(makeReq(), userId)).rejects.toThrow(BadRequestException);
  });

  // TC0191-CLAN-BR73-T3
  it('TC0191-CLAN-BR73-T3 - unfollow self', async () => {
    const userId = makeUser().id;
    mockService.unfollow.mockRejectedValue(new BadRequestException('Cannot unfollow self'));
    await expect(controller.unfollow(makeReq(), userId)).rejects.toThrow(BadRequestException);
  });
});

// BR74 - Block User (edge cases)
describe('BR74 - Block User (edge cases)', () => {
  let controller: SocialController;
  let mockService: jest.Mocked<SocialService>;

  beforeEach(async () => {
    mockService = {
      block: jest.fn(),
    } as any;

    const { controller: ctrl } = await createControllerTestModule(SocialController, [
      { provide: SocialService, useValue: mockService },
    ]);
    controller = ctrl;
  });

  // TC0192-CLAN-BR74-T1
  it('TC0192-CLAN-BR74-T1 - already blocked', async () => {
    const userId = 'target-user';
    const expected = { ok: true, alreadyBlocked: true, removedFollows: { a2b: 1, b2a: 0 } };
    mockService.block.mockResolvedValue(expected);
    const result = await controller.block(makeReq(), userId);
    expect(result).toEqual(expected);
    expect(result.alreadyBlocked).toBe(true);
  });

  // TC0193-CLAN-BR74-T2
  it('TC0193-CLAN-BR74-T2 - block removes mutual follows', async () => {
    const userId = 'target-user';
    const expected = { ok: true, alreadyBlocked: false, removedFollows: { a2b: 1, b2a: 1 } };
    mockService.block.mockResolvedValue(expected);
    const result = await controller.block(makeReq(), userId);
    expect(result.removedFollows.b2a).toBe(1);
  });

  // TC0194-CLAN-BR74-T3
  it('TC0194-CLAN-BR74-T3 - block self', async () => {
    const userId = makeUser().id;
    mockService.block.mockRejectedValue(new BadRequestException('Cannot block self'));
    await expect(controller.block(makeReq(), userId)).rejects.toThrow(BadRequestException);
  });
});

// BR75 - Unblock User (edge cases)
describe('BR75 - Unblock User (edge cases)', () => {
  let controller: SocialController;
  let mockService: jest.Mocked<SocialService>;

  beforeEach(async () => {
    mockService = {
      unblock: jest.fn(),
    } as any;

    const { controller: ctrl } = await createControllerTestModule(SocialController, [
      { provide: SocialService, useValue: mockService },
    ]);
    controller = ctrl;
  });

  // TC0195-CLAN-BR75-T1
  it('TC0195-CLAN-BR75-T1 - idempotent unblock', async () => {
    const userId = 'target-user';
    const expected = { ok: true, deleted: 0 };
    mockService.unblock.mockResolvedValue(expected);
    const result = await controller.unblock(makeReq(), userId);
    expect(result.deleted).toBe(0);
  });

  // TC0196-CLAN-BR75-T2
  it('TC0196-CLAN-BR75-T2 - unblock self', async () => {
    const userId = makeUser().id;
    mockService.unblock.mockRejectedValue(new BadRequestException('Cannot unblock self'));
    await expect(controller.unblock(makeReq(), userId)).rejects.toThrow(BadRequestException);
  });

  // TC0197-CLAN-BR75-T3
  it('TC0197-CLAN-BR75-T3 - unblock success', async () => {
    const userId = 'target-user';
    const expected = { ok: true, deleted: 1 };
    mockService.unblock.mockResolvedValue(expected);
    const result = await controller.unblock(makeReq(), userId);
    expect(result.deleted).toBe(1);
  });
});

// BR76 - List Members (edge cases)
describe('BR76 - List Members (edge cases)', () => {
  let controller: CommunityController;
  let mockService: jest.Mocked<CommunityService>;

  beforeEach(async () => {
    mockService = {
      listMembers: jest.fn(),
    } as any;

    const { controller: ctrl } = await createControllerTestModule(CommunityController, [
      { provide: CommunityService, useValue: mockService },
    ]);
    controller = ctrl;
  });

  // TC0198-CLAN-BR76-T1
  it('TC0198-CLAN-BR76-T1 - empty members list', async () => {
    const clanId = 'clan-1';
    const expected: any[] = [];
    mockService.listMembers.mockResolvedValue(expected);
    const result = await controller.members(clanId);
    expect(result).toEqual(expected);
    expect(result.length).toBe(0);
  });

  // TC0199-CLAN-BR76-T2
  it('TC0199-CLAN-BR76-T2 - multiple members', async () => {
    const clanId = 'clan-1';
    const expected = [
      { clanId, userId: 'user-1', role: 'leader', status: 'active' },
      { clanId, userId: 'user-2', role: 'member', status: 'active' },
      { clanId, userId: 'user-3', role: 'member', status: 'active' },
    ];
    mockService.listMembers.mockResolvedValue(expected);
    const result = await controller.members(clanId);
    expect(result.length).toBe(3);
  });

  // TC0200-CLAN-BR76-T3
  it('TC0200-CLAN-BR76-T3 - access denied for private clan', async () => {
    const clanId = 'private-clan-1';
    mockService.listMembers.mockRejectedValue(new ForbiddenException('Cannot view members of private clan'));
    await expect(controller.members(clanId)).rejects.toThrow(ForbiddenException);
  });
});

// BR77 - Additional edge cases
describe('BR77 - Additional edge cases', () => {
  let controller: CommunityController;
  let mockService: jest.Mocked<CommunityService>;

  beforeEach(async () => {
    mockService = {
      getClan: jest.fn(),
      createClan: jest.fn(),
    } as any;

    const { controller: ctrl } = await createControllerTestModule(CommunityController, [
      { provide: CommunityService, useValue: mockService },
    ]);
    controller = ctrl;
  });

  // TC0201-CLAN-BR77-T1
  it('TC0201-CLAN-BR77-T1 - get clan with special characters in ID', async () => {
    const clanId = 'clan-123-special';
    const expected = { id: clanId, name: 'Test Clan', visibility: 'public', slug: 'test-clan', createdBy: 'creator' };
    mockService.getClan.mockResolvedValue(expected);
    const result = await controller.get(clanId);
    expect(result).toEqual(expected);
  });

  // TC0202-CLAN-BR77-T2
  it('TC0202-CLAN-BR77-T2 - create clan with long name', async () => {
    const dto = { name: 'A'.repeat(100), visibility: 'public' as const };
    const expected = { id: 'clan-1', name: dto.name, visibility: dto.visibility, slug: 'a'.repeat(50), createdBy: makeUser().id };
    mockService.createClan.mockResolvedValue(expected);
    const result = await controller.create(makeReq(), dto);
    expect(result.name.length).toBe(100);
  });
});