import { CampaignStatus } from '../../campaign-status/entities/campaign-status.entity';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCampaignLocationDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  status?: CampaignStatus;
}
