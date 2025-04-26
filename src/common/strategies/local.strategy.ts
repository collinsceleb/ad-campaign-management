import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../../modules/auth/auth.service';
import { CreateAuthDto } from '../../modules/auth/dto/create-auth.dto';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super();
  }

  async validate(createAuthDto: CreateAuthDto) {
    const user = await this.authService.validateUser(createAuthDto);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return user;
  }
}
