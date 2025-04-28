import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { User } from '../users/entities/user.entity';
import { JwtAuthGuard } from '../../common/guards/jwt-auth/jwt-auth.guard';
import { ChangePasswordDto } from './dto/change-password.dto';
import { Request } from 'express';
import { UpdateUserDto } from '../users/dto/update-user.dto';

@UseGuards(JwtAuthGuard)
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Patch('change-password')
  async changePassword(
    @Body()
    changePasswordDto: ChangePasswordDto,
    @Req() request: Request,
  ): Promise<{ user: User; message: string }> {
    return await this.authService.changePassword(changePasswordDto, request);
  }
  @Post('logout')
  async logout(): Promise<{ message: string }> {
    return await this.authService.logout();
  }
  @Get('get-all')
  async getAllUsers(): Promise<User[]> {
    return await this.authService.getAllUsers();
  }
  @Get('get-user/:id')
  async getUser(@Param('id') id: number): Promise<User> {
    return await this.authService.getUser(id);
  }
  @Delete('delete-user/:id')
  async deleteUser(@Param('id') id: number): Promise<{ message: string }> {
    return await this.authService.deleteUser(id);
  }
  @Get(':id')
  async getUserById(id: number): Promise<User> {
    return await this.authService.getUserById(id);
  }

  @Patch('update-profile/:id')
  async updateProfile(
    @Param('id') id: number,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<{ message: string }> {
    return await this.authService.updateProfile(id, updateUserDto);
  }
}
