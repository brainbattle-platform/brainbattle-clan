/**
 * DTO cho admin queries
 */
export class AdminListClansQueryDto {
  skip?: number;
  take?: number;
  search?: string; // Search by name
}

export class AdminListUsersQueryDto {
  skip?: number;
  take?: number;
  search?: string; // Search by email or displayName
  status?: 'active' | 'banned'; // Filter by status
}

export class AdminListReportsQueryDto {
  skip?: number;
  take?: number;
  status?: 'open' | 'resolved' | 'invalid';
  subjectType?: 'user' | 'message' | 'clan';
}
