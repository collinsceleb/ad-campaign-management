import { IsNotEmpty, IsString } from 'class-validator';
import { CampaignStatusEnum } from '../entities/campaign-status.entity';

export class CreateCampaignStatusDto {
  @IsString()
  @IsNotEmpty()
  name: CampaignStatusEnum;
}
