import { Module } from '@nestjs/common';
import { CampaignLocationService } from './campaign-location.service';
import { CampaignLocationController } from './campaign-location.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CampaignLocation } from './entities/campaign-location.entity';
import { CampaignStatusModule } from '../campaign-status/campaign-status.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CampaignLocation]),
    CampaignStatusModule,
    UsersModule,
  ],
  controllers: [CampaignLocationController],
  providers: [CampaignLocationService],
})
export class CampaignLocationModule {}
