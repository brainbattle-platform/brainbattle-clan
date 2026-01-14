import { Controller, Get, Post, Patch, Delete, Param, Query, Body, Req, UseGuards, HttpCode } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtGuard } from '../security/jwt.guard';
import { AdminGuard } from '../security/admin.guard';
import { AdminService } from './admin.service';
import { UpdateReportStatusDto } from './dto/update-report-status.dto';
import { AdminListClansQueryDto, AdminListUsersQueryDto, AdminListReportsQueryDto } from './dto/admin-query.dto';

/**
 * Admin Controller
 * All endpoints require admin role
 * AdminGuard added to verify admin status in JWT
 */
@ApiTags('Admin')
@ApiBearerAuth('access-token')
@UseGuards(JwtGuard, AdminGuard)
@Controller('v1/admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  /* ================= DASHBOARD ================= */

  @ApiOperation({ summary: 'Get dashboard stats (admin only)' })
  @Get('dashboard')
  async getDashboard(@Req() req: any) {
    // TODO: Verify admin role
    // if (!req.user.roles.includes('admin')) throw new ForbiddenException();

    return this.adminService.getDashboardStats();
  }

  /* ================= CLAN MANAGEMENT ================= */

  @ApiOperation({ summary: 'List all clans (admin only)' })
  @Get('clans')
  async listClans(@Query() query: AdminListClansQueryDto) {
    return this.adminService.listClans(query.skip, query.take, query.search);
  }

  @ApiOperation({ summary: 'Get clan stats (admin only)' })
  @Get('clans/:clanId')
  async getClanStats(@Param('clanId') clanId: string) {
    return this.adminService.getClanStats(clanId);
  }

  @ApiOperation({ summary: 'Ban clan (admin only)' })
  @Post('clans/:clanId/ban')
  async banClan(@Param('clanId') clanId: string) {
    return this.adminService.banClan(clanId);
  }

  @ApiOperation({ summary: 'Unban clan (admin only)' })
  @Post('clans/:clanId/unban')
  async unbanClan(@Param('clanId') clanId: string) {
    return this.adminService.unbanClan(clanId);
  }

  /* ================= USER MANAGEMENT ================= */

  @ApiOperation({ summary: 'List all users (admin only)' })
  @Get('users')
  async listUsers(@Query() query: AdminListUsersQueryDto) {
    return this.adminService.listUsers(query.skip, query.take, query.search);
  }

  @ApiOperation({ summary: 'Get user stats (admin only)' })
  @Get('users/:userId')
  async getUserStats(@Param('userId') userId: string) {
    return this.adminService.getUserStats(userId);
  }

  @ApiOperation({ summary: 'Ban user from all clans (admin only)' })
  @Post('users/:userId/ban')
  async banUser(@Param('userId') userId: string) {
    return this.adminService.banUser(userId);
  }

  @ApiOperation({ summary: 'Unban user from specific clan (admin only)' })
  @Post('users/:userId/unban/:clanId')
  async unbanUserFromClan(
    @Param('userId') userId: string,
    @Param('clanId') clanId: string,
  ) {
    return this.adminService.unbanUserFromClan(userId, clanId);
  }

  @ApiOperation({ summary: 'Edit user (admin only)' })
  @Patch('users/:userId')
  async editUser(
    @Param('userId') userId: string,
    @Body() data: any,
  ) {
    return this.adminService.editUser(userId, data);
  }

  @ApiOperation({ summary: 'Delete user (admin only)' })
  @Delete('users/:userId')
  @HttpCode(200)
  async deleteUser(@Param('userId') userId: string) {
    return this.adminService.deleteUserAdminAction(userId);
  }

  /* ================= REPORT MANAGEMENT ================= */

  @ApiOperation({ summary: 'List all reports (admin only)' })
  @Get('reports')
  async listReports(@Query() query: AdminListReportsQueryDto) {
    return this.adminService.listReports(query.skip, query.take, query.status, query.subjectType);
  }

  @ApiOperation({ summary: 'Get report details (admin only)' })
  @Get('reports/:reportId')
  async getReportDetails(@Param('reportId') reportId: string) {
    return this.adminService.getReportDetails(reportId);
  }

  @ApiOperation({ summary: 'Resolve report (admin only)' })
  @Patch('reports/:reportId')
  async resolveReport(
    @Param('reportId') reportId: string,
    @Body() dto: UpdateReportStatusDto,
    @Req() req: any, // For logging who resolved
  ) {
    // Convert enum to string for service
    const status = dto.status === 'resolved' || dto.status === 'invalid' ? dto.status : 'resolved';
    return this.adminService.resolveReport(reportId, status);
  }
}
