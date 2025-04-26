import { Module } from '@nestjs/common';
import { CampaignLocationService } from './campaign-location.service';
import { CampaignLocationController } from './campaign-location.controller';

@Module({
  controllers: [CampaignLocationController],
  providers: [CampaignLocationService],
})
export class CampaignLocationModule {}
