import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { CheckUserDto } from './dto/check-user.dto';
import { RecordStatus } from '../../common/entities/base-status.entity';
import { isEmail } from 'class-validator';
import { DataSource, Repository } from 'typeorm';
import { VerificationsService } from '../verifications/verifications.service';
import { ConfigService } from '@nestjs/config';
import { Verification } from '../verifications/entities/verification.entity';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { HelperService } from '../../common/utils/helper/helper.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { CreateAuthDto } from '../auth/dto/create-auth.dto';
import { TokenResponse } from '../../common/class/token-response/token-response';
import e, { Request, Response } from 'express';
import * as crypto from 'node:crypto';
import { JwtPayload } from '../../common/class/jwt-payload/jwt-payload';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class UsersService {
  private readonly JWT_ACCESS_EXPIRATION_TIME =
    this.configService.get<number>('JWT_ACCESS_EXPIRATION_TIME') * 1000;
  private readonly VERIFICATION_RETRIES = this.configService.get<number>(
    'VERIFICATION_RETRIES',
  );
  private readonly REDIS_TTL_IN_MILLISECONDS =
    this.configService.get<number>('REDIS_TTL') * 1000;
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Verification)
    private readonly verificationRepository: Repository<Verification>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly verificationService: VerificationsService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly helperService: HelperService,
    private readonly datasource: DataSource,
  ) {}
  async register(
    createUserDto: CreateUserDto,
  ): Promise<{ user: User; verificationCode: Verification }> {
    const queryRunner = this.datasource.createQueryRunner();
    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();
      const { email, password } = createUserDto;
      if (!isEmail(email)) {
        throw new BadRequestException('Invalid email format');
      }
      await this.checkUserExists({ email });
      const user = queryRunner.manager.create(User, {
        email,
        password: password,
        emailStatus: RecordStatus.UNVERIFIED,
        profileStatus: RecordStatus.UNCOMPLETED,
      });
      await user.hashPassword();
      await queryRunner.manager.save(User, user);
      // await this.usersRepository.save(user);
      const verificationCode =
        await this.verificationService.createVerification(
          user.email,
          'Account Registration',
          (code, expiresAt) =>
            `Thank you for registering. Use ${code} to verify your email. The code expires in ${expiresAt}.`,
        );
      await queryRunner.commitTransaction();
      await this.cacheManager.set(
        `user:${user.email}`,
        this.helperService.sanitizeUserForCache(user),
        this.REDIS_TTL_IN_MILLISECONDS,
      );
      return { user, verificationCode };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error('Error registering user', error);
      throw new InternalServerErrorException(
        'An error occurred while registering the user. Please check server logs for details.',
        error.message,
      );
    } finally {
      await queryRunner.release();
    }
  }
  async verifyEmail(
    verifyEmailDto: VerifyEmailDto,
  ): Promise<{ user: User; message: string }> {
    const queryRunner = this.datasource.createQueryRunner();
    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();
      const { passcode, email } = verifyEmailDto;
      const verification = await this.verificationService.findOne(email);
      const cachedUser: User = await this.cacheManager.get(`user:${email}`);
      let storedUser: User;
      if (cachedUser) {
        const cachedUserData = queryRunner.manager.create(User, cachedUser);
        storedUser = cachedUserData;
      } else {
        storedUser = await queryRunner.manager.findOne(User, {
          where: { email },
        });
        if (storedUser) {
          await this.cacheManager.set(
            `user:${storedUser.email}`,
            this.helperService.sanitizeUserForCache(storedUser),
            this.REDIS_TTL_IN_MILLISECONDS,
          );
        }
        if (!storedUser) {
          throw new NotFoundException('User not found');
        }
      }
      if (storedUser.emailStatus === RecordStatus.VERIFIED) {
        throw new BadRequestException('Email already verified');
      }
      if (!verification) {
        await this.verificationService.createVerification(
          storedUser.email,
          'Account Registration',
          (code, expiresAt) =>
            `Thank you for registering. Use ${code} to verify your email. The code expires in ${expiresAt}.`,
        );
        throw new BadRequestException(
          'No verification found. A new one has been sent. Check your email',
        );
      } else if (verification.passcode !== passcode) {
        verification.tries = Math.max(0, verification.tries + 1);
        const attemptLeft = this.VERIFICATION_RETRIES - verification.tries;
        await this.verificationRepository.save(verification);
        if (verification.tries >= this.VERIFICATION_RETRIES) {
          await this.verificationService.deleteVerification(verification.id);
          await this.verificationService.createVerification(
            storedUser.email,
            'Account Registration',
            (code, expiresAt) =>
              `Thank you for registering. Use ${code} to verify your email. The code expires in ${expiresAt}.`,
          );
          throw new BadRequestException(
            'Maximum verification attempts reached. A new code has been generated and sent. Check your email.',
          );
        }
        throw new BadRequestException(
          `Invalid verification code. Attempt left is ${attemptLeft}.`,
        );
      } else if (verification.expiresAt < new Date()) {
        await this.verificationService.deleteVerification(verification.id);
        await this.verificationService.createVerification(
          storedUser.email,
          'Account Registration',
          (code, expiresAt) =>
            `Thank you for registering. Use ${code} to verify your email. The code expires in ${expiresAt}.`,
        );
        throw new BadRequestException('Verification code has expired');
      }
      storedUser.emailStatus = RecordStatus.VERIFIED;
      storedUser.meta.version += 1;
      await this.usersRepository.save(storedUser);
      await this.cacheManager.set(
        `user:${storedUser.email}`,
        this.helperService.sanitizeUserForCache(storedUser),
        this.REDIS_TTL_IN_MILLISECONDS,
      );
      await this.verificationService.deleteVerification(verification.id);
      await queryRunner.commitTransaction();
      return { user: storedUser, message: 'Email verified successfully' };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error('Error in verifyEmail:', error.message);
      throw new InternalServerErrorException(
        'An error occurred while verifying email. Please check server logs for details.',
        error.message,
      );
    } finally {
      await queryRunner.release();
    }
  }
  async forgotPassword(
    forgotPasswordDto: ForgotPasswordDto,
  ): Promise<{ user: User; verificationCode: Verification }> {
    const queryRunner = this.datasource.createQueryRunner();
    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();
      const { email } = forgotPasswordDto;
      const user = await this.usersRepository.findOne({ where: { email } });
      if (!user) {
        throw new BadRequestException('User not found');
      }
      if (user.meta.status === RecordStatus.DELETED) {
        throw new BadRequestException('Account does not exist');
      }
      const verificationCode =
        await this.verificationService.createVerification(
          user.email,
          'Password Reset',
          (code, expiresAt) =>
            `Use ${code} to reset your password. The code expires in ${expiresAt}.`,
        );
      await queryRunner.commitTransaction();
      return { user, verificationCode };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error('Error in forgetPassword:', error.message);
      throw new InternalServerErrorException(
        'An error occurred while processing the password reset request. Please check server logs for details.',
        error.message,
      );
    } finally {
      await queryRunner.release();
    }
  }

  async resetPassword(
    resetPasswordDto: ResetPasswordDto,
  ): Promise<{ user: User; message: string }> {
    const queryRunner = this.datasource.createQueryRunner();
    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();
      const { email, passcode, newPassword } = resetPasswordDto;
      const user = await this.usersRepository.findOne({ where: { email } });
      if (!user) {
        throw new BadRequestException('User not found');
      }
      const verification = await this.verificationService.findOne(email);
      if (!verification) {
        await this.verificationService.createVerification(
          user.email,
          'Password Reset',
          (code, expiresAt) =>
            `Use ${code} to reset your password. The code expires in ${expiresAt}.`,
        );
        throw new BadRequestException(
          'No password reset code found. A new one has been sent. Check your email',
        );
      } else if (verification.passcode !== passcode) {
        verification.tries = Math.max(0, verification.tries + 1);
        const attemptLeft = this.VERIFICATION_RETRIES - verification.tries;
        await this.verificationRepository.save(verification);
        if (verification.tries >= this.VERIFICATION_RETRIES) {
          await this.verificationService.deleteVerification(verification.id);
          await this.verificationService.createVerification(
            user.email,
            'Password Reset',
            (code, expiresAt) =>
              `Use ${code} to reset your password. The code expires in ${expiresAt}.`,
          );
          throw new BadRequestException(
            'Maximum verification attempts reached. A new code has been generated and sent. Check your email.',
          );
        }
        throw new BadRequestException(
          `Invalid verification code. Attempt left is ${attemptLeft}.`,
        );
      } else if (verification.expiresAt < new Date()) {
        await this.verificationService.deleteVerification(verification.id);
        await this.verificationService.createVerification(
          user.email,
          'Password Reset',
          (code, expiresAt) =>
            `Use ${code} to reset your password. The code expires in ${expiresAt}.`,
        );
        throw new BadRequestException('Verification code has expired');
      }
      user.meta.status = RecordStatus.ACTIVE;
      user.password = newPassword;
      await user.hashPassword();
      await queryRunner.manager.save(user);
      // await this.usersRepository.save(user);
      await this.verificationService.deleteVerification(verification.id);
      await queryRunner.commitTransaction();
      return { user, message: 'Password reset successfully' };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error('Error in resetPassword:', error.message);
      throw new InternalServerErrorException(
        'An error occurred while resetting the password. Please check server logs for details.',
        error.message,
      );
    } finally {
      await queryRunner.release();
    }
  }
  async login(
    createAuthDto: CreateAuthDto,
    request: Request,
    response: Response,
  ): Promise<e.Response<any, Record<string, any>>> {
    const queryRunner = this.datasource.createQueryRunner();
    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();
      const { email, password } = createAuthDto;
      if (typeof email !== 'string') {
        throw new BadRequestException('Email must be a string');
      }
      if (typeof password !== 'string') {
        throw new BadRequestException('Password must be a string');
      }
      if (!isEmail(email)) {
        throw new BadRequestException('Invalid email format');
      }
      const existingUser = await queryRunner.manager.findOne(User, {
        where: { email },
      });
      if (existingUser && existingUser.meta.status === RecordStatus.DELETED) {
        throw new BadRequestException('Account does not exist');
      }
      if (!existingUser) {
        throw new NotFoundException('User not found');
      }
      if (existingUser.emailStatus === RecordStatus.UNVERIFIED) {
        throw new BadRequestException(
          'Email not verified. Please, verify your email.',
        );
      }
      if (existingUser.meta.status === RecordStatus.LOCKED) {
        throw new BadRequestException(
          'Account is locked. Kindly reset your password.',
        );
      }
      const isPasswordValid = await existingUser.comparePassword(password);
      if (!isPasswordValid) {
        throw new BadRequestException('Incorrect password');
      }
      existingUser.lastLogin = new Date();
      await queryRunner.manager.save(existingUser);
      const tokenDetails = await this.generateTokens(existingUser, request);
      response.cookie('access_token', tokenDetails.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: this.configService.get<number>('JWT_ACCESS_EXPIRATION_TIME'),
      });
      await queryRunner.commitTransaction();
      return response.status(200).json({
        accessToken: tokenDetails.accessToken,
        session: request.session,
        sessionId: request.session.id,
        message: 'Logged in successfully',
      });
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error('Error logging in user:', error.message);
      throw new InternalServerErrorException(
        'An error occurred while logging in user. Please check server logs for details.',
        error.message,
      );
    } finally {
      await queryRunner.release();
    }
  }
  async checkUserExists(checkUserDto: CheckUserDto): Promise<boolean> {
    const queryRunner = this.datasource.createQueryRunner();
    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();
      const { email } = checkUserDto;
      const emailCheck = await queryRunner.manager.findOne(User, {
        where: { email },
      });
      if (emailCheck) {
        throw new BadRequestException('Email already exists');
      }
      await queryRunner.commitTransaction();
      return false;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw new BadRequestException(error.message);
    } finally {
      await queryRunner.release();
    }
  }

  async generateTokens(user: User, request: Request): Promise<TokenResponse> {
    const queryRunner = this.datasource.createQueryRunner();
    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();
      const accessJwtId = crypto.randomUUID();
      const payload: JwtPayload = {
        sub: user.id as unknown as User,
        email: user.email,
        jwtId: accessJwtId,
      };
      const accessToken = this.jwtService.sign(payload, {
        expiresIn: `${this.JWT_ACCESS_EXPIRATION_TIME}ms`,
      });
      await queryRunner.commitTransaction();
      return {
        accessToken: accessToken,
        session: request.session,
        sessionId: request.session.id,
      };
    } catch (e) {
      await queryRunner.rollbackTransaction();
      console.error('Error generating tokens:', e);
      throw new InternalServerErrorException(
        'An error occurred while generating tokens. Please check server logs for details.',
        e.message,
      );
    } finally {
      await queryRunner.release();
    }
  }
}
