import { IsNotEmpty, IsString } from 'class-validator';

export class CreateCampaignStatusDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}
