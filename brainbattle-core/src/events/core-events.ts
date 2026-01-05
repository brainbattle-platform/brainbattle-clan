export const BB_EVENT_CHANNEL = 'bb.events' as const;

export type BbEvent<T extends string, D> = {
  id: string;
  type: T;
  ts: string;
  source: 'core';
  data: D;
};

export type SocialFollowCreated = BbEvent<
  'social.follow.created',
  { followerId: string; followeeId: string }
>;

export type SocialFollowDeleted = BbEvent<
  'social.follow.deleted',
  { followerId: string; followeeId: string; reason: 'unfollow' | 'blocked' }
>;

export type SocialFollowMutual = BbEvent<
  'social.follow.mutual',
  { userAId: string; userBId: string; by: 'follow-back' }
>;

export type SocialBlockCreated = BbEvent<
  'social.block.created',
  { blockerId: string; blockeeId: string }
>;

export type SocialBlockDeleted = BbEvent<
  'social.block.deleted',
  { blockerId: string; blockeeId: string }
>;

export type ClanCreated = BbEvent<
  'clan.created',
  { clanId: string; leaderId: string }
>;

export type ClanMemberJoined = BbEvent<
  'clan.member.joined',
  { clanId: string; userId: string; by: 'auto-public' | 'approved' }
>;

export type ClanMemberLeft = BbEvent<
  'clan.member.left',
  { clanId: string; userId: string }
>;

export type ClanMemberBanned = BbEvent<
  'clan.member.banned',
  { clanId: string; userId: string; by: 'leader' }
>;

export type AnyCoreEvent =
  | SocialFollowCreated
  | SocialFollowDeleted
  | SocialFollowMutual
  | SocialBlockCreated
  | SocialBlockDeleted
  | ClanCreated
  | ClanMemberJoined
  | ClanMemberLeft
  | ClanMemberBanned;
