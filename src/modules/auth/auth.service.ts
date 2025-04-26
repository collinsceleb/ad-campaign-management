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
import { Request } from 'express';
import { validate as uuidValidate } from 'uuid';

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
  async logout(): Promise<{ message: string }> {
    const queryRunner = this.datasource.createQueryRunner();
    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();
      await queryRunner.commitTransaction();
      return { message: 'Logged out successfully' };
    } catch (e) {
      await queryRunner.rollbackTransaction();
      console.error('Error logging out user:', e.message);
      throw new InternalServerErrorException(
        'An error occurred while logging out user. Please check server logs for details.',
        e.message,
      );
    } finally {
      await queryRunner.release();
    }
  }
  async getAllUsers(): Promise<User[]> {
    try {
      return await this.authRepository.find();
    } catch (e) {
      console.error('Error finding all users:', e.message);
      throw new InternalServerErrorException(
        'An error occurred while finding all users. Please check server logs for details.',
        e.message,
      );
    }
  }
  async getUser(id: string): Promise<User> {
    try {
      if (typeof id !== 'string') {
        throw new BadRequestException('Id must be a string');
      }
      if (!uuidValidate(id)) {
        throw new BadRequestException('Invalid UUID format');
      }
      const user = await this.authRepository.findOne({ where: { id } });
      if (!user) {
        throw new NotFoundException('User not found');
      }
      return user;
    } catch (e) {
      console.error('Error finding user:', e.message);
      throw new InternalServerErrorException(
        'An error occurred while finding user. Please check server logs for details.',
        e.message,
      );
    }
  }

  // Soft Delete
  async deleteUser(id: string, reason?: string): Promise<{ message: string }> {
    try {
      if (typeof id !== 'string') {
        throw new BadRequestException('Id must be a string');
      }
      if (!uuidValidate(id)) {
        throw new BadRequestException('Invalid UUID format');
      }
      const user = await this.authRepository.findOne({ where: { id } });
      if (!user) {
        throw new NotFoundException('User not found');
      }
      user.meta.status = RecordStatus.DELETED;
      user.meta.updatedBy = user.id;
      user.meta.updatedAt = new Date();
      user.meta.statusChangedBy = user.id;
      user.meta.statusChangedAt = new Date();
      user.meta.statusChangeReason = reason;
      await this.authRepository.save(user);
      return { message: 'User deleted successfully' };
    } catch (e) {
      console.error('Error deleting user:', e.message);
      throw new InternalServerErrorException(
        'An error occurred while deleting user. Please check server logs for details.',
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
  async getUserById(id: string): Promise<User> {
    try {
      // if (!Types.ObjectId.isValid(id)) {
      //   throw new BadRequestException('Invalid user ID');
      // }
      const user = await this.authRepository.findOne({ where: { id } });
      if (!user) {
        throw new NotFoundException('User not found');
      }
      return user;
    } catch (error) {
      if (error.name === 'BSONError') {
        throw new BadRequestException(
          'Invalid user ID provided',
          error.message,
        );
      } else {
        this.logger.error('Error getting user by ID:', error.message);
        throw new InternalServerErrorException(
          'An error occurred while fetching user by ID. Please check server logs for details.',
          error.message,
        );
      }
    }
  }
}
