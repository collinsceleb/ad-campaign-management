import { Module } from '@nestjs/common';
import { CampaignService } from './campaign.service';
import { CampaignController } from './campaign.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Campaign } from './entities/campaign.entity';
import { HelperModule } from '../../common/utils/helper/helper.module';
import { CampaignStatusModule } from '../campaign-status/campaign-status.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Campaign]),
    HelperModule,
    CampaignStatusModule,
    UsersModule,
  ],
  controllers: [CampaignController],
  providers: [CampaignService],
})
export class CampaignModule {}
