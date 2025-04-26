import { Logger, Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { UsersModule } from '../users/users.module';
import { SharedModule } from '../../common/shared/shared.module';

@Module({
  imports: [TypeOrmModule.forFeature([User]), UsersModule, SharedModule],
  controllers: [AuthController],
  providers: [AuthService, Logger],
})
export class AuthModule {}
