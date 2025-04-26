import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { VerificationsModule } from '../verifications/verifications.module';
import { SharedModule } from '../../common/shared/shared.module';
import { HelperModule } from '../../common/utils/helper/helper.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    VerificationsModule,
    SharedModule,
    HelperModule,
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService, UsersModule, TypeOrmModule],
})
export class UsersModule {}
