-- AddForeignKeyConstraints
-- Add FK constraint: ClanMember -> Clan
ALTER TABLE "ClanMember" 
ADD CONSTRAINT "ClanMember_clanId_fkey" 
FOREIGN KEY ("clanId") 
REFERENCES "Clan"("id") ON DELETE CASCADE;

-- Add FK constraint: ClanInvite -> Clan
ALTER TABLE "ClanInvite" 
ADD CONSTRAINT "ClanInvite_clanId_fkey" 
FOREIGN KEY ("clanId") 
REFERENCES "Clan"("id") ON DELETE CASCADE;

-- Add FK constraint: ClanJoinRequest -> Clan
ALTER TABLE "ClanJoinRequest" 
ADD CONSTRAINT "ClanJoinRequest_clanId_fkey" 
FOREIGN KEY ("clanId") 
REFERENCES "Clan"("id") ON DELETE CASCADE;
