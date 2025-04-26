import { Module } from '@nestjs/common';
import { CampaignStatusService } from './campaign-status.service';
import { CampaignStatusController } from './campaign-status.controller';

@Module({
  controllers: [CampaignStatusController],
  providers: [CampaignStatusService],
})
export class CampaignStatusModule {}
