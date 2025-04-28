import { Module } from '@nestjs/common';
import { CampaignStatusService } from './campaign-status.service';
import { CampaignStatusController } from './campaign-status.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CampaignStatus } from './entities/campaign-status.entity';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [TypeOrmModule.forFeature([CampaignStatus]), UsersModule],
  controllers: [CampaignStatusController],
  providers: [CampaignStatusService],
  exports: [TypeOrmModule],
})
export class CampaignStatusModule {}
