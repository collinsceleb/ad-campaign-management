import { Module } from '@nestjs/common';
import { VerificationsService } from './verifications.service';
import { VerificationsController } from './verifications.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Verification } from './entities/verification.entity';
import { EmailModule } from '../../common/email/email.module';
import { HelperModule } from '../../common/utils/helper/helper.module';

@Module({
  imports: [TypeOrmModule.forFeature([Verification]), HelperModule],
  controllers: [VerificationsController],
  providers: [VerificationsService],
  exports: [VerificationsService, TypeOrmModule],
})
export class VerificationsModule {}
