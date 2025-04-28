import {
  ArrayMinSize, ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { CampaignLocation } from '../../campaign-location/entities/campaign-location.entity';
import { CampaignStatus } from '../../campaign-status/entities/campaign-status.entity';
import { Type } from 'class-transformer';

export class CreateCampaignDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNotEmpty()
  @Type(() => Date)
  from: Date;

  @IsNotEmpty()
  @Type(() => Date)
  to: Date;

  @IsNumber()
  @Type(() => Number)
  amount: number;

  @IsOptional()
  status?: CampaignStatus;

  // @IsNumber()
  // amount: number;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @Type(() => String)
  locations: CampaignLocation[];
}
