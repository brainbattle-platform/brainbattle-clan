import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Query,
  HttpCode,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiBearerAuth,
  ApiTags,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtGuard } from '../security/jwt.guard';
import { AdminGuard } from '../security/admin.guard';
import { CurrentUser } from '../security/current-user.decorator';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateUserAdminDto } from './dto/update-user-admin.dto';

@ApiTags('Users')
@Controller('v1/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ============= PUBLIC / USER ENDPOINTS =============

  /**
   * Get user public profile
   */
  @Get(':userId')
  @ApiOperation({ summary: 'Get user public profile' })
  async getUserProfile(@Param('userId') userId: string) {
    return this.usersService.getUserProfile(userId);
  }

  /**
   * Get user followers list
   */
  @Get(':userId/followers')
  @ApiOperation({ summary: 'Get user followers' })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'take', required: false, type: Number })
  async getFollowers(
    @Param('userId') userId: string,
    @Query('skip') skip = 0,
    @Query('take') take = 20,
  ) {
    if (take > 100) take = 100;
    return this.usersService.getFollowers(userId, +skip, +take);
  }

  /**
   * Get user following list
   */
  @Get(':userId/following')
  @ApiOperation({ summary: 'Get user following' })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'take', required: false, type: Number })
  async getFollowing(
    @Param('userId') userId: string,
    @Query('skip') skip = 0,
    @Query('take') take = 20,
  ) {
    if (take > 100) take = 100;
    return this.usersService.getFollowing(userId, +skip, +take);
  }

  /**
   * Update own profile
   */
  @Patch('profile')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update own profile' })
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(userId, dto);
  }

  // ============= ADMIN ENDPOINTS =============

  /**
   * Get user details (admin)
   */
  @Get('admin/:userId')
  @UseGuards(JwtGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user details (admin)' })
  async getUserAdminView(@Param('userId') userId: string) {
    return this.usersService.getUserAdminView(userId);
  }

  /**
   * Update user (admin)
   */
  @Patch('admin/:userId')
  @UseGuards(JwtGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update user (admin)' })
  async updateUserAdmin(
    @Param('userId') userId: string,
    @Body() dto: UpdateUserAdminDto,
  ) {
    return this.usersService.updateUserAdmin(userId, dto);
  }

  /**
   * Delete user account (admin)
   */
  @Delete('admin/:userId')
  @UseGuards(JwtGuard, AdminGuard)
  @ApiBearerAuth()
  @HttpCode(200)
  @ApiOperation({ summary: 'Delete user account (admin)' })
  async deleteUser(@Param('userId') userId: string) {
    return this.usersService.deleteUser(userId);
  }
}
