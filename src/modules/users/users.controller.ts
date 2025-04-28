import {
  Controller,
  Post,
  Body,
  Req,
  ClassSerializerInterceptor,
  UseInterceptors,
  SerializeOptions,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { Verification } from '../verifications/entities/verification.entity';
import { User } from './entities/user.entity';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { CreateAuthDto } from '../auth/dto/create-auth.dto';
import { TokenResponse } from '../../common/class/token-response/token-response';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { Request } from 'express';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('register')
  @UseInterceptors(ClassSerializerInterceptor)
  @SerializeOptions({
    type: User,
  })
  async register(
    @Body() createUserDto: CreateUserDto,
  ): Promise<{ user: User; verificationCode: Verification }> {
    return await this.usersService.register(createUserDto);
  }

  @Post('verify-email')
  async verifyEmail(
    @Body() verifyEmailDto: VerifyEmailDto,
  ): Promise<{ user: User; message: string }> {
    return await this.usersService.verifyEmail(verifyEmailDto);
  }

  @Post('forgot-password')
  async forgotPassword(
    @Body() forgotPasswordDto: ForgotPasswordDto,
  ): Promise<{ user: User; verificationCode: Verification }> {
    return await this.usersService.forgotPassword(forgotPasswordDto);
  }

  @Post('reset-password')
  async resetPassword(
    @Body()
    resetPasswordDto: ResetPasswordDto,
  ): Promise<{ user: User; message: string }> {
    return await this.usersService.resetPassword(resetPasswordDto);
  }

  @Post('login')
  async login(
    @Body() createAuthDto: CreateAuthDto,
    @Req() request: Request,

  ): Promise<TokenResponse> {
    return await this.usersService.login(createAuthDto, request);
  }
}
