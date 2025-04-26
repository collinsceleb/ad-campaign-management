import { Module } from '@nestjs/common';
import { CampaignLocationService } from './campaign-location.service';
import { CampaignLocationController } from './campaign-location.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CampaignLocation } from './entities/campaign-location.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CampaignLocation])],
  controllers: [CampaignLocationController],
  providers: [CampaignLocationService],
})
export class CampaignLocationModule {}
