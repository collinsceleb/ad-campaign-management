import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { CampaignLocation } from '../../campaign-location/entities/campaign-location.entity';
import { CampaignStatus } from '../../campaign-status/entities/campaign-status.entity';

export class CreateCampaignDto {
  @IsString()
  name: string;

  @IsDateString()
  from: Date;

  @IsDateString()
  to: Date;

  @IsOptional()
  status?: CampaignStatus;

  @IsNumber()
  amount: number;

  @IsArray()
  @ArrayMinSize(1)
  @IsNotEmpty()
  @IsString({ each: true })
  locations: CampaignLocation[];
}
