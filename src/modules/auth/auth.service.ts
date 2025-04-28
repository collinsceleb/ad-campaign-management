import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  LoggerService,
  NotFoundException,
} from '@nestjs/common';
import { CreateAuthDto } from './dto/create-auth.dto';

import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { RecordStatus } from '../../common/entities/base-status.entity';
import e, { Request, Response } from 'express';
import { validate as uuidValidate } from 'uuid';
import { UpdateUserDto } from '../users/dto/update-user.dto';
import {
  CampaignStatus,
  CampaignStatusEnum,
} from '../campaign-status/entities/campaign-status.entity';

@Injectable()
export class AuthService {
  private readonly PASSWORD_RETRIES =
    this.configService.get<number>('PASSWORD_RETRIES');
  constructor(
    @InjectRepository(User)
    private readonly authRepository: Repository<User>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly configService: ConfigService,
    private readonly datasource: DataSource,
    private readonly userService: UsersService,
    @Inject(Logger) private readonly logger: LoggerService,
  ) {}
  async changePassword(
    changePasswordDto: ChangePasswordDto,
    request: Request,
  ): Promise<{ user: User; message: string }> {
    const queryRunner = this.datasource.createQueryRunner();
    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();
      const { oldPassword, newPassword } = changePasswordDto;
      const user = request.user as User;
      const existingUser = await this.authRepository.findOne({
        where: { id: user.id },
      });
      const isPasswordValid = await existingUser.comparePassword(oldPassword);
      if (!isPasswordValid) {
        throw new BadRequestException('Incorrect password');
      }
      if (oldPassword === newPassword) {
        throw new BadRequestException(
          'New password must be different from the old password',
        );
      }
      if (existingUser.meta.status === RecordStatus.LOCKED) {
        throw new BadRequestException(
          'Account is locked. Kindly reset your password.',
        );
      }
      existingUser.password = newPassword;
      await existingUser.hashPassword();
      await queryRunner.manager.save(existingUser);
      // await this.authRepository.save(existingUser);
      await queryRunner.commitTransaction();
      return { user, message: 'Password changed successfully' };
    } catch (e) {
      await queryRunner.rollbackTransaction();
      console.error('Error changing password:', e.message);
      throw new InternalServerErrorException(
        'An error occurred while changing password. Please check server logs for details.',
        e.message,
      );
    } finally {
      await queryRunner.release();
    }
  }
  async logout(
    response: Response,
  ): Promise<e.Response<any, Record<string, any>>> {
    try {
      response.clearCookie('access_token', { httpOnly: true, secure: true }); // Cookie name is `access_token` by default

      return response.status(200).json({
        message: 'Logged out successfully!',
      });
    } catch (e) {
      console.error('Error logging out user:', e.message);
      throw new InternalServerErrorException(
        'An error occurred while logging out user. Please check server logs for details.',
        e.message,
      );
    }
  }
  async validateUser(createAuthDto: CreateAuthDto): Promise<User | null> {
    try {
      const { email, password } = createAuthDto;
      const user = await this.authRepository.findOne({ where: { email } });
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        user.failedAttempts = Math.max(0, user.failedAttempts + 1);
        await this.authRepository.save(user);
        if (user.failedAttempts >= this.PASSWORD_RETRIES) {
          user.meta.status = RecordStatus.LOCKED;
          await this.authRepository.save(user);
          throw new BadRequestException(
            'Maximum password attempts reached. Kindly reset your password.',
          );
        }
        throw new BadRequestException(
          'Incorrect password. Kindly reset your password.',
        );
      }
      if (user && isPasswordValid) {
        return user;
      }
      return null;
    } catch (error) {
      console.error('Error validating user:', error.message);
      throw new InternalServerErrorException(
        'An error occurred while validating user. Please check server logs for details.',
        error.message,
      );
    }
  }
  async getUserById(id: number): Promise<User> {
    try {
      const user = await this.authRepository.findOne({ where: { id } });
      if (!user) {
        throw new NotFoundException('User not found');
      }
      return user;
    } catch (error) {
      this.logger.error('Error getting user by ID:', error.message);
      throw new InternalServerErrorException(
        'An error occurred while fetching user by ID. Please check server logs for details.',
        error.message,
      );
    }
  }
  async updateProfile(
    id: number,
    updateUserDto: UpdateUserDto,
  ): Promise<{ user: User; message: string }> {
    const queryRunner = this.datasource.createQueryRunner();
    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();
      const { firstName, lastName } = updateUserDto;
      const [user, status] = await Promise.all([
        await queryRunner.manager.findOne(User, { where: { id } }),
        await queryRunner.manager.findOne(CampaignStatus, {
          where: { name: CampaignStatusEnum.Completed },
        }),
      ]);
      if (!user) {
        throw new NotFoundException('User not found');
      }
      if (!status) {
        throw new NotFoundException('Status not found');
      }
      user.firstName = firstName;
      user.lastName = lastName;
      user.meta.updatedBy = user.id;
      user.meta.updatedAt = new Date();
      user.meta.statusChangedBy = user.id;
      user.meta.statusChangedAt = new Date();
      user.meta.statusChangeReason = 'User updated';
      user.status = status.id as unknown as CampaignStatus;

      await queryRunner.manager.save(User, user);
      await queryRunner.commitTransaction();
      return { user, message: 'User updated successfully' };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error('Error updating user:', error.message);
      throw new InternalServerErrorException(
        'An error occurred while updating user. Please check server logs for details.',
        error.message,
      );
    } finally {
      await queryRunner.release();
    }
  }
}
