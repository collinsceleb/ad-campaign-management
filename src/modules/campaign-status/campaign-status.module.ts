import { Module } from '@nestjs/common';
import { CampaignStatusService } from './campaign-status.service';
import { CampaignStatusController } from './campaign-status.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CampaignStatus } from './entities/campaign-status.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CampaignStatus])],
  controllers: [CampaignStatusController],
  providers: [CampaignStatusService],
})
export class CampaignStatusModule {}
